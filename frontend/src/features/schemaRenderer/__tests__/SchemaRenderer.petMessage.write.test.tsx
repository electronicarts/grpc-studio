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
import SchemaRenderer from '@/features/schemaRenderer/components/core/SchemaRenderer'
import { petSchema } from '@/test/petstore.fixtures'
import {
  structMessageSchema,
  durationMessageSchema,
  fieldMaskMessageSchema,
} from '@/test/protoMessageRenderer.fixtures'
import { latestCall } from '@/test/latestCall'

describe('SchemaRenderer - Pet Message WRITE Path', () => {
  const schema = petSchema

  describe('Creating new Pet (empty form)', () => {
    it('allows filling in all scalar field types', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(<SchemaRenderer schema={schema} data={{}} onChange={onChange} readOnly={false} />)

      // Fill in string scalar (pet.name is the first name field)
      const nameInputs = screen.getAllByPlaceholderText(/Enter name/i)
      await user.type(nameInputs[0], 'Max')

      // Verify onChange was called
      await waitFor(() => {
        expect(onChange).toHaveBeenCalled()
      })

      // Get the latest call
      const latest = latestCall(onChange)
      expect(latest.name).toBe('Max')
      expect('name' in latest).toBe(true)

      // Fill in numeric scalar
      const ageInput = screen.getByPlaceholderText(/Enter age_months/i)
      await user.clear(ageInput)
      await user.type(ageInput, '36')

      await waitFor(() => {
        const latest = latestCall(onChange)
        expect(latest.age_months).toBe(36)
      })

      // Fill in double scalar
      const weightInput = screen.getByPlaceholderText(/Enter weight_kg/i)
      await user.clear(weightInput)
      await user.type(weightInput, '32.5')

      await waitFor(() => {
        const latest = latestCall(onChange)
        expect(latest.weight_kg).toBe(32.5)
      })

      // Set boolean scalar
      await user.selectOptions(screen.getByRole('combobox', { name: 'is_neutered' }), 'true')

      await waitFor(() => {
        const latest = latestCall(onChange)
        expect(latest.is_neutered).toBe(true)
      })

      // Fill in bytes scalar
      const bytesInput = screen.getByPlaceholderText(/base64/i)
      await user.type(bytesInput, 'YWJjMTIz')

      await waitFor(() => {
        const latest = latestCall(onChange)
        expect(latest.photo_thumbnail).toBe('YWJjMTIz')
      })
    })

    it('allows filling in nested message fields', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(<SchemaRenderer schema={schema} data={{}} onChange={onChange} readOnly={false} />)

      // A nested message is ticked to be sent before its fields show
      await user.click(screen.getByRole('checkbox', { name: 'Send owner' }))

      // Fill in owner.name
      const ownerNameInput = screen.getAllByPlaceholderText(/Enter name/i)[1] // Second name input is owner.name
      await user.type(ownerNameInput, 'Alice')

      await waitFor(() => {
        const latest = latestCall(onChange)
        expect(latest.owner?.name).toBe('Alice')
      })

      // Fill in owner.email
      const emailInput = screen.getByPlaceholderText(/Enter email/i)
      await user.type(emailInput, 'alice@example.com')

      await waitFor(() => {
        const latest = latestCall(onChange)
        expect(latest.owner?.email).toBe('alice@example.com')
      })

      // Fill in deeply nested owner.address.city
      await user.click(screen.getByRole('checkbox', { name: 'Send address' }))
      const cityInput = screen.getByPlaceholderText(/Enter city/i)
      await user.type(cityInput, 'San Francisco')

      await waitFor(() => {
        const latest = latestCall(onChange)
        expect(latest.owner?.address?.city).toBe('San Francisco')
      })

      // Fill in owner.address.coordinates.latitude
      await user.click(screen.getByRole('checkbox', { name: 'Send coordinates' }))
      const latInput = screen.getByPlaceholderText(/Enter latitude/i)
      await user.clear(latInput)
      await user.type(latInput, '37.7749')

      await waitFor(() => {
        const latest = latestCall(onChange)
        expect(latest.owner?.address?.coordinates?.latitude).toBe(37.7749)
      })
    })

    it('allows adding items to repeated scalar fields', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(<SchemaRenderer schema={schema} data={{}} onChange={onChange} readOnly={false} />)

      // Tick the list to send it, then add the first nickname
      await user.click(screen.getByRole('checkbox', { name: 'Send nicknames' }))
      const addNicknameButton = screen.getByRole('button', { name: /Add nicknames/i })
      await user.click(addNicknameButton)

      await waitFor(() => {
        const latest = latestCall(onChange)
        expect(Array.isArray(latest.nicknames)).toBe(true)
        expect(latest.nicknames.length).toBe(1)
      })

      // Fill in the nickname
      const nicknameInputs = screen.getAllByPlaceholderText(/Enter nicknames/i)
      await user.type(nicknameInputs[0], 'Maxy')

      await waitFor(() => {
        const latest = latestCall(onChange)
        expect(latest.nicknames[0]).toBe('Maxy')
      })

      // Add second nickname
      await user.click(addNicknameButton)
      await waitFor(() => {
        const latest = latestCall(onChange)
        expect(latest.nicknames.length).toBe(2)
      })
    })

    it('allows adding items to repeated message fields', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(<SchemaRenderer schema={schema} data={{}} onChange={onChange} readOnly={false} />)

      // Tick the list to send it, then add the first vaccination
      await user.click(screen.getByRole('checkbox', { name: 'Send vaccinations' }))
      const addVaccinationButton = screen.getByRole('button', { name: /Add vaccinations/i })
      await user.click(addVaccinationButton)

      await waitFor(() => {
        const latest = latestCall(onChange)
        expect(Array.isArray(latest.vaccinations)).toBe(true)
        expect(latest.vaccinations.length).toBe(1)
      })

      // Fill in vaccination name
      const vaccinationNameInputs = screen.getAllByPlaceholderText(/Enter name/i)
      const vaccinationNameInput = vaccinationNameInputs[vaccinationNameInputs.length - 1]
      await user.type(vaccinationNameInput, 'Rabies')

      await waitFor(() => {
        const latest = latestCall(onChange)
        expect(latest.vaccinations[0]?.name).toBe('Rabies')
      })
    })

    it('renders map fields for editing', () => {
      const onChange = vi.fn()

      const dataWithMap = {
        tags: {
          color: 'golden',
        },
      }

      render(<SchemaRenderer schema={schema} data={dataWithMap} onChange={onChange} readOnly={false} />)

      // Map field should be visible and show the entry
      const tagsSection = screen.getByText('tags')
      expect(tagsSection).toBeInTheDocument()

      // Should show the existing map key
      expect(screen.getByDisplayValue('color')).toBeInTheDocument()

      // Should show the value in an input
      expect(screen.getByDisplayValue('golden')).toBeInTheDocument()
    })
  })

  describe('Clearing/resetting fields (the undefined bug)', () => {
    it('deletes scalar field when unset, not set to undefined', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      const initialData = {
        name: 'Max',
        age_months: 36,
        weight_kg: 32.5,
      }

      render(<SchemaRenderer schema={schema} data={initialData} onChange={onChange} readOnly={false} />)

      // Untick the name field
      await user.click(screen.getByRole('checkbox', { name: 'Send name' }))

      await waitFor(() => {
        const latest = latestCall(onChange)

        // CRITICAL: Key should be DELETED, not set to undefined
        expect('name' in latest).toBe(false)
        expect(latest.name).toBeUndefined()

        // Other fields should remain
        expect(latest.age_months).toBe(36)
        expect(latest.weight_kg).toBe(32.5)
      })

      // Verify no undefined values in the object
      const finalData = latestCall(onChange)
      const values = Object.values(finalData)
      expect(values.includes(undefined)).toBe(false)
    })

    it('deletes nested field when unset, not set to undefined', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      const initialData = {
        name: 'Max',
        owner: {
          name: 'Alice',
          email: 'alice@example.com',
        },
      }

      render(<SchemaRenderer schema={schema} data={initialData} onChange={onChange} readOnly={false} />)

      // Unset owner.email
      await user.click(screen.getByRole('checkbox', { name: 'Send email' }))

      await waitFor(() => {
        const latest = latestCall(onChange)

        // CRITICAL: Key should be DELETED from owner object
        expect('email' in (latest.owner || {})).toBe(false)
        expect(latest.owner?.email).toBeUndefined()

        // Other nested fields should remain
        expect(latest.owner?.name).toBe('Alice')
      })

      // Verify no undefined values anywhere
      const finalData = latestCall(onChange)
      const ownerValues = Object.values(finalData.owner || {})
      expect(ownerValues.includes(undefined)).toBe(false)
    })

    it('deletes deeply nested field when unset', async () => {
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

      render(<SchemaRenderer schema={schema} data={initialData} onChange={onChange} readOnly={false} />)

      // Unset city
      await user.click(screen.getByRole('checkbox', { name: 'Send city' }))

      await waitFor(() => {
        const latest = latestCall(onChange)

        // City should be deleted
        expect('city' in (latest.owner?.address || {})).toBe(false)

        // Other fields intact
        expect(latest.owner?.address?.street).toBe('123 Main St')
        expect(latest.owner?.address?.coordinates?.latitude).toBe(37.7749)
      })
    })

    it('keeps nested message set as {} when its last field is unset', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      const initialData = {
        name: 'Max',
        owner: {
          name: 'Alice',
        },
      }

      render(<SchemaRenderer schema={schema} data={initialData} onChange={onChange} readOnly={false} />)

      // The second "Send name" checkbox is owner.name (the first is the pet's own name)
      await user.click(screen.getAllByRole('checkbox', { name: 'Send name' })[1])

      await waitFor(() => {
        const latest = latestCall(onChange)
        expect(latest.owner).toEqual({})
        expect(latest.name).toBe('Max')
      })
    })

    it('removes a nested message and everything under it when its checkbox is unticked', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      const initialData = {
        name: 'Max',
        owner: {
          name: 'Alice',
          address: {
            city: 'San Francisco',
          },
        },
      }

      render(<SchemaRenderer schema={schema} data={initialData} onChange={onChange} readOnly={false} />)

      await user.click(screen.getByRole('checkbox', { name: 'Send owner' }))

      await waitFor(() => {
        const latest = latestCall(onChange)
        expect('owner' in latest).toBe(false)
        expect(latest.name).toBe('Max')
      })
    })

    it('sends an unset nested message as {} and shows its fields when its checkbox is ticked', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(<SchemaRenderer schema={schema} data={{ name: 'Max' }} onChange={onChange} readOnly={false} />)

      const ownerCheckbox = screen.getByRole('checkbox', { name: 'Send owner' })
      expect(ownerCheckbox).not.toBeChecked()
      expect(screen.queryByPlaceholderText(/Enter email/i)).not.toBeInTheDocument()
      await user.click(ownerCheckbox)

      await waitFor(() => {
        const latest = latestCall(onChange)
        expect(latest.owner).toEqual({})
      })
      expect(screen.getByPlaceholderText(/Enter email/i)).toBeInTheDocument()
    })

    it('sets a bool through its true/false select and unsets it through its checkbox', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(<SchemaRenderer schema={schema} data={{ name: 'Max' }} onChange={onChange} readOnly={false} />)

      const select = screen.getByRole('combobox', { name: 'is_neutered' })
      expect(select).toHaveValue('')

      await user.selectOptions(select, 'false')
      await waitFor(() => {
        expect(latestCall(onChange).is_neutered).toBe(false)
      })

      await user.click(screen.getByRole('checkbox', { name: 'Send is_neutered' }))
      await waitFor(() => {
        expect('is_neutered' in latestCall(onChange)).toBe(false)
      })
    })

    it('handles boolean toggle correctly (false vs deleted)', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      const initialData = {
        name: 'Max',
        is_neutered: true,
      }

      render(<SchemaRenderer schema={schema} data={initialData} onChange={onChange} readOnly={false} />)

      // Set boolean to false
      await user.selectOptions(screen.getByRole('combobox', { name: 'is_neutered' }), 'false')

      await waitFor(() => {
        const latest = latestCall(onChange)

        // Boolean false should be PRESERVED (not deleted)
        expect(latest.is_neutered).toBe(false)
        expect('is_neutered' in latest).toBe(true)
      })
    })

    it('handles numeric zero correctly (zero vs deleted)', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      const initialData = {
        name: 'Max',
        age_months: 5,
      }

      render(<SchemaRenderer schema={schema} data={initialData} onChange={onChange} readOnly={false} />)

      // Set age to zero
      const ageInput = screen.getByDisplayValue('5')
      await user.clear(ageInput)
      await user.type(ageInput, '0')

      await waitFor(() => {
        const latest = latestCall(onChange)

        // Zero should be PRESERVED (not deleted)
        expect(latest.age_months).toBe(0)
        expect('age_months' in latest).toBe(true)
      })
    })

    it('handles empty string correctly (preserved vs deleted)', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      const initialData = {
        name: 'Max',
        id: 'pet-123',
      }

      render(<SchemaRenderer schema={schema} data={initialData} onChange={onChange} readOnly={false} />)

      // Clear id to empty string
      const idInput = screen.getByDisplayValue('pet-123')
      await user.clear(idInput)

      await waitFor(() => {
        const latest = latestCall(onChange)

        // Emptying the input leaves the field out; ticking its checkbox sends an empty string
        expect('id' in latest).toBe(false)
      })
      expect(screen.getByRole('checkbox', { name: 'Send id' })).not.toBeChecked()
    })

    it('removes array items without leaving undefined', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      const initialData = {
        nicknames: ['Maxy', 'Good Boy', 'Buddy'],
      }

      render(<SchemaRenderer schema={schema} data={initialData} onChange={onChange} readOnly={false} />)

      // Find remove buttons (using accessible name or aria-label)
      // The X button should be within the nicknames section
      const removeButtons = screen.getAllByRole('button')
      const xButtons = removeButtons.filter(btn => btn.textContent === '×' || btn.innerHTML.includes('lucide-x'))

      // Three nicknames means three remove buttons must be present; fail loudly
      // if the UI changed rather than silently skipping the assertions.
      expect(xButtons.length).toBeGreaterThanOrEqual(2)

      // Click second X button (for "Good Boy")
      await user.click(xButtons[1])

      await waitFor(() => {
        const latest = latestCall(onChange)

        // Array should have 2 items after removal, no undefined
        expect(Array.isArray(latest.nicknames)).toBe(true)
        expect(latest.nicknames.length).toBe(2)
        expect(latest.nicknames.includes(undefined)).toBe(false)

        // Should be either ['Maxy', 'Buddy'] or ['Good Boy', 'Buddy'] depending on which was removed
        expect(latest.nicknames).toContain('Buddy')
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

      render(<SchemaRenderer schema={schema} data={initialData} onChange={onChange} readOnly={false} />)

      // Find X buttons for map entries
      const allButtons = screen.getAllByRole('button')
      const xButtons = allButtons.filter(btn => btn.innerHTML.includes('lucide-x'))

      // Three map entries → at least one remove button; fail loudly if not.
      expect(xButtons.length).toBeGreaterThan(0)

      await user.click(xButtons[0])

      await waitFor(() => {
        const latest = latestCall(onChange)

        // Map should have 2 entries after removal
        expect(Object.keys(latest.tags || {}).length).toBe(2)

        // No undefined values in map
        const mapValues = Object.values(latest.tags || {})
        expect(mapValues.includes(undefined)).toBe(false)
      })
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

      render(<SchemaRenderer schema={schema} data={existingPet} onChange={onChange} readOnly={false} />)

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
        const latest = latestCall(onChange)

        // All edits should be reflected
        expect(latest.name).toBe('Maximus')
        expect(latest.age_months).toBe(36)
        expect(latest.owner?.email).toBe('alice.johnson@example.com')

        // No undefined values anywhere
        const allValues = JSON.stringify(latest)
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

      render(<SchemaRenderer schema={schema} data={existingPet} onChange={onChange} readOnly={false} />)

      // Remove the whole owner message in one go
      await user.click(screen.getByRole('checkbox', { name: 'Send owner' }))

      await waitFor(() => {
        const latest = latestCall(onChange)

        expect('owner' in latest).toBe(false)
        expect(latest.name).toBe('Max')
      })
    })
  })

  describe('Complex scenarios', () => {
    it('handles rapid edits without undefined values', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(<SchemaRenderer schema={schema} data={{}} onChange={onChange} readOnly={false} />)

      // Type, clear, type again rapidly
      const nameInput = screen.getByPlaceholderText(/Enter name/i)
      await user.type(nameInput, 'Max')
      await user.clear(nameInput)
      await user.type(nameInput, 'Rex')
      await user.clear(nameInput)
      await user.type(nameInput, 'Buddy')

      await waitFor(() => {
        const latest = latestCall(onChange)

        // Final value should be set correctly
        expect(latest.name).toBe('Buddy')

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

      render(<SchemaRenderer schema={schema} data={initialData} onChange={onChange} readOnly={false} />)

      // Edit multiple fields
      await user.clear(screen.getByDisplayValue('Max'))
      await user.type(screen.getByPlaceholderText(/Enter name/i), 'Rex')

      await user.clear(screen.getByDisplayValue('24'))
      await user.type(screen.getByPlaceholderText(/Enter age_months/i), '36')

      await user.clear(screen.getByDisplayValue('30'))
      await user.type(screen.getByPlaceholderText(/Enter weight_kg/i), '32.5')

      await user.selectOptions(screen.getByRole('combobox', { name: 'is_neutered' }), 'false')

      await waitFor(() => {
        const latest = latestCall(onChange)

        // All edits preserved
        expect(latest.name).toBe('Rex')
        expect(latest.age_months).toBe(36)
        expect(latest.weight_kg).toBe(32.5)
        expect(latest.is_neutered).toBe(false)

        // No undefined values
        expect(Object.values(latest).includes(undefined)).toBe(false)
      })
    })
  })
})

