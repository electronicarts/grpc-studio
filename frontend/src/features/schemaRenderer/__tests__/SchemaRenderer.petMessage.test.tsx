// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Comprehensive integration tests for SchemaRenderer using the complete Pet message.
 * Tests EVERY proto3 feature: scalars, enums, nested messages, oneofs, repeated fields,
 * maps, well-known types (Timestamp, wrappers), and Struct.
 *
 * Based on: example/proto/petstore.proto Pet message
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DescMessage, DescField, DescEnum, DescOneof } from '@bufbuild/protobuf'
import SchemaRenderer from '../components/core/SchemaRenderer'
import { collectExpandablePaths } from '../utils/pathAnalysis'

// ScalarType enum values from @bufbuild/protobuf
const ScalarType = {
  DOUBLE: 1,
  FLOAT: 2,
  INT64: 3,
  UINT64: 4,
  INT32: 5,
  FIXED64: 6,
  FIXED32: 7,
  BOOL: 8,
  STRING: 9,
  BYTES: 12,
  UINT32: 13,
  SFIXED32: 15,
  SFIXED64: 16,
  SINT32: 17,
  SINT64: 18,
}

// Create complete Pet schema with ALL field types
const createPetSchema = (): DescMessage => {
  // Enums
  const SpeciesEnum: DescEnum = {
    typeName: 'petstore.v1.Species',
    values: [
      { name: 'SPECIES_UNSPECIFIED', number: 0 },
      { name: 'SPECIES_DOG', number: 1 },
      { name: 'SPECIES_CAT', number: 2 },
      { name: 'SPECIES_BIRD', number: 3 },
    ],
  } as DescEnum

  const StatusEnum: DescEnum = {
    typeName: 'petstore.v1.Status',
    values: [
      { name: 'STATUS_UNSPECIFIED', number: 0 },
      { name: 'STATUS_AVAILABLE', number: 1 },
      { name: 'STATUS_ADOPTED', number: 2 },
    ],
  } as DescEnum

  // Nested messages (3 levels deep)
  const CoordinatesSchema: DescMessage = {
    typeName: 'petstore.v1.Coordinates',
    fields: [
      { name: 'latitude', fieldKind: 'scalar', scalar: ScalarType.DOUBLE } as DescField,
      { name: 'longitude', fieldKind: 'scalar', scalar: ScalarType.DOUBLE } as DescField,
    ],
    oneofs: [],
    nestedMessages: [],
    nestedEnums: [],
  } as DescMessage

  const AddressSchema: DescMessage = {
    typeName: 'petstore.v1.Address',
    fields: [
      { name: 'street', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'city', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'state', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'zip_code', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'country', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'coordinates', fieldKind: 'message', message: CoordinatesSchema } as DescField,
    ],
    oneofs: [],
    nestedMessages: [],
    nestedEnums: [],
  } as DescMessage

  const TimestampSchema: DescMessage = {
    typeName: 'google.protobuf.Timestamp',
    fields: [
      { name: 'seconds', fieldKind: 'scalar', scalar: ScalarType.INT64 } as DescField,
      { name: 'nanos', fieldKind: 'scalar', scalar: ScalarType.INT32 } as DescField,
    ],
    oneofs: [],
    nestedMessages: [],
    nestedEnums: [],
  } as DescMessage

  const OwnerSchema: DescMessage = {
    typeName: 'petstore.v1.Owner',
    fields: [
      { name: 'id', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'name', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'email', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'phone', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'address', fieldKind: 'message', message: AddressSchema } as DescField,
      { name: 'registered_at', fieldKind: 'message', message: TimestampSchema } as DescField,
    ],
    oneofs: [],
    nestedMessages: [],
    nestedEnums: [],
  } as DescMessage

  // OneOf nested message
  const CollarInfoSchema: DescMessage = {
    typeName: 'petstore.v1.CollarInfo',
    fields: [
      { name: 'color', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'material', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'has_gps', fieldKind: 'scalar', scalar: ScalarType.BOOL } as DescField,
    ],
    oneofs: [],
    nestedMessages: [],
    nestedEnums: [],
  } as DescMessage

  const identificationOneof: DescOneof = {
    name: 'method',
    fields: [
      { name: 'microchip_id', fieldKind: 'scalar', scalar: ScalarType.STRING, oneof: { name: 'method' } } as DescField,
      { name: 'tattoo_code', fieldKind: 'scalar', scalar: ScalarType.STRING, oneof: { name: 'method' } } as DescField,
      { name: 'tag_number', fieldKind: 'scalar', scalar: ScalarType.INT32, oneof: { name: 'method' } } as DescField,
      { name: 'collar', fieldKind: 'message', message: CollarInfoSchema, oneof: { name: 'method' } } as DescField,
    ],
  } as DescOneof

  const IdentificationSchema: DescMessage = {
    typeName: 'petstore.v1.Identification',
    fields: [
      { name: 'microchip_id', fieldKind: 'scalar', scalar: ScalarType.STRING, oneof: identificationOneof } as DescField,
      { name: 'tattoo_code', fieldKind: 'scalar', scalar: ScalarType.STRING, oneof: identificationOneof } as DescField,
      { name: 'tag_number', fieldKind: 'scalar', scalar: ScalarType.INT32, oneof: identificationOneof } as DescField,
      { name: 'collar', fieldKind: 'message', message: CollarInfoSchema, oneof: identificationOneof } as DescField,
    ],
    oneofs: [identificationOneof],
    nestedMessages: [],
    nestedEnums: [],
  } as DescMessage

  // Repeated message types
  const StringValueSchema: DescMessage = {
    typeName: 'google.protobuf.StringValue',
    fields: [
      { name: 'value', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
    ],
    oneofs: [],
    nestedMessages: [],
    nestedEnums: [],
  } as DescMessage

  const VaccinationSchema: DescMessage = {
    typeName: 'petstore.v1.Vaccination',
    fields: [
      { name: 'name', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'administered_at', fieldKind: 'message', message: TimestampSchema } as DescField,
      { name: 'expires_at', fieldKind: 'message', message: TimestampSchema } as DescField,
      { name: 'veterinarian', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'batch_number', fieldKind: 'message', message: StringValueSchema } as DescField,
    ],
    oneofs: [],
    nestedMessages: [],
    nestedEnums: [],
  } as DescMessage

  const DurationSchema: DescMessage = {
    typeName: 'google.protobuf.Duration',
    fields: [
      { name: 'seconds', fieldKind: 'scalar', scalar: ScalarType.INT64 } as DescField,
      { name: 'nanos', fieldKind: 'scalar', scalar: ScalarType.INT32 } as DescField,
    ],
    oneofs: [],
    nestedMessages: [],
    nestedEnums: [],
  } as DescMessage

  const FloatValueSchema: DescMessage = {
    typeName: 'google.protobuf.FloatValue',
    fields: [
      { name: 'value', fieldKind: 'scalar', scalar: ScalarType.FLOAT } as DescField,
    ],
    oneofs: [],
    nestedMessages: [],
    nestedEnums: [],
  } as DescMessage

  const MedicalRecordSchema: DescMessage = {
    typeName: 'petstore.v1.MedicalRecord',
    fields: [
      { name: 'id', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'diagnosis', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'treatment', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'date', fieldKind: 'message', message: TimestampSchema } as DescField,
      { name: 'recovery_time', fieldKind: 'message', message: DurationSchema } as DescField,
      { name: 'cost', fieldKind: 'message', message: FloatValueSchema } as DescField,
      { name: 'follow_up_required', fieldKind: 'scalar', scalar: ScalarType.BOOL } as DescField,
    ],
    oneofs: [],
    nestedMessages: [],
    nestedEnums: [],
  } as DescMessage

  const Int32ValueSchema: DescMessage = {
    typeName: 'google.protobuf.Int32Value',
    fields: [
      { name: 'value', fieldKind: 'scalar', scalar: ScalarType.INT32 } as DescField,
    ],
    oneofs: [],
    nestedMessages: [],
    nestedEnums: [],
  } as DescMessage

  // Struct schema - simplified placeholder (actual Struct is more complex with Value type)
  const StructSchema: DescMessage = {
    typeName: 'google.protobuf.Struct',
    fields: [],
    oneofs: [],
    nestedMessages: [],
    nestedEnums: [],
  } as DescMessage

  // Main Pet message with ALL field types
  return {
    typeName: 'petstore.v1.Pet',
    fields: [
      // Scalars
      { name: 'id', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'name', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'breed', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'age_months', fieldKind: 'scalar', scalar: ScalarType.INT32 } as DescField,
      { name: 'weight_kg', fieldKind: 'scalar', scalar: ScalarType.DOUBLE } as DescField,
      { name: 'is_neutered', fieldKind: 'scalar', scalar: ScalarType.BOOL } as DescField,
      { name: 'photo_thumbnail', fieldKind: 'scalar', scalar: ScalarType.BYTES } as DescField,

      // Enums
      { name: 'species', fieldKind: 'enum', enum: SpeciesEnum } as DescField,
      { name: 'status', fieldKind: 'enum', enum: StatusEnum } as DescField,

      // Nested message (3 levels deep)
      { name: 'owner', fieldKind: 'message', message: OwnerSchema } as DescField,

      // Well-known types
      { name: 'created_at', fieldKind: 'message', message: TimestampSchema } as DescField,
      { name: 'updated_at', fieldKind: 'message', message: TimestampSchema } as DescField,
      { name: 'description', fieldKind: 'message', message: StringValueSchema } as DescField,
      { name: 'microchip_frequency', fieldKind: 'message', message: Int32ValueSchema } as DescField,

      // OneOf
      { name: 'identification', fieldKind: 'message', message: IdentificationSchema } as DescField,

      // Repeated scalar
      { name: 'nicknames', fieldKind: 'list', listKind: 'scalar', scalar: ScalarType.STRING } as DescField,

      // Repeated messages
      { name: 'vaccinations', fieldKind: 'list', listKind: 'message', message: VaccinationSchema } as DescField,
      { name: 'medical_history', fieldKind: 'list', listKind: 'message', message: MedicalRecordSchema } as DescField,

      // Map<string, string>
      { name: 'tags', fieldKind: 'map', mapKind: 'scalar', scalar: ScalarType.STRING } as DescField,

      // Map<string, message>
      { name: 'records_by_vet', fieldKind: 'map', mapKind: 'message', message: MedicalRecordSchema } as DescField,

      // Struct
      { name: 'metadata', fieldKind: 'message', message: StructSchema } as DescField,
    ],
    oneofs: [],
    nestedMessages: [],
    nestedEnums: [],
  } as DescMessage
}

describe('SchemaRenderer - Complete Pet Message Integration', () => {
  const schema = createPetSchema()

  // Comprehensive pet data with EVERY field type populated
  const completePetData = {
    // Scalars
    id: 'pet-12345',
    name: 'Max',
    breed: 'Golden Retriever',
    age_months: 36,
    weight_kg: 32.5,
    is_neutered: true,
    photo_thumbnail: 'base64encodeddata',

    // Enums
    species: 1, // SPECIES_DOG
    status: 2, // STATUS_ADOPTED

    // Nested message (3 levels)
    owner: {
      id: 'owner-001',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      phone: '+1-555-0123',
      address: {
        street: '123 Main Street',
        city: 'San Francisco',
        state: 'CA',
        zip_code: '94102',
        country: 'USA',
        coordinates: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      },
      registered_at: '2024-01-15T10:30:00Z',
    },

    // Well-known types
    created_at: '2023-06-01T08:00:00Z',
    updated_at: '2024-02-20T14:45:00Z',
    description: { value: 'Friendly and energetic dog, great with kids' },
    microchip_frequency: { value: 134200 },

    // OneOf
    identification: {
      microchip_id: 'CHIP-985112345678901',
    },

    // Repeated scalar
    nicknames: ['Maxy', 'Good Boy', 'Buddy'],

    // Repeated messages
    vaccinations: [
      {
        name: 'Rabies',
        administered_at: '2023-06-15T09:00:00Z',
        expires_at: '2026-06-15T09:00:00Z',
        veterinarian: 'Dr. Sarah Smith',
        batch_number: { value: 'RAB-2023-001' },
      },
      {
        name: 'Distemper-Parvo',
        administered_at: '2023-07-01T10:30:00Z',
        expires_at: '2024-07-01T10:30:00Z',
        veterinarian: 'Dr. Sarah Smith',
      },
      {
        name: 'Bordetella',
        administered_at: '2024-01-10T11:00:00Z',
        expires_at: '2025-01-10T11:00:00Z',
        veterinarian: 'Dr. Michael Chen',
      },
    ],

    medical_history: [
      {
        id: 'med-001',
        diagnosis: 'Ear infection',
        treatment: 'Antibiotic drops',
        date: '2023-08-15T13:20:00Z',
        recovery_time: { seconds: 604800 }, // 7 days
        cost: { value: 85.50 },
        follow_up_required: true,
      },
      {
        id: 'med-002',
        diagnosis: 'Annual checkup',
        treatment: 'Routine examination',
        date: '2024-02-20T14:00:00Z',
        recovery_time: { seconds: 0 },
        cost: { value: 120.00 },
        follow_up_required: false,
      },
    ],

    // Map<string, string>
    tags: {
      color: 'golden',
      temperament: 'friendly',
      size: 'large',
      training_level: 'advanced',
    },

    // Map<string, message>
    records_by_vet: {
      'dr-smith': {
        id: 'rec-smith-001',
        diagnosis: 'Healthy',
        treatment: 'Annual vaccines',
        date: '2023-06-15T09:00:00Z',
        follow_up_required: false,
      },
      'dr-chen': {
        id: 'rec-chen-001',
        diagnosis: 'Minor skin allergy',
        treatment: 'Prescribed antihistamine',
        date: '2023-11-08T15:30:00Z',
        follow_up_required: true,
      },
    },

    // Struct
    metadata: {
      adoption_date: '2023-06-01',
      shelter_name: 'Happy Paws Shelter',
      adoption_fee: 250,
      previous_owners: 1,
      special_needs: false,
    },
  }

  describe('Path collection for ALL field types', () => {
    it('collects paths for all expandable fields', () => {
      const paths = collectExpandablePaths(schema, completePetData)

      // Nested message (owner)
      expect(paths.has('owner')).toBe(true)
      expect(paths.has('owner.address')).toBe(true)
      expect(paths.has('owner.address.coordinates')).toBe(true)

      // Well-known types (treated as nested messages)
      expect(paths.has('created_at')).toBe(true)
      expect(paths.has('updated_at')).toBe(true)
      expect(paths.has('description')).toBe(true)
      expect(paths.has('microchip_frequency')).toBe(true)

      // OneOf
      expect(paths.has('identification')).toBe(true)

      // Repeated scalar
      expect(paths.has('nicknames')).toBe(true)

      // Repeated messages with array items
      expect(paths.has('vaccinations')).toBe(true)
      expect(paths.has('vaccinations[0]')).toBe(true)
      expect(paths.has('vaccinations[1]')).toBe(true)
      expect(paths.has('vaccinations[2]')).toBe(true)

      expect(paths.has('medical_history')).toBe(true)
      expect(paths.has('medical_history[0]')).toBe(true)
      expect(paths.has('medical_history[1]')).toBe(true)

      // Maps
      expect(paths.has('tags')).toBe(true)

      expect(paths.has('records_by_vet')).toBe(true)
      expect(paths.has('records_by_vet[dr-smith]')).toBe(true)
      expect(paths.has('records_by_vet[dr-chen]')).toBe(true)

      // Struct
      expect(paths.has('metadata')).toBe(true)
    })

    it('handles nested well-known types in repeated fields', () => {
      const paths = collectExpandablePaths(schema, completePetData)

      // Timestamps in vaccinations
      expect(paths.has('vaccinations[0].administered_at')).toBe(true)
      expect(paths.has('vaccinations[0].expires_at')).toBe(true)

      // Wrapper types in vaccinations
      expect(paths.has('vaccinations[0].batch_number')).toBe(true)

      // Duration and wrapper in medical_history
      expect(paths.has('medical_history[0].date')).toBe(true)
      expect(paths.has('medical_history[0].recovery_time')).toBe(true)
      expect(paths.has('medical_history[0].cost')).toBe(true)
    })

    it('handles map entries with nested messages', () => {
      const paths = collectExpandablePaths(schema, completePetData)

      // Map<string, MedicalRecord> entries
      expect(paths.has('records_by_vet[dr-smith]')).toBe(true)
      expect(paths.has('records_by_vet[dr-chen]')).toBe(true)

      // Nested fields in map values
      expect(paths.has('records_by_vet[dr-smith].date')).toBe(true)
      expect(paths.has('records_by_vet[dr-chen].date')).toBe(true)
    })
  })

  describe('Rendering all field types', () => {
    it('renders scalar fields correctly', async () => {
      const user = userEvent.setup()

      render(
        <SchemaRenderer
          schema={schema}
          data={completePetData}
          onChange={() => {}}
          readOnly={true}
        />
      )

      // Expand all
      await user.click(screen.getByRole('button', { name: /expand/i }))

      // String scalars
      expect(screen.getByDisplayValue('pet-12345')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Max')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Golden Retriever')).toBeInTheDocument()

      // Numeric scalars
      expect(screen.getByDisplayValue('36')).toBeInTheDocument() // age_months
      expect(screen.getByDisplayValue('32.5')).toBeInTheDocument() // weight_kg

      // Boolean scalar
      const neuteredCheckbox = screen.getByRole('checkbox', { name: /is_neutered/i })
      expect(neuteredCheckbox).toBeChecked()

      // Bytes (base64)
      expect(screen.getByDisplayValue('base64encodeddata')).toBeInTheDocument()
    })

    it('renders enum fields', async () => {
      const user = userEvent.setup()

      render(
        <SchemaRenderer
          schema={schema}
          data={completePetData}
          onChange={() => {}}
          readOnly={true}
        />
      )

      await user.click(screen.getByRole('button', { name: /expand/i }))

      // Enum fields should be rendered (exact UI depends on EnumField implementation)
      expect(screen.getByText('species')).toBeInTheDocument()
      expect(screen.getByText('status')).toBeInTheDocument()
    })

    it('renders deeply nested messages (3 levels)', async () => {
      const user = userEvent.setup()

      render(
        <SchemaRenderer
          schema={schema}
          data={completePetData}
          onChange={() => {}}
          readOnly={true}
        />
      )

      await user.click(screen.getByRole('button', { name: /expand/i }))

      // Level 1: owner
      expect(screen.getByDisplayValue('Alice Johnson')).toBeInTheDocument()

      // Level 2: address
      expect(screen.getByDisplayValue('123 Main Street')).toBeInTheDocument()
      expect(screen.getByDisplayValue('San Francisco')).toBeInTheDocument()

      // Level 3: coordinates
      expect(screen.getByDisplayValue('37.7749')).toBeInTheDocument()
      expect(screen.getByDisplayValue('-122.4194')).toBeInTheDocument()
    })

    it('renders repeated scalar fields', async () => {
      const user = userEvent.setup()

      render(
        <SchemaRenderer
          schema={schema}
          data={completePetData}
          onChange={() => {}}
          readOnly={true}
        />
      )

      await user.click(screen.getByRole('button', { name: /expand/i }))

      // Nicknames
      expect(screen.getByDisplayValue('Maxy')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Good Boy')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Buddy')).toBeInTheDocument()
    })

    it('renders repeated message fields with all items', async () => {
      const user = userEvent.setup()

      render(
        <SchemaRenderer
          schema={schema}
          data={completePetData}
          onChange={() => {}}
          readOnly={true}
        />
      )

      await user.click(screen.getByRole('button', { name: /expand/i }))

      // Vaccinations (3 items)
      expect(screen.getByDisplayValue('Rabies')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Distemper-Parvo')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Bordetella')).toBeInTheDocument()

      // Veterinarians
      expect(screen.getAllByDisplayValue('Dr. Sarah Smith').length).toBeGreaterThan(0)
      expect(screen.getByDisplayValue('Dr. Michael Chen')).toBeInTheDocument()

      // Medical history (2 items)
      expect(screen.getByDisplayValue('Ear infection')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Annual checkup')).toBeInTheDocument()
    })

    it('renders map with scalar values', async () => {
      const user = userEvent.setup()

      render(
        <SchemaRenderer
          schema={schema}
          data={completePetData}
          onChange={() => {}}
          readOnly={true}
        />
      )

      await user.click(screen.getByRole('button', { name: /expand/i }))

      // Tags map
      expect(screen.getByDisplayValue('golden')).toBeInTheDocument()
      expect(screen.getByDisplayValue('friendly')).toBeInTheDocument()
      expect(screen.getByDisplayValue('large')).toBeInTheDocument()
      expect(screen.getByDisplayValue('advanced')).toBeInTheDocument()
    })

    it('renders map with message values', async () => {
      const user = userEvent.setup()

      render(
        <SchemaRenderer
          schema={schema}
          data={completePetData}
          onChange={() => {}}
          readOnly={true}
        />
      )

      await user.click(screen.getByRole('button', { name: /expand/i }))

      // Records by vet map
      expect(screen.getByDisplayValue('rec-smith-001')).toBeInTheDocument()
      expect(screen.getByDisplayValue('rec-chen-001')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Healthy')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Minor skin allergy')).toBeInTheDocument()
    })

    it('renders wrapper types (StringValue, Int32Value, FloatValue)', async () => {
      const user = userEvent.setup()

      render(
        <SchemaRenderer
          schema={schema}
          data={completePetData}
          onChange={() => {}}
          readOnly={true}
        />
      )

      await user.click(screen.getByRole('button', { name: /expand/i }))

      // StringValue wrapper
      expect(screen.getByDisplayValue('Friendly and energetic dog, great with kids')).toBeInTheDocument()

      // Int32Value wrapper
      expect(screen.getByDisplayValue('134200')).toBeInTheDocument()

      // FloatValue wrapper (in medical history)
      expect(screen.getByDisplayValue('85.5')).toBeInTheDocument()
      expect(screen.getByDisplayValue('120')).toBeInTheDocument()
    })
  })

  describe('Expand all with complex nesting', () => {
    it('expands all nested structures including arrays and maps', async () => {
      const user = userEvent.setup()

      render(
        <SchemaRenderer
          schema={schema}
          data={completePetData}
          onChange={() => {}}
          readOnly={true}
          defaultCollapsed={true}
        />
      )

      // Top level scalars are always visible (not collapsible)
      expect(screen.getByDisplayValue('Max')).toBeInTheDocument()

      // But nested fields should be collapsed initially
      expect(screen.queryByDisplayValue('Alice Johnson')).not.toBeInTheDocument()

      // Click expand all
      await user.click(screen.getByRole('button', { name: /expand/i }))

      // After expand - nested fields visible

      // Nested owner field
      expect(screen.getByDisplayValue('Alice Johnson')).toBeInTheDocument()

      // Deep nesting (owner.address.coordinates)
      expect(screen.getByDisplayValue('37.7749')).toBeInTheDocument()

      // Array items
      expect(screen.getByDisplayValue('Rabies')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Bordetella')).toBeInTheDocument()

      // Nested fields in array items (vaccination.batch_number wrapper)
      expect(screen.getByDisplayValue('RAB-2023-001')).toBeInTheDocument()

      // Map entries
      expect(screen.getByDisplayValue('golden')).toBeInTheDocument()
      expect(screen.getByDisplayValue('rec-smith-001')).toBeInTheDocument()
    })

    it('verifies all expandable paths are collected', () => {
      const paths = collectExpandablePaths(schema, completePetData)

      // Should have paths for:
      // - 1 owner
      // - 1 owner.address
      // - 1 owner.address.coordinates
      // - 1 owner.registered_at
      // - 4 well-known types (created_at, updated_at, description, microchip_frequency)
      // - 1 identification
      // - 1 nicknames
      // - 1 vaccinations + 3 items = 4
      // - 3 * (administered_at, expires_at, batch_number) = 9 nested in vaccinations
      // - 1 medical_history + 2 items = 3
      // - 2 * (date, recovery_time, cost) = 6 nested in medical_history
      // - 1 tags
      // - 1 records_by_vet + 2 entries = 3
      // - 2 * (date) = 2 nested in records_by_vet
      // - 1 metadata

      // At minimum, we should have all these major categories
      expect(paths.size).toBeGreaterThan(30)

      // Verify key deep paths exist
      expect(paths.has('owner.address.coordinates')).toBe(true)
      expect(paths.has('vaccinations[2]')).toBe(true)
      expect(paths.has('vaccinations[0].batch_number')).toBe(true)
      expect(paths.has('medical_history[1].cost')).toBe(true)
      expect(paths.has('records_by_vet[dr-chen]')).toBe(true)
      expect(paths.has('records_by_vet[dr-smith].date')).toBe(true)
    })
  })

  describe('Edge cases', () => {
    it('handles empty repeated fields', () => {
      const emptyData = {
        id: 'pet-001',
        name: 'Sparse',
        nicknames: [],
        vaccinations: [],
        medical_history: [],
        tags: {},
        records_by_vet: {},
      }

      const paths = collectExpandablePaths(schema, emptyData)

      // Containers exist but no items
      expect(paths.has('nicknames')).toBe(true)
      expect(paths.has('vaccinations')).toBe(true)
      expect(paths.has('medical_history')).toBe(true)
      expect(paths.has('tags')).toBe(true)
      expect(paths.has('records_by_vet')).toBe(true)

      // No array items
      expect(paths.has('vaccinations[0]')).toBe(false)
      expect(paths.has('medical_history[0]')).toBe(false)
    })

    it('handles missing optional fields', () => {
      const minimalData = {
        id: 'pet-minimal',
        name: 'Minimal Pet',
      }

      render(
        <SchemaRenderer
          schema={schema}
          data={minimalData}
          onChange={() => {}}
          readOnly={true}
        />
      )

      // Should render without crashing
      expect(screen.getByDisplayValue('Minimal Pet')).toBeInTheDocument()
    })
  })
})
