// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

'use strict';

const grpc = require('@grpc/grpc-js');
const store = require('./store');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now() {
  return { seconds: Math.floor(Date.now() / 1000), nanos: 0 };
}

function notFound(call, callback, id) {
  callback({
    code: grpc.status.NOT_FOUND,
    message: `Pet "${id}" not found`,
  });
}

// ---------------------------------------------------------------------------
// Unary RPCs
// ---------------------------------------------------------------------------

function CreatePet(call, callback) {
  const pet = call.request.pet;
  if (!pet || !pet.name) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: 'pet.name is required',
    });
  }
  callback(null, store.create(pet));
}

function GetPet(call, callback) {
  const pet = store.get(call.request.id);
  if (!pet) return notFound(call, callback, call.request.id);
  callback(null, pet);
}

function UpdatePet(call, callback) {
  const pet = call.request.pet;
  const updateMask = call.request.update_mask;

  if (!pet || !pet.id) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: 'pet.id is required',
    });
  }

  const existing = store.get(pet.id);
  if (!existing) return notFound(call, callback, pet.id);

  // If a field mask is provided, merge only the listed fields (snake_case paths).
  // Otherwise perform a full replacement.
  let target;
  if (updateMask && updateMask.paths && updateMask.paths.length > 0) {
    target = { ...existing };
    for (const path of updateMask.paths) {
      if (Object.prototype.hasOwnProperty.call(pet, path)) {
        target[path] = pet[path];
      }
    }
  } else {
    target = pet;
  }

  const updated = store.update(target);
  if (!updated) return notFound(call, callback, pet.id);
  callback(null, updated);
}

function DeletePet(call, callback) {
  const deleted = store.remove(call.request.id);
  if (!deleted) return notFound(call, callback, call.request.id);
  callback(null, {});
}

function ListPets(call, callback) {
  let results = store.list();
  const { species_filter, status_filter, page_size, page_token } = call.request;

  if (species_filter && species_filter !== 'SPECIES_UNSPECIFIED') {
    results = results.filter((p) => p.species === species_filter);
  }
  if (status_filter && status_filter !== 'STATUS_UNSPECIFIED') {
    results = results.filter((p) => p.status === status_filter);
  }

  const total = results.length;
  const startIndex = page_token ? parseInt(page_token, 10) || 0 : 0;
  const size = page_size > 0 ? page_size : 20;
  const page = results.slice(startIndex, startIndex + size);
  const nextToken = startIndex + size < total ? String(startIndex + size) : '';

  callback(null, {
    pets: page,
    next_page_token: nextToken,
    total_count: total,
  });
}

function SearchPets(call, callback) {
  let results = store.list();
  const { query, species, max_age_months, max_weight_kg } = call.request;

  if (query) {
    const q = query.toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.breed && p.breed.toLowerCase().includes(q)) ||
        (p.description?.value && p.description.value.toLowerCase().includes(q)),
    );
  }
  if (species && species.length > 0) {
    const set = new Set(species);
    results = results.filter((p) => set.has(p.species));
  }
  if (max_age_months?.value != null) {
    results = results.filter((p) => p.age_months <= max_age_months.value);
  }
  if (max_weight_kg?.value != null) {
    results = results.filter((p) => p.weight_kg <= max_weight_kg.value);
  }

  callback(null, { pets: results, next_page_token: '', total_count: results.length });
}

// ---------------------------------------------------------------------------
// Recursive payload — Pet nested inside Pet
//
// Builds a family tree `depth` levels deep using the self-referencing fields
// (parent / offspring / lineage). Useful for exercising renderers against
// cyclic schemas: the descriptor cycle is infinite, but the payload is not.
// ---------------------------------------------------------------------------

const MAX_FAMILY_DEPTH = 10;
const DEFAULT_FAMILY_DEPTH = 3;

// Strip self-referencing fields so a seeded pet can be used as a tree node
// without dragging its own (already-populated) relatives along.
function withoutRelatives(pet) {
  const { parent: _parent, offspring: _offspring, lineage: _lineage, ...rest } = pet;
  return rest;
}