// ---------------------------------------------------------------------------
// Wrapper type field write path
// Guards against: WrapperField emitting { value: X } instead of raw scalar X,
// and emitting { value: undefined } (→ {}) when cleared.
// ---------------------------------------------------------------------------

describe('SchemaRenderer - Wrapper type field write path', () => {
  // Pet.description is a google.protobuf.StringValue
  const schema = petSchema

  it('emits raw scalar (not wrapped object) when a wrapper field is filled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<SchemaRenderer schema={schema} data={{}} onChange={onChange} readOnly={false} />)

    const input = screen.getByPlaceholderText(/Enter description/i)
    await user.type(input, 'A friendly dog')

    await waitFor(() => {
      const latest = latestCall(onChange)
      // Must be a raw string, not { value: 'A friendly dog' }
      expect(typeof latest.description).toBe('string')
      expect(latest.description).toBe('A friendly dog')
    })
  })

  it('removes the wrapper field key when cleared (no empty-object residue)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<SchemaRenderer schema={schema} data={{ description: 'hello' }} onChange={onChange} readOnly={false} />)

    const input = screen.getByDisplayValue('hello')
    await user.clear(input)

    await waitFor(() => {
      const latest = latestCall(onChange)
      // Key must be deleted — not {} or { value: undefined }
      expect('description' in latest).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// Struct field write path
// Guards against: clearing a number value in a Struct field causing the kind
// selector to flip from 'number_value' to 'string_value'.
// ---------------------------------------------------------------------------

describe('SchemaRenderer - Struct field write path', () => {
  it('keeps kind as number_value when a Struct number field is cleared', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <SchemaRenderer
        schema={structMessageSchema}
        data={{ metadata: { priority: 42 } }}
        onChange={onChange}
        readOnly={false}
      />,
    )

    // Expand to reveal the struct field

    // The kind selector should show number_value
    const kindSelect = screen.getByTestId('structField-kindSelect')
    expect((kindSelect as HTMLSelectElement).value).toBe('number')

    // Clear the number input — the input label is 'number_value'
    const numberInput = screen.getByDisplayValue('42')
    await user.clear(numberInput)

    await waitFor(() => {
      // Kind must still be number — before fix it flipped to 'string'
      expect((kindSelect as HTMLSelectElement).value).toBe('number')

      // The onChange value must be numeric (0), not a string or undefined
      const latest = latestCall(onChange)
      const structValue = (latest.metadata as Record<string, unknown>).priority
      expect(typeof structValue).toBe('number')
      expect(structValue).toBe(0)
    })
  })

  it('preserves other struct fields when one number field is cleared', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <SchemaRenderer
        schema={structMessageSchema}
        data={{ metadata: { priority: 42, label: 'urgent' } }}
        onChange={onChange}
        readOnly={false}
      />,
    )

    const numberInput = screen.getByDisplayValue('42')
    await user.clear(numberInput)

    await waitFor(() => {
      const latest = latestCall(onChange)
      const metadata = latest.metadata as Record<string, unknown>
      expect(typeof metadata.priority).toBe('number') // still number kind, reset to 0
      expect(metadata.label).toBe('urgent') // other field unaffected
    })
  })
})

