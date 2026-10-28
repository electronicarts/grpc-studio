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
import SchemaRenderer from '@/features/schemaRenderer/components/core/SchemaRenderer'
import { petSchema } from '@/test/petstore.fixtures'
import { collectExpandablePaths } from '@/features/schemaRenderer/utils/pathAnalysis'

// Create complete Pet schema with ALL field types

describe('SchemaRenderer - Complete Pet Message Integration', () => {
  const schema = petSchema

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
        cost: { value: 85.5 },
        follow_up_required: true,
      },
      {
        id: 'med-002',
        diagnosis: 'Annual checkup',
        treatment: 'Routine examination',
        date: '2024-02-20T14:00:00Z',
        recovery_time: { seconds: 0 },
        cost: { value: 120.0 },
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

      render(<SchemaRenderer schema={schema} data={completePetData} onChange={() => {}} readOnly={true} />)

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
      // Pet.parent is itself a Pet, so expanding everything shows its fields too; the first is the top-level pet's
      const neuteredCheckbox = screen.getAllByRole('checkbox', { name: /is_neutered/i })[0]
      expect(neuteredCheckbox).toBeChecked()

      // Bytes (base64)
      expect(screen.getByDisplayValue('base64encodeddata')).toBeInTheDocument()
    })

    it('renders enum fields', async () => {
      const user = userEvent.setup()

      render(<SchemaRenderer schema={schema} data={completePetData} onChange={() => {}} readOnly={true} />)

      await user.click(screen.getByRole('button', { name: /expand/i }))

      // Enum fields should be rendered (exact UI depends on EnumField implementation)
      // Also present inside the expanded Pet.parent, hence getAll
      expect(screen.getAllByText('species')[0]).toBeInTheDocument()
      expect(screen.getAllByText('status')[0]).toBeInTheDocument()
    })

    it('renders deeply nested messages (3 levels)', async () => {
      const user = userEvent.setup()

      render(<SchemaRenderer schema={schema} data={completePetData} onChange={() => {}} readOnly={true} />)

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

      render(<SchemaRenderer schema={schema} data={completePetData} onChange={() => {}} readOnly={true} />)

      await user.click(screen.getByRole('button', { name: /expand/i }))

      // Nicknames
      expect(screen.getByDisplayValue('Maxy')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Good Boy')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Buddy')).toBeInTheDocument()
    })

    it('renders repeated message fields with all items', async () => {
      const user = userEvent.setup()

      render(<SchemaRenderer schema={schema} data={completePetData} onChange={() => {}} readOnly={true} />)

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

      render(<SchemaRenderer schema={schema} data={completePetData} onChange={() => {}} readOnly={true} />)

      await user.click(screen.getByRole('button', { name: /expand/i }))

      // Tags map
      expect(screen.getByDisplayValue('golden')).toBeInTheDocument()
      expect(screen.getByDisplayValue('friendly')).toBeInTheDocument()
      expect(screen.getByDisplayValue('large')).toBeInTheDocument()
      expect(screen.getByDisplayValue('advanced')).toBeInTheDocument()
    })

    it('renders map with message values', async () => {
      const user = userEvent.setup()

      render(<SchemaRenderer schema={schema} data={completePetData} onChange={() => {}} readOnly={true} />)

      await user.click(screen.getByRole('button', { name: /expand/i }))

      // Records by vet map
      expect(screen.getByDisplayValue('rec-smith-001')).toBeInTheDocument()
      expect(screen.getByDisplayValue('rec-chen-001')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Healthy')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Minor skin allergy')).toBeInTheDocument()
    })

    it('renders wrapper types (StringValue, Int32Value, FloatValue)', async () => {
      const user = userEvent.setup()

      render(<SchemaRenderer schema={schema} data={completePetData} onChange={() => {}} readOnly={true} />)

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
        />,
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

      render(<SchemaRenderer schema={schema} data={minimalData} onChange={() => {}} readOnly={true} />)

      // Should render without crashing
      expect(screen.getByDisplayValue('Minimal Pet')).toBeInTheDocument()
    })
  })
})
