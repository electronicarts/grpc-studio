// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

'use strict';

const crypto = require('node:crypto');

// ---------------------------------------------------------------------------
// In-memory pet store with seed data
// ---------------------------------------------------------------------------

const pets = new Map();

function now() {
  const ts = new Date();
  return { seconds: Math.floor(ts.getTime() / 1000), nanos: 0 };
}

function timestamp(iso) {
  const ts = new Date(iso);
  return { seconds: Math.floor(ts.getTime() / 1000), nanos: 0 };
}

// ---------------------------------------------------------------------------
// Seed data — demonstrates every proto field type
// ---------------------------------------------------------------------------

function seed() {
  const luna = {
    id: 'pet-001',
    name: 'Luna',
    species: 'SPECIES_DOG',
    breed: 'Golden Retriever',
    status: 'STATUS_AVAILABLE',
    owner: {
      id: 'owner-001',
      name: 'Sarah Chen',
      email: 'sarah@example.com',
      phone: '+1-555-0101',
      address: {
        street: '742 Evergreen Terrace',
        city: 'Portland',
        state: 'OR',
        zip_code: '97201',
        country: 'US',
        coordinates: { latitude: 45.5152, longitude: -122.6784 },
      },
      registered_at: timestamp('2024-01-15T10:30:00Z'),
    },
    age_months: 36,
    weight_kg: 29.5,
    is_neutered: true,
    photo_thumbnail: Buffer.from('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64'),
    created_at: timestamp('2024-03-01T08:00:00Z'),
    updated_at: now(),
    description: { value: 'Friendly golden retriever, loves fetch and swimming' },
    microchip_frequency: { value: 134 },
    identification: { microchip_id: 'MC-9876543210' },
    nicknames: ['Lulu', 'Moon'],
    vaccinations: [
      {
        name: 'Rabies',
        administered_at: timestamp('2024-06-15T09:00:00Z'),
        expires_at: timestamp('2025-06-15T09:00:00Z'),
        veterinarian: 'Dr. Martinez',
        batch_number: { value: 'RAB-2024-0815' },
      },
      {
        name: 'DHPP',
        administered_at: timestamp('2024-06-15T09:30:00Z'),
        expires_at: timestamp('2025-06-15T09:30:00Z'),
        veterinarian: 'Dr. Martinez',
        batch_number: { value: 'DHPP-2024-1102' },
      },
    ],
    medical_history: [
      {
        id: 'med-001',
        diagnosis: 'Minor ear infection',
        treatment: 'Antibiotic ear drops, 10 days',
        date: timestamp('2024-09-10T14:00:00Z'),
        recovery_time: { seconds: 864000, nanos: 0 }, // 10 days
        cost: { value: 185.50 },
        follow_up_required: false,
      },
    ],
    tags: {
      color: 'golden',
      temperament: 'gentle',
      trained: 'yes',
      'good-with-kids': 'yes',
    },
    records_by_vet: {
      'Dr. Martinez': {
        id: 'rec-mart-001',
        diagnosis: 'Annual checkup',
        treatment: 'Vaccinations updated, all clear',
        date: timestamp('2024-06-15T09:00:00Z'),
        recovery_time: { seconds: 0, nanos: 0 },
        cost: { value: 250.00 },
        follow_up_required: false,
      },
    },
    metadata: {
      fields: {
        adoption_fee: { numberValue: 350 },
        shelter_wing: { stringValue: 'Building A' },
        special_needs: { stringValue: 'none' },
        favorite_toys: {
          listValue: {
            values: [
              { stringValue: 'tennis ball' },
              { stringValue: 'rope tug' },
            ],
          },
        },
      },
    },
  };

  const mochi = {
    id: 'pet-002',
    name: 'Mochi',
    species: 'SPECIES_CAT',
    breed: 'Scottish Fold',
    status: 'STATUS_PENDING',
    owner: {
      id: 'owner-002',
      name: 'James Park',
      email: 'james@example.com',
      phone: '+1-555-0202',
      address: {
        street: '88 Sunset Blvd',
        city: 'San Francisco',
        state: 'CA',
        zip_code: '94110',
        country: 'US',
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
      },
      registered_at: timestamp('2023-11-20T15:00:00Z'),
    },
    age_months: 18,
    weight_kg: 4.2,
    is_neutered: false,
    photo_thumbnail: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    created_at: timestamp('2024-05-10T12:00:00Z'),
    updated_at: now(),
    description: { value: 'Adorable fold ears, indoor only, a bit shy at first' },
    microchip_frequency: null,
    identification: { collar: { color: 'red', material: 'nylon', has_gps: true } },
    nicknames: ['Mo', 'Mochi Bear', 'Floof'],
    vaccinations: [
      {
        name: 'FVRCP',
        administered_at: timestamp('2024-05-10T10:00:00Z'),
        expires_at: timestamp('2025-05-10T10:00:00Z'),
        veterinarian: 'Dr. Thompson',
        batch_number: { value: 'FVR-2024-0503' },
      },
    ],
    medical_history: [],
    tags: {
      color: 'gray tabby',
      temperament: 'shy',
      indoor_only: 'yes',
    },
    records_by_vet: {},
    metadata: {
      fields: {
        adoption_fee: { numberValue: 275 },
        dietary_restrictions: {
          listValue: {
            values: [
              { stringValue: 'grain-free' },
            ],
          },
        },
      },
    },
  };

  const kiwi = {
    id: 'pet-003',
    name: 'Kiwi',
    species: 'SPECIES_BIRD',
    breed: 'Cockatiel',
    status: 'STATUS_AVAILABLE',
    owner: null,
    age_months: 8,
    weight_kg: 0.09,
    is_neutered: false,
    photo_thumbnail: Buffer.alloc(0),
    created_at: timestamp('2024-08-01T16:00:00Z'),
    updated_at: now(),
    description: { value: 'Whistles popular tunes, hand-raised and very social' },
    microchip_frequency: null,
    identification: { tag_number: 4417 },
    nicknames: ['Kiwi Bird', 'Whistler'],
    vaccinations: [],
    medical_history: [
      {
        id: 'med-003',
        diagnosis: 'Wing feather trim',
        treatment: 'Routine trim, no issues',
        date: timestamp('2024-10-05T11:00:00Z'),
        recovery_time: { seconds: 0, nanos: 0 },
        cost: { value: 35.00 },
        follow_up_required: true,
      },
    ],
    tags: {
      color: 'gray and yellow',
      talks: 'whistles only',
      cage_size: 'large',
    },
    records_by_vet: {},
    metadata: {
      fields: {
        adoption_fee: { numberValue: 150 },
        shelter_wing: { stringValue: 'Aviary' },
      },
    },
  };

  pets.set(luna.id, luna);
  pets.set(mochi.id, mochi);
  pets.set(kiwi.id, kiwi);
}

// ---------------------------------------------------------------------------
// Store operations
// ---------------------------------------------------------------------------

function generateId() {
  return `pet-${crypto.randomUUID().slice(0, 8)}`;
}

function get(id) {
  return pets.get(id) || null;
}

function list() {
  return Array.from(pets.values());
}

function create(pet) {
  const id = pet.id || generateId();
  const record = { ...pet, id, created_at: now(), updated_at: now() };
  pets.set(id, record);
  return record;
}

function update(pet) {
  const existing = pets.get(pet.id);
  if (!existing) return null;
  const record = { ...existing, ...pet, updated_at: now() };
  pets.set(pet.id, record);
  return record;
}

function remove(id) {
  return pets.delete(id);
}

function randomPetId() {
  const ids = Array.from(pets.keys());
  return ids[Math.floor(Math.random() * ids.length)] || null;
}

// Initialize seed data
seed();

module.exports = { get, list, create, update, remove, randomPetId, generateId };