function buildFamily(pet, depth, generation) {
  const node = withoutRelatives(pet);
  if (depth <= 0) return node;

  const ancestor = buildFamily(pet, depth - 1, generation + 1);

  return {
    ...node,
    // Direct self-reference
    parent: {
      ...ancestor,
      id: `${pet.id}-gen${generation + 1}`,
      name: `${pet.name} Sr.${'I'.repeat(generation)}`,
    },
    // Repeated self-reference
    offspring: [
      {
        ...buildFamily(pet, depth - 1, generation + 1),
        id: `${pet.id}-kit${generation + 1}a`,
        name: `${pet.name} Jr.${'I'.repeat(generation)}`,
      },
      {
        ...withoutRelatives(pet),
        id: `${pet.id}-kit${generation + 1}b`,
        name: `${pet.name} the Younger`,
      },
    ],
    // Indirect self-reference — Pet → PetLineage → Pet
    lineage: {
      registry_id: `reg-${pet.id}-${generation}`,
      generation,
      ancestor,
      branches: [
        {
          registry_id: `reg-${pet.id}-${generation}-a`,
          generation: generation + 1,
          branches: [],
        },
      ],
    },
  };
}

function GetPetFamily(call, callback) {
  const pet = store.get(call.request.id);
  if (!pet) return notFound(call, callback, call.request.id);

  const requested = call.request.depth || DEFAULT_FAMILY_DEPTH;
  const depth = Math.min(Math.max(requested, 0), MAX_FAMILY_DEPTH);

  callback(null, buildFamily(pet, depth, 1));
}

// ---------------------------------------------------------------------------
// Server streaming — live pet event feed
// ---------------------------------------------------------------------------

const EVENT_TYPES = ['feeding', 'walk', 'play', 'grooming', 'nap', 'vet_visit', 'training'];

function WatchPets(call) {
  const speciesFilter = new Set(
    (call.request.species_filter || []).filter((s) => s !== 'SPECIES_UNSPECIFIED'),
  );

  const interval = setInterval(() => {
    const petId = store.randomPetId();
    if (!petId) return;

    const pet = store.get(petId);
    if (speciesFilter.size > 0 && !speciesFilter.has(pet.species)) return;

    const event = {
      pet_id: petId,
      event_type: EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)],
      timestamp: now(),
      details: {
        fields: {
          pet_name: { stringValue: pet.name },
          species: { stringValue: pet.species },
          note: { stringValue: `${pet.name} is doing great!` },
        },
      },
    };

    call.write(event);
  }, 2000);

  call.on('cancelled', () => clearInterval(interval));
  call.on('error', () => clearInterval(interval));
}

// ---------------------------------------------------------------------------
// Client streaming — bulk pet creation
// ---------------------------------------------------------------------------

function BulkCreatePets(call, callback) {
  const ids = [];
  const errors = [];

  call.on('data', (request) => {
    try {
      const pet = request.pet;
      if (!pet || !pet.name) {
        errors.push(`Skipped pet: name is required`);
        return;
      }
      const created = store.create(pet);
      ids.push(created.id);
    } catch (err) {
      errors.push(err.message);
    }
  });

  call.on('end', () => {
    callback(null, {
      created_count: ids.length,
      ids,
      errors,
    });
  });
}

// ---------------------------------------------------------------------------
// Bidirectional streaming — health monitoring
// ---------------------------------------------------------------------------

const VITAL_DEFAULTS = {
  heart_rate: () => 70 + Math.random() * 60,
  temperature: () => 37.5 + Math.random() * 2,
  respiratory_rate: () => 15 + Math.random() * 25,
  weight_kg: () => 2 + Math.random() * 40,
  blood_oxygen: () => 94 + Math.random() * 6,
};

function MonitorHealth(call) {
  call.on('data', (request) => {
    const pet = store.get(request.pet_id);
    if (!pet) {
      call.write({
        pet_id: request.pet_id,
        vitals: {},
        checked_at: now(),
        is_healthy: false,
      });
      return;
    }

    const requestedSigns =
      request.vital_signs && request.vital_signs.length > 0
        ? request.vital_signs
        : Object.keys(VITAL_DEFAULTS);

    const vitals = {};
    for (const sign of requestedSigns) {
      const generator = VITAL_DEFAULTS[sign];
      vitals[sign] = generator ? generator() : 0;
    }

    call.write({
      pet_id: request.pet_id,
      vitals,
      checked_at: now(),
      is_healthy: true,
    });
  });

  call.on('end', () => call.end());
  call.on('error', () => {});
}

// ---------------------------------------------------------------------------
// Export handler map
// ---------------------------------------------------------------------------

module.exports = {
  CreatePet,
  GetPet,
  UpdatePet,
  DeletePet,
  ListPets,
  SearchPets,
  GetPetFamily,
  WatchPets,
  BulkCreatePets,
  MonitorHealth,
};