// ---------------------------------------------------------------------------
// FieldMaskField write path
//
// Two scenarios are tested:
//   A. No sibling message in parent → free-text path rows
//   B. Sibling message present   → dropdown selector showing derived paths
// ---------------------------------------------------------------------------

describe('SchemaRenderer - FieldMaskField write path', () => {
  // ── Scenario A: fieldMaskMessageSchema has only the mask field, no sibling ──

  it('adds a path via free-text input when no sibling message provides known paths', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SchemaRenderer schema={fieldMaskMessageSchema} data={{}} onChange={onChange} readOnly={false} />)

    await user.click(screen.getByTestId('fieldMask-addButton'))
    await user.keyboard('displayName{Enter}')

    await waitFor(() => {
      const latest = latestCall(onChange)
      expect(latest.mask).toBe('displayName')
      expect(typeof latest.mask).toBe('string')
    })
  })

  it('appends a second path to the comma-separated string', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer schema={fieldMaskMessageSchema} data={{ mask: 'name' }} onChange={onChange} readOnly={false} />,
    )

    await user.click(screen.getByTestId('fieldMask-addButton'))
    await user.keyboard('email{Enter}')

    await waitFor(() => {
      expect(latestCall(onChange).mask).toBe('name,email')
    })
  })

  it('removes a path chip, deleting the key entirely when the list empties', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={fieldMaskMessageSchema}
        data={{ mask: 'displayName' }}
        onChange={onChange}
        readOnly={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Remove path displayName' }))

    await waitFor(() => {
      expect('mask' in latestCall(onChange)).toBe(false)
    })
  })

  it('removes only the clicked chip, preserving siblings', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={fieldMaskMessageSchema}
        data={{ mask: 'name,email,phone' }}
        onChange={onChange}
        readOnly={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Remove path email' }))

    await waitFor(() => {
      expect(latestCall(onChange).mask).toBe('name,phone')
    })
  })

  it('never emits an object — value is always a string or absent', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SchemaRenderer schema={fieldMaskMessageSchema} data={{}} onChange={onChange} readOnly={false} />)

    await user.click(screen.getByTestId('fieldMask-addButton'))
    await user.keyboard('ageMonths{Enter}')

    await waitFor(() => {
      for (const [call] of onChange.mock.calls as [Record<string, unknown>][]) {
        if ('mask' in call) expect(typeof call.mask).toBe('string')
      }
    })
  })
})

