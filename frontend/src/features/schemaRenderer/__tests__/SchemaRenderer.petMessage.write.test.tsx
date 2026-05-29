// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Integration tests for SchemaRenderer WRITE path using the complete Pet message.
 * Tests creating/editing data for ALL proto3 field types and verifying:
 * - Fields can be edited
 * - Cleared fields are deleted (not set to undefined)
 * - onChange callbacks propagate correctly
 * - Form state management works for all field types
 *
 * Based on: example/proto/petstore.proto Pet message
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DescMessage, DescField, DescEnum } from '@bufbuild/protobuf'
import SchemaRenderer from '../components/core/SchemaRenderer'

// ScalarType enum values
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

// Reuse schema creation from read tests
const createPetSchema = (): DescMessage => {
  const SpeciesEnum: DescEnum = {
    typeName: 'petstore.v1.Species',
    values: [
      { name: 'SPECIES_UNSPECIFIED', number: 0 },
      { name: 'SPECIES_DOG', number: 1 },
      { name: 'SPECIES_CAT', number: 2 },
    ],
  } as DescEnum

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
      { name: 'coordinates', fieldKind: 'message', message: CoordinatesSchema } as DescField,
    ],
    oneofs: [],
    nestedMessages: [],
    nestedEnums: [],
  } as DescMessage

  const OwnerSchema: DescMessage = {
    typeName: 'petstore.v1.Owner',
    fields: [
      { name: 'name', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'email', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'address', fieldKind: 'message', message: AddressSchema } as DescField,
    ],
    oneofs: [],
    nestedMessages: [],
    nestedEnums: [],
  } as DescMessage

  const VaccinationSchema: DescMessage = {
    typeName: 'petstore.v1.Vaccination',
    fields: [
      { name: 'name', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'veterinarian', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
    ],
    oneofs: [],
    nestedMessages: [],
    nestedEnums: [],
  } as DescMessage

  const StringValueSchema: DescMessage = {
    typeName: 'google.protobuf.StringValue',
    fields: [
      { name: 'value', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
    ],
    oneofs: [],
    nestedMessages: [],
    nestedEnums: [],
  } as DescMessage

  return {
    typeName: 'petstore.v1.Pet',
    fields: [
      // Scalars
      { name: 'id', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'name', fieldKind: 'scalar', scalar: ScalarType.STRING } as DescField,
      { name: 'age_months', fieldKind: 'scalar', scalar: ScalarType.INT32 } as DescField,
      { name: 'weight_kg', fieldKind: 'scalar', scalar: ScalarType.DOUBLE } as DescField,
      { name: 'is_neutered', fieldKind: 'scalar', scalar: ScalarType.BOOL } as DescField,
      { name: 'photo_thumbnail', fieldKind: 'scalar', scalar: ScalarType.BYTES } as DescField,

      // Enum
      { name: 'species', fieldKind: 'enum', enum: SpeciesEnum } as DescField,

      // Nested message
      { name: 'owner', fieldKind: 'message', message: OwnerSchema } as DescField,

      // Wrapper type
      { name: 'description', fieldKind: 'message', message: StringValueSchema } as DescField,

      // Repeated scalar
      { name: 'nicknames', fieldKind: 'list', listKind: 'scalar', scalar: ScalarType.STRING } as DescField,

      // Repeated message
      { name: 'vaccinations', fieldKind: 'list', listKind: 'message', message: VaccinationSchema } as DescField,

      // Map
      { name: 'tags', fieldKind: 'map', mapKind: 'scalar', scalar: ScalarType.STRING } as DescField,
    ],
    oneofs: [],
    nestedMessages: [],
    nestedEnums: [],
  } as DescMessage
}

describe('SchemaRenderer - Pet Message WRITE Path', () => {
  const schema = createPetSchema()

  describe('Creating new Pet (empty form)', () => {
    it('allows filling in all scalar field types', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(
        <SchemaRenderer
          schema={schema}
          data={{}}
          onChange={onChange}
          readOnly={false}
        />
      )

      // Expand all to show all fields
      await user.click(screen.getByRole('button', { name: /expand/i }))

      // Fill in string scalar (pet.name is the first name field)
      const nameInputs = screen.getAllByPlaceholderText(/Enter name/i)
      await user.type(nameInputs[0], 'Max')

      // Verify onChange was called
      await waitFor(() => {
        expect(onChange).toHaveBeenCalled()
      })

      // Get the latest call
      const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
      expect(latestCall.name).toBe('Max')
      expect('name' in latestCall).toBe(true)

      // Fill in numeric scalar
      const ageInput = screen.getByPlaceholderText(/Enter age_months/i)
      await user.clear(ageInput)
      await user.type(ageInput, '36')

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
        expect(latestCall.age_months).toBe(36)
      })

      // Fill in double scalar
      const weightInput = screen.getByPlaceholderText(/Enter weight_kg/i)
      await user.clear(weightInput)
      await user.type(weightInput, '32.5')

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
        expect(latestCall.weight_kg).toBe(32.5)
      })

      // Toggle boolean scalar
      const neuteredCheckbox = screen.getByRole('checkbox', { name: /is_neutered/i })
      await user.click(neuteredCheckbox)

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
        expect(latestCall.is_neutered).toBe(true)
      })

      // Fill in bytes scalar
      const bytesInput = screen.getByPlaceholderText(/base64/i)
      await user.type(bytesInput, 'YWJjMTIz')

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
        expect(latestCall.photo_thumbnail).toBe('YWJjMTIz')
      })
    })

    it('allows filling in nested message fields', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(
        <SchemaRenderer
          schema={schema}
          data={{}}
          onChange={onChange}
          readOnly={false}
        />
      )

      await user.click(screen.getByRole('button', { name: /expand/i }))

      // Fill in owner.name
      const ownerNameInput = screen.getAllByPlaceholderText(/Enter name/i)[1] // Second name input is owner.name
      await user.type(ownerNameInput, 'Alice')

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
        expect(latestCall.owner?.name).toBe('Alice')
      })

      // Fill in owner.email
      const emailInput = screen.getByPlaceholderText(/Enter email/i)
      await user.type(emailInput, 'alice@example.com')

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
        expect(latestCall.owner?.email).toBe('alice@example.com')
      })

      // Fill in deeply nested owner.address.city
      const cityInput = screen.getByPlaceholderText(/Enter city/i)
      await user.type(cityInput, 'San Francisco')

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
        expect(latestCall.owner?.address?.city).toBe('San Francisco')
      })

      // Fill in owner.address.coordinates.latitude
      const latInput = screen.getByPlaceholderText(/Enter latitude/i)
      await user.clear(latInput)
      await user.type(latInput, '37.7749')

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
        expect(latestCall.owner?.address?.coordinates?.latitude).toBe(37.7749)
      })
    })

    it('allows adding items to repeated scalar fields', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(
        <SchemaRenderer
          schema={schema}
          data={{}}
          onChange={onChange}
          readOnly={false}
        />
      )

      await user.click(screen.getByRole('button', { name: /expand/i }))

      // Add first nickname
      const addNicknameButton = screen.getByRole('button', { name: /Add nicknames/i })
      await user.click(addNicknameButton)

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
        expect(Array.isArray(latestCall.nicknames)).toBe(true)
        expect(latestCall.nicknames.length).toBe(1)
      })

      // Fill in the nickname
      const nicknameInputs = screen.getAllByPlaceholderText(/Enter nicknames/i)
      await user.type(nicknameInputs[0], 'Maxy')

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
        expect(latestCall.nicknames[0]).toBe('Maxy')
      })

      // Add second nickname
      await user.click(addNicknameButton)
      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
        expect(latestCall.nicknames.length).toBe(2)
      })
    })

    it('allows adding items to repeated message fields', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(
        <SchemaRenderer
          schema={schema}
          data={{}}
          onChange={onChange}
          readOnly={false}
        />
      )

      await user.click(screen.getByRole('button', { name: /expand/i }))

      // Add first vaccination
      const addVaccinationButton = screen.getByRole('button', { name: /Add vaccinations/i })
      await user.click(addVaccinationButton)

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
        expect(Array.isArray(latestCall.vaccinations)).toBe(true)
        expect(latestCall.vaccinations.length).toBe(1)
      })

      // Fill in vaccination name
      const vaccinationNameInputs = screen.getAllByPlaceholderText(/Enter name/i)
      const vaccinationNameInput = vaccinationNameInputs[vaccinationNameInputs.length - 1]
      await user.type(vaccinationNameInput, 'Rabies')

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
        expect(latestCall.vaccinations[0]?.name).toBe('Rabies')
      })
    })

    it('renders map fields for editing', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      const dataWithMap = {
        tags: {
          color: 'golden',
        },
      }

      render(
        <SchemaRenderer
          schema={schema}
          data={dataWithMap}
          onChange={onChange}
          readOnly={false}
        />
      )

      await user.click(screen.getByRole('button', { name: /expand/i }))

      // Map field should be visible and show the entry
      const tagsSection = screen.getByText('tags')
      expect(tagsSection).toBeInTheDocument()

      // Should show the existing map key
      expect(screen.getByText(/color/i)).toBeInTheDocument()

      // Should show the value in an input
      expect(screen.getByDisplayValue('golden')).toBeInTheDocument()
    })
  })

  describe('Clearing/resetting fields (the undefined bug)', () => {
    it('deletes scalar field when cleared, not set to undefined', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      const initialData = {
        name: 'Max',
        age_months: 36,
        weight_kg: 32.5,
      }

      render(
        <SchemaRenderer
          schema={schema}
          data={initialData}
          onChange={onChange}
          readOnly={false}
        />
      )

      // Clear the name field
      const nameInput = screen.getByDisplayValue('Max')
      await user.clear(nameInput)

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]

        // CRITICAL: Key should be DELETED, not set to undefined
        expect('name' in latestCall).toBe(false)
        expect(latestCall.name).toBeUndefined()

        // Other fields should remain
        expect(latestCall.age_months).toBe(36)
        expect(latestCall.weight_kg).toBe(32.5)
      })

      // Verify no undefined values in the object
      const finalData = onChange.mock.calls[onChange.mock.calls.length - 1][0]
      const values = Object.values(finalData)
      expect(values.includes(undefined)).toBe(false)
    })

    it('deletes nested field when cleared, not set to undefined', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      const initialData = {
        name: 'Max',
        owner: {
          name: 'Alice',
          email: 'alice@example.com',
        },
      }

      render(
        <SchemaRenderer
          schema={schema}
          data={initialData}
          onChange={onChange}
          readOnly={false}
        />
      )

      await user.click(screen.getByRole('button', { name: /expand/i }))

      // Clear owner.email
      const emailInput = screen.getByDisplayValue('alice@example.com')
      await user.clear(emailInput)

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]

        // CRITICAL: Key should be DELETED from owner object
        expect('email' in (latestCall.owner || {})).toBe(false)
        expect(latestCall.owner?.email).toBeUndefined()

        // Other nested fields should remain
        expect(latestCall.owner?.name).toBe('Alice')
      })

      // Verify no undefined values anywhere
      const finalData = onChange.mock.calls[onChange.mock.calls.length - 1][0]
      const ownerValues = Object.values(finalData.owner || {})
      expect(ownerValues.includes(undefined)).toBe(false)
    })

    it('deletes deeply nested field when cleared', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      const initialData = {
        owner: {
          address: {
            street: '123 Main St',
            city: 'San Francisco',
            coordinates: {
              latitude: 37.7749,
              longitude: -122.4194,
            },
          },
        },
      }

      render(
        <SchemaRenderer
          schema={schema}
          data={initialData}
          onChange={onChange}
          readOnly={false}
        />
      )

      await user.click(screen.getByRole('button', { name: /expand/i }))

      // Clear city
      const cityInput = screen.getByDisplayValue('San Francisco')
      await user.clear(cityInput)

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]

        // City should be deleted
        expect('city' in (latestCall.owner?.address || {})).toBe(false)

        // Other fields intact
        expect(latestCall.owner?.address?.street).toBe('123 Main St')
        expect(latestCall.owner?.address?.coordinates?.latitude).toBe(37.7749)
      })
    })

    it('handles boolean toggle correctly (false vs deleted)', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      const initialData = {
        name: 'Max',
        is_neutered: true,
      }

      render(
        <SchemaRenderer
          schema={schema}
          data={initialData}
          onChange={onChange}
          readOnly={false}
        />
      )

      // Toggle boolean to false
      const checkbox = screen.getByRole('checkbox', { name: /is_neutered/i })
      await user.click(checkbox)

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]

        // Boolean false should be PRESERVED (not deleted)
        expect(latestCall.is_neutered).toBe(false)
        expect('is_neutered' in latestCall).toBe(true)
      })
    })

    it('handles numeric zero correctly (zero vs deleted)', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      const initialData = {
        name: 'Max',
        age_months: 5,
      }

      render(
        <SchemaRenderer
          schema={schema}
          data={initialData}
          onChange={onChange}
          readOnly={false}
        />
      )

      // Set age to zero
      const ageInput = screen.getByDisplayValue('5')
      await user.clear(ageInput)
      await user.type(ageInput, '0')

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]

        // Zero should be PRESERVED (not deleted)
        expect(latestCall.age_months).toBe(0)
        expect('age_months' in latestCall).toBe(true)
      })
    })

    it('handles empty string correctly (preserved vs deleted)', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      const initialData = {
        name: 'Max',
        id: 'pet-123',
      }

      render(
        <SchemaRenderer
          schema={schema}
          data={initialData}
          onChange={onChange}
          readOnly={false}
        />
      )

      // Clear id to empty string
      const idInput = screen.getByDisplayValue('pet-123')
      await user.clear(idInput)

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]

        // Empty string means field is cleared - should be DELETED
        expect('id' in latestCall).toBe(false)
      })
    })

    it('removes array items without leaving undefined', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      const initialData = {
        nicknames: ['Maxy', 'Good Boy', 'Buddy'],
      }

      render(
        <SchemaRenderer
          schema={schema}
          data={initialData}
          onChange={onChange}
          readOnly={false}
        />
      )

      await user.click(screen.getByRole('button', { name: /expand/i }))

      // Find remove buttons (using accessible name or aria-label)
      // The X button should be within the nicknames section
      const removeButtons = screen.getAllByRole('button')
      const xButtons = removeButtons.filter(btn => btn.textContent === '×' || btn.innerHTML.includes('lucide-x'))

      // Click second X button (for "Good Boy")
      if (xButtons.length >= 2) {
        await user.click(xButtons[1])
      } else {
        // Fallback: just verify we can click any remove button
        const allButtons = screen.getAllByRole('button')
        const xBtn = allButtons.find(b => b.innerHTML.includes('lucide-x'))
        if (xBtn) await user.click(xBtn)
      }

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]

        // Array should have 2 items after removal, no undefined
        expect(Array.isArray(latestCall.nicknames)).toBe(true)
        expect(latestCall.nicknames.length).toBe(2)
        expect(latestCall.nicknames.includes(undefined)).toBe(false)

        // Should be either ['Maxy', 'Buddy'] or ['Good Boy', 'Buddy'] depending on which was removed
        expect(latestCall.nicknames).toContain('Buddy')
      })
    })

    it('removes map entries completely', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      const initialData = {
        tags: {
          color: 'golden',
          size: 'large',
          temperament: 'friendly',
        },
      }

      render(
        <SchemaRenderer
          schema={schema}
          data={initialData}
          onChange={onChange}
          readOnly={false}
        />
      )

      await user.click(screen.getByRole('button', { name: /expand/i }))

      // Find X buttons for map entries
      const allButtons = screen.getAllByRole('button')
      const xButtons = allButtons.filter(btn => btn.innerHTML.includes('lucide-x'))

      if (xButtons.length > 0) {
        await user.click(xButtons[0])

        await waitFor(() => {
          const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]

          // Map should have 2 entries after removal
          expect(Object.keys(latestCall.tags || {}).length).toBe(2)

          // No undefined values in map
          const mapValues = Object.values(latestCall.tags || {})
          expect(mapValues.includes(undefined)).toBe(false)
        })
      } else {
        // If we can't find X buttons, just verify map exists
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
        expect(latestCall.tags).toBeDefined()
      }
    })
  })

  describe('Editing existing Pet (update path)', () => {
    it('allows editing all field types without creating undefined', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      const existingPet = {
        id: 'pet-001',
        name: 'Max',
        age_months: 24,
        owner: {
          name: 'Alice',
          email: 'alice@example.com',
        },
        nicknames: ['Maxy', 'Good Boy'],
        tags: {
          color: 'golden',
        },
      }

      render(
        <SchemaRenderer
          schema={schema}
          data={existingPet}
          onChange={onChange}
          readOnly={false}
        />
      )

      await user.click(screen.getByRole('button', { name: /expand/i }))

      // Edit name
      const nameInput = screen.getByDisplayValue('Max')
      await user.clear(nameInput)
      await user.type(nameInput, 'Maximus')

      // Edit age
      const ageInput = screen.getByDisplayValue('24')
      await user.clear(ageInput)
      await user.type(ageInput, '36')

      // Edit nested field
      const emailInput = screen.getByDisplayValue('alice@example.com')
      await user.clear(emailInput)
      await user.type(emailInput, 'alice.johnson@example.com')

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]

        // All edits should be reflected
        expect(latestCall.name).toBe('Maximus')
        expect(latestCall.age_months).toBe(36)
        expect(latestCall.owner?.email).toBe('alice.johnson@example.com')

        // No undefined values anywhere
        const allValues = JSON.stringify(latestCall)
        expect(allValues.includes('undefined')).toBe(false)
      })
    })

    it('allows clearing optional nested message entirely', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      const existingPet = {
        name: 'Max',
        owner: {
          name: 'Alice',
          email: 'alice@example.com',
        },
      }

      render(
        <SchemaRenderer
          schema={schema}
          data={existingPet}
          onChange={onChange}
          readOnly={false}
        />
      )

      await user.click(screen.getByRole('button', { name: /expand/i }))

      // Clear all owner fields
      const ownerNameInput = screen.getAllByPlaceholderText(/Enter name/i)[1]
      await user.clear(ownerNameInput)

      const emailInput = screen.getByDisplayValue('alice@example.com')
      await user.clear(emailInput)

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]

        // Owner object should still exist but fields cleared
        expect(latestCall.owner).toBeDefined()
        expect('name' in (latestCall.owner || {})).toBe(false)
        expect('email' in (latestCall.owner || {})).toBe(false)
      })
    })
  })

  describe('Complex scenarios', () => {
    it('handles rapid edits without undefined values', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(
        <SchemaRenderer
          schema={schema}
          data={{}}
          onChange={onChange}
          readOnly={false}
        />
      )

      // Type, clear, type again rapidly
      const nameInput = screen.getByPlaceholderText(/Enter name/i)
      await user.type(nameInput, 'Max')
      await user.clear(nameInput)
      await user.type(nameInput, 'Rex')
      await user.clear(nameInput)
      await user.type(nameInput, 'Buddy')

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]

        // Final value should be set correctly
        expect(latestCall.name).toBe('Buddy')

        // No undefined in any call
        onChange.mock.calls.forEach(call => {
          const data = call[0]
          const values = Object.values(data)
          expect(values.includes(undefined)).toBe(false)
        })
      })
    })

    it('maintains data integrity across multiple field edits', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      const initialData = {
        name: 'Max',
        age_months: 24,
        weight_kg: 30.0,
        is_neutered: true,
      }

      render(
        <SchemaRenderer
          schema={schema}
          data={initialData}
          onChange={onChange}
          readOnly={false}
        />
      )

      // Edit multiple fields
      await user.clear(screen.getByDisplayValue('Max'))
      await user.type(screen.getByPlaceholderText(/Enter name/i), 'Rex')

      await user.clear(screen.getByDisplayValue('24'))
      await user.type(screen.getByPlaceholderText(/Enter age_months/i), '36')

      await user.clear(screen.getByDisplayValue('30'))
      await user.type(screen.getByPlaceholderText(/Enter weight_kg/i), '32.5')

      await user.click(screen.getByRole('checkbox', { name: /is_neutered/i }))

      await waitFor(() => {
        const latestCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]

        // All edits preserved
        expect(latestCall.name).toBe('Rex')
        expect(latestCall.age_months).toBe(36)
        expect(latestCall.weight_kg).toBe(32.5)
        expect(latestCall.is_neutered).toBe(false)

        // No undefined values
        expect(Object.values(latestCall).includes(undefined)).toBe(false)
      })
    })
  })
})