// ---------------------------------------------------------------------------
// DurationField write path
// Guards against: Duration rendering as plain seconds/nanos inputs (wrong) and
// emitting { seconds: X } (object) instead of a proto JSON string like "86400s".
// ---------------------------------------------------------------------------

describe('SchemaRenderer - DurationField write path', () => {
  it('emits a Duration string (not an object) when a value is typed', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<SchemaRenderer schema={durationMessageSchema} data={{}} onChange={onChange} readOnly={false} />)

    await user.type(screen.getByPlaceholderText(/86400s/i), '864000s')

    await waitFor(() => {
      const latest = latestCall(onChange)
      expect(typeof latest.dur).toBe('string')
      expect(latest.dur).toBe('864000s')
    })
  })

  it('removes the key when a Duration field is cleared', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <SchemaRenderer schema={durationMessageSchema} data={{ dur: '86400s' }} onChange={onChange} readOnly={false} />,
    )

    await user.clear(screen.getByDisplayValue('86400s'))

    await waitFor(() => {
      expect('dur' in latestCall(onChange)).toBe(false)
    })
  })

  it('emits the new string when an existing Duration value is changed', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <SchemaRenderer schema={durationMessageSchema} data={{ dur: '3600s' }} onChange={onChange} readOnly={false} />,
    )

    const input = screen.getByDisplayValue('3600s')
    await user.clear(input)
    await user.type(input, '7200s')

    await waitFor(() => {
      const latest = latestCall(onChange)
      expect(latest.dur).toBe('7200s')
    })
  })

  it('never emits an object for a Duration field across all onChange calls', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<SchemaRenderer schema={durationMessageSchema} data={{}} onChange={onChange} readOnly={false} />)

    await user.type(screen.getByPlaceholderText(/86400s/i), '3600s')

    await waitFor(() => {
      for (const [call] of onChange.mock.calls as [Record<string, unknown>][]) {
        if ('dur' in call) {
          expect(typeof call.dur).not.toBe('object')
          expect(typeof call.dur).toBe('string')
        }
      }
    })
  })
})
