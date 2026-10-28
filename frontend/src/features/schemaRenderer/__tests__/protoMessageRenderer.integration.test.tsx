// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * ProtoMessageRenderer Integration Tests
 *
 * Tests the actual React component rendering and interactions
 * for all protobuf types and combinations.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ProtoMessageRenderer from '..'
import {
  allScalarsSchema,
  optionalFieldsSchema,
  enumSchema,
  repeatedFieldsSchema,
  mapFieldsSchema,
  oneofBasicSchema,
  multipleOneofSchema,
  wellKnownTypesSchema,
  structMessageSchema,
  fieldMaskMessageSchema,
  repeatedWithOneofSchema,
  mapWithOneofSchema,
  deeplyNestedSchema,
  comprehensiveSchema,
  testData,
} from '@/test/protoMessageRenderer.fixtures'
import { latestCall } from '@/test/latestCall'

// Mock protobuf registry to return our test schemas.
// Signatures match the real cache: getSchema(target, messageType) and
// getCachedSchema(target, messageType); these tests key on the type only.
vi.mock('@/features/schemaLoader/lib/schemaCache', async () => {
  const { schemaCacheModule } = await import('@/test/schemaCacheMock')
  const { schemaCache } = await import('@/test/protoMessageRenderer.fixtures')
  return schemaCacheModule(schemaCache)
})

describe('ProtoMessageRenderer Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering Scalar Types', () => {
    it('should render all scalar field inputs', () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={allScalarsSchema} data={{}} onChange={onChange} />)

      // Check that string input is rendered
      expect(screen.getByPlaceholderText(/enter stringField/i)).toBeInTheDocument()

      // Check that numeric inputs are rendered
      expect(screen.getByPlaceholderText(/enter int32Field/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/enter doubleField/i)).toBeInTheDocument()
    })

    it('should render boolean as a true/false select, ticked to be sent', () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={allScalarsSchema} data={{ boolField: true }} onChange={onChange} />)

      expect(screen.getByRole('combobox', { name: 'boolField' })).toHaveValue('true')
      expect(screen.getByRole('checkbox', { name: 'Send boolField' })).toBeChecked()
    })

    it('should render boolean as a disabled checkbox in read-only mode', () => {
      render(<ProtoMessageRenderer schema={allScalarsSchema} data={{ boolField: true }} onChange={vi.fn()} readOnly />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
      expect(checkbox).toBeDisabled()
    })

    it('should update string value on input', async () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={allScalarsSchema} data={{}} onChange={onChange} />)

      const input = screen.getByPlaceholderText(/enter stringField/i)
      fireEvent.change(input, { target: { value: 'test value' } })

      await waitFor(() => {
        expect(onChange).toHaveBeenCalled()
        const lastCall = latestCall(onChange)
        expect(lastCall.stringField).toBe('test value')
      })
    })

    it('should parse numeric values correctly', async () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={allScalarsSchema} data={{}} onChange={onChange} />)

      const input = screen.getByPlaceholderText(/enter int32Field/i)
      fireEvent.change(input, { target: { value: '42' } })

      await waitFor(() => {
        expect(onChange).toHaveBeenCalled()
        const lastCall = latestCall(onChange)
        expect(lastCall.int32Field).toBe(42)
      })
    })
  })

  describe('Rendering Enum Types', () => {
    it('should render enum as select dropdown', () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={enumSchema} data={{}} onChange={onChange} />)

      const selects = screen.getAllByRole('combobox')
      expect(selects.length).toBeGreaterThan(0)
    })

    it('should show all enum options', () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={enumSchema} data={{}} onChange={onChange} />)

      // Check for enum values in the select
      expect(screen.getByText('STATUS_ACTIVE')).toBeInTheDocument()
      expect(screen.getByText('STATUS_INACTIVE')).toBeInTheDocument()
    })

    it('should show selected enum value', () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={enumSchema} data={{ status: 'STATUS_ACTIVE' }} onChange={onChange} />)

      const select = screen.getAllByRole('combobox')[0]
      expect(select).toHaveValue('STATUS_ACTIVE')
    })
  })

  describe('Rendering Oneof Types', () => {
    it('should render oneof as labeled section', () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={oneofBasicSchema} data={{}} onChange={onChange} />)

      // Should show oneof badge
      expect(screen.getByText('oneof')).toBeInTheDocument()
      expect(screen.getByText('testOneof')).toBeInTheDocument()
    })

    it('should render oneof dropdown with all options', () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={oneofBasicSchema} data={{}} onChange={onChange} />)

      // Find the oneof select
      const select = screen
        .getAllByRole('combobox')
        .find(s => s.textContent?.includes('Select an option') || s.querySelector('option[value=""]'))
      expect(select).toBeInTheDocument()
    })

    it('should show selected oneof option from data', async () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer
          schema={oneofBasicSchema}
          data={{ id: 'test', stringOption: 'my value' }}
          onChange={onChange}
        />,
      )

      await waitFor(() => {
        // The string input should be visible with the value
        const input = screen.queryByDisplayValue('my value')
        expect(input).toBeInTheDocument()
      })
    })

    it('should handle changing oneof selection', async () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={oneofBasicSchema} data={{ id: 'test' }} onChange={onChange} />)

      // Find the oneof select (the one with "Select an option")
      const selects = screen.getAllByRole('combobox')
      const oneofSelect = selects.find(s => {
        const options = s.querySelectorAll('option')
        return Array.from(options).some(o => o.textContent?.includes('stringOption'))
      })

      if (oneofSelect) {
        fireEvent.change(oneofSelect, { target: { value: 'stringOption' } })

        await waitFor(() => {
          expect(onChange).toHaveBeenCalled()
        })
      }
    })
  })

  describe('Field Presence Checkboxes', () => {
    it('should give every field a checkbox reflecting whether it is sent', () => {
      render(
        <ProtoMessageRenderer schema={optionalFieldsSchema} data={{ label: 'hi', plain: 'p' }} onChange={vi.fn()} />,
      )

      expect(screen.getByRole('checkbox', { name: 'Send label' })).toBeChecked()
      expect(screen.getByRole('checkbox', { name: 'Send count' })).not.toBeChecked()
      expect(screen.getByRole('checkbox', { name: 'Send flag' })).not.toBeChecked()
      expect(screen.getByRole('checkbox', { name: 'Send child' })).not.toBeChecked()
      expect(screen.getByRole('checkbox', { name: 'Send plain' })).toBeChecked()
    })

    it('should send a scalar when typed into and leave it out when emptied', async () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={optionalFieldsSchema} data={{}} onChange={onChange} />)

      const input = screen.getByPlaceholderText('Enter count')
      fireEvent.change(input, { target: { value: '5' } })
      await waitFor(() => {
        expect(latestCall(onChange).count).toBe(5)
      })
      expect(screen.getByRole('checkbox', { name: 'Send count' })).toBeChecked()

      fireEvent.change(input, { target: { value: '' } })
      await waitFor(() => {
        expect('count' in latestCall(onChange)).toBe(false)
      })
      expect(screen.getByRole('checkbox', { name: 'Send count' })).not.toBeChecked()
    })

    it('should send a zero value when an empty scalar is ticked, and leave it out when unticked', async () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={optionalFieldsSchema} data={{ label: 'hi' }} onChange={onChange} />)

      fireEvent.click(screen.getByRole('checkbox', { name: 'Send count' }))
      await waitFor(() => {
        expect(latestCall(onChange).count).toBe(0)
      })

      fireEvent.click(screen.getByRole('checkbox', { name: 'Send label' }))
      await waitFor(() => {
        expect('label' in latestCall(onChange)).toBe(false)
        expect(latestCall(onChange).count).toBe(0)
      })
    })

    it('should send a bool once a value is chosen, or false when ticked', async () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={optionalFieldsSchema} data={{}} onChange={onChange} />)

      fireEvent.click(screen.getByRole('checkbox', { name: 'Send flag' }))
      await waitFor(() => {
        expect(latestCall(onChange).flag).toBe(false)
      })

      fireEvent.change(screen.getByRole('combobox', { name: 'flag' }), { target: { value: 'true' } })
      await waitFor(() => {
        expect(latestCall(onChange).flag).toBe(true)
      })
    })

    it('should control whether a message is sent, even once its fields are emptied', async () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={optionalFieldsSchema} data={{}} onChange={onChange} />)

      const childCheckbox = screen.getByRole('checkbox', { name: 'Send child' })
      expect(screen.queryByPlaceholderText('Enter name')).not.toBeInTheDocument()

      // Ticking sends it as an empty message and shows its fields
      fireEvent.click(childCheckbox)
      await waitFor(() => {
        expect(latestCall(onChange).child).toEqual({})
      })

      fireEvent.change(screen.getByPlaceholderText('Enter name'), { target: { value: 'n' } })
      await waitFor(() => {
        expect(latestCall(onChange).child).toEqual({ name: 'n' })
      })

      // Emptying its fields still sends an empty message, until it is unticked
      fireEvent.change(screen.getByPlaceholderText('Enter name'), { target: { value: '' } })
      await waitFor(() => {
        expect(latestCall(onChange).child).toEqual({})
      })
      expect(childCheckbox).toBeChecked()

      fireEvent.click(childCheckbox)
      await waitFor(() => {
        expect('child' in latestCall(onChange)).toBe(false)
      })
      expect(screen.queryByPlaceholderText('Enter name')).not.toBeInTheDocument()
    })

    it('should let a Struct be left out of the request', async () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={structMessageSchema} data={{ metadata: {} }} onChange={onChange} />)

      const checkbox = screen.getByRole('checkbox', { name: 'Send metadata' })
      expect(checkbox).toBeChecked()

      fireEvent.click(checkbox)
      await waitFor(() => {
        expect('metadata' in latestCall(onChange)).toBe(false)
      })
    })

    it('should not give oneof members a checkbox, since the oneof selection controls them', () => {
      render(
        <ProtoMessageRenderer
          schema={oneofBasicSchema}
          data={{ id: 'test', stringOption: 'my value' }}
          onChange={vi.fn()}
        />,
      )

      expect(screen.getByRole('checkbox', { name: 'Send id' })).toBeChecked()
      expect(screen.queryByRole('checkbox', { name: 'Send stringOption' })).not.toBeInTheDocument()
    })

    it('should not render checkboxes in read-only mode', () => {
      render(<ProtoMessageRenderer schema={optionalFieldsSchema} data={{ label: 'hi' }} onChange={vi.fn()} readOnly />)

      expect(screen.queryByRole('checkbox', { name: /^Send / })).not.toBeInTheDocument()
    })
  })

  describe('Rendering Multiple Oneof Groups', () => {
    it('should render multiple oneof sections', () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={multipleOneofSchema} data={{ id: 'test' }} onChange={onChange} />)

      // Should show multiple oneof badges
      const oneofBadges = screen.getAllByText('oneof')
      expect(oneofBadges.length).toBe(2)
    })
  })

  describe('Rendering Repeated Fields', () => {
    it('should render repeated field with item count', async () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer
          schema={repeatedFieldsSchema}
          data={{ repeatedString: ['a', 'b', 'c'] }}
          onChange={onChange}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText(/3 items/i)).toBeInTheDocument()
      })
    })

    it('should expand to show repeated items', async () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer
          schema={repeatedFieldsSchema}
          data={{ repeatedString: ['a', 'b'] }}
          onChange={onChange}
          defaultCollapsed={true}
          readOnly
        />,
      )

      // Click to expand (starts collapsed due to defaultCollapsed)
      const button = screen.getByText('repeatedString')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument()
        expect(screen.getByText('Item 2')).toBeInTheDocument()
      })
    })

    it('should have Add button for repeated fields', async () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer
          schema={repeatedFieldsSchema}
          data={{ repeatedString: [] }}
          onChange={onChange}
          defaultCollapsed={true}
        />,
      )

      // A sent list is open while editing, with no chevron to click
      expect(screen.getByText(/Add repeatedString/i)).toBeInTheDocument()
    })
  })

  describe('Rendering Map Fields', () => {
    it('should render map field with entry count', () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer
          schema={mapFieldsSchema}
          data={{ stringToString: { key1: 'val1', key2: 'val2' } }}
          onChange={onChange}
        />,
      )

      expect(screen.getByText(/2 entries/i)).toBeInTheDocument()
    })

    it('should not normalize invalid array map values', () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={mapFieldsSchema} data={{ stringToString: [] }} onChange={onChange} />)

      expect(onChange).not.toHaveBeenCalled()
      expect(screen.getByText(/0 entries/i)).toBeInTheDocument()
    })

    it('should expand to show map entries', async () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer
          schema={mapFieldsSchema}
          data={{ stringToString: { myKey: 'myValue' } }}
          onChange={onChange}
          defaultCollapsed={true}
          readOnly
        />,
      )

      // Click to expand (starts collapsed due to defaultCollapsed)
      const button = screen.getByText('stringToString')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/Key: myKey/i)).toBeInTheDocument()
      })
    })
  })

  describe('Rendering Timestamp Fields', () => {
    it('should render timestamp fields with MUI date picker', () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={wellKnownTypesSchema} data={{ id: 'test' }} onChange={onChange} />)

      // MUI DateTimePicker should render without errors
      // Check for the timestamp field by label
      expect(screen.queryByText(/createdAt/i)).toBeInTheDocument()
    })

    it('should handle timestamp with ISO string value', () => {
      const onChange = vi.fn()
      const isoString = '2024-05-15T12:00:00.000Z'
      render(
        <ProtoMessageRenderer
          schema={wellKnownTypesSchema}
          data={{ id: 'test', createdAt: isoString }}
          onChange={onChange}
        />,
      )

      // Should render the field with value
      expect(screen.queryByText(/createdAt/i)).toBeInTheDocument()
    })
  })

  describe('Rendering Struct Fields', () => {
    it('should display arbitrary JSON object fields', async () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer
          schema={structMessageSchema}
          data={{ metadata: { dietary: ['grain-free'], priority: 3 } }}
          onChange={onChange}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText('metadata')).toBeInTheDocument()
        expect(screen.getByDisplayValue('dietary')).toBeInTheDocument()
        expect(screen.getByDisplayValue('grain-free')).toBeInTheDocument()
      })
    })
  })

  describe('ReadOnly Mode', () => {
    it('should show map keys, struct field names and mask paths as text, not inputs', () => {
      const { unmount } = render(
        <ProtoMessageRenderer
          schema={mapFieldsSchema}
          data={{ stringToString: { color: 'red' } }}
          onChange={vi.fn()}
          readOnly
        />,
      )
      expect(screen.getByText('Key: color')).toBeInTheDocument()
      expect(screen.queryByDisplayValue('color')).not.toBeInTheDocument()
      // The value sits under its key with no label of its own
      expect(screen.getByDisplayValue('red')).toBeInTheDocument()
      expect(screen.queryByText('stringToString value')).not.toBeInTheDocument()
      unmount()

      const { unmount: unmountStruct } = render(
        <ProtoMessageRenderer
          schema={structMessageSchema}
          data={{ metadata: { priority: 'high' } }}
          onChange={vi.fn()}
          readOnly
        />,
      )
      expect(screen.getByText('priority')).toBeInTheDocument()
      expect(screen.queryByDisplayValue('priority')).not.toBeInTheDocument()
      unmountStruct()

      render(
        <ProtoMessageRenderer
          schema={fieldMaskMessageSchema}
          data={{ mask: 'name,email' }}
          onChange={vi.fn()}
          readOnly
        />,
      )
      expect(screen.getByText('name')).toBeInTheDocument()
      expect(screen.getByText('email')).toBeInTheDocument()
      expect(screen.queryByDisplayValue('name')).not.toBeInTheDocument()
    })

    it('should disable all inputs in readOnly mode', () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer
          schema={allScalarsSchema}
          data={{ stringField: 'test' }}
          onChange={onChange}
          readOnly={true}
        />,
      )

      // Filter out the search toolbar input which is not a form field
      const inputs = screen
        .getAllByRole('textbox')
        .filter(input => !(input as HTMLInputElement).placeholder?.includes('Search'))
      inputs.forEach(input => {
        expect(input).toBeDisabled()
      })
    })

    it('should disable checkbox in readOnly mode', () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer
          schema={allScalarsSchema}
          data={{ boolField: true }}
          onChange={onChange}
          readOnly={true}
        />,
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeDisabled()
    })
  })

  describe('Oneof in Repeated Fields (Key Test Case)', () => {
    it('should render repeated items with oneof inside', async () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer schema={repeatedWithOneofSchema} data={testData.repeatedWithOneof} onChange={onChange} />,
      )

      expect(screen.getByText(/3 items/i)).toBeInTheDocument()
    })

    it('should detect different oneof selections in array items', async () => {
      const onChange = vi.fn()
      const { container } = render(
        <ProtoMessageRenderer schema={repeatedWithOneofSchema} data={testData.repeatedWithOneof} onChange={onChange} />,
      )

      // While editing, every sent section is already open
      await waitFor(() => {
        // Each item has a different oneof selected
        // Item 1: stringValue, Item 2: intValue, Item 3: messageValue
        const oneofBadges = container.querySelectorAll('.bg-brand')
        expect(oneofBadges.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Oneof in Map Values (Key Test Case)', () => {
    it('should render map entries with oneof inside', async () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={mapWithOneofSchema} data={testData.mapWithOneof} onChange={onChange} />)

      expect(screen.getByText(/3 entries/i)).toBeInTheDocument()
    })
  })

  describe('Deeply Nested Structures', () => {
    it('should render deeply nested message', async () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={deeplyNestedSchema} data={testData.deeplyNested} onChange={onChange} />)

      // Should show Level1 name
      expect(screen.getByDisplayValue('Root Level')).toBeInTheDocument()
    })
  })

  describe('Field order', () => {
    it('should show fields and oneof groups in .proto source order', () => {
      // test.Comprehensive declares id, status, the `choice` oneof, then tags
      const { container } = render(
        <ProtoMessageRenderer schema={comprehensiveSchema} data={testData.comprehensive} onChange={vi.fn()} />,
      )
      const text = container.textContent ?? ''
      const position = (label: string) => text.indexOf(label)

      expect(position('status')).toBeLessThan(position('choice'))
      expect(position('choice')).toBeLessThan(position('tags'))
    })
  })

  describe('Comprehensive Schema', () => {
    it('should render comprehensive schema with all field types', async () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={comprehensiveSchema} data={testData.comprehensive} onChange={onChange} />)

      // Should have id field
      expect(screen.getByDisplayValue('comp-1')).toBeInTheDocument()

      // Should have enum select
      const selects = screen.getAllByRole('combobox')
      expect(selects.length).toBeGreaterThan(0)

      // Should have oneof section(s)
      expect(screen.getAllByText('oneof').length).toBeGreaterThan(0)
    })
  })

  describe('No Schema Handling', () => {
    it('should show message when schema is null', () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={null} data={{}} onChange={onChange} />)

      expect(screen.getByText('No schema available')).toBeInTheDocument()
    })
  })

  describe('Data Synchronization', () => {
    it('should update form when data prop changes', async () => {
      const onChange = vi.fn()
      const { rerender } = render(
        <ProtoMessageRenderer schema={allScalarsSchema} data={{ stringField: 'initial' }} onChange={onChange} />,
      )

      expect(screen.getByDisplayValue('initial')).toBeInTheDocument()

      rerender(<ProtoMessageRenderer schema={allScalarsSchema} data={{ stringField: 'updated' }} onChange={onChange} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('updated')).toBeInTheDocument()
      })
    })

    it('should detect oneof from updated data', async () => {
      const onChange = vi.fn()
      const { rerender } = render(
        <ProtoMessageRenderer schema={oneofBasicSchema} data={{ id: 'test' }} onChange={onChange} />,
      )

      rerender(
        <ProtoMessageRenderer
          schema={oneofBasicSchema}
          data={{ id: 'test', stringOption: 'new value' }}
          onChange={onChange}
        />,
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('new value')).toBeInTheDocument()
      })
    })
  })

  describe('Expand/Collapse Controls', () => {
    it('should only offer expand/collapse all in read-only views', () => {
      const { unmount } = render(
        <ProtoMessageRenderer schema={deeplyNestedSchema} data={testData.deeplyNested} onChange={vi.fn()} readOnly />,
      )
      expect(screen.getByTitle('Expand all')).toBeInTheDocument()
      expect(screen.getByTitle('Collapse all')).toBeInTheDocument()
      unmount()

      render(<ProtoMessageRenderer schema={deeplyNestedSchema} data={testData.deeplyNested} onChange={vi.fn()} />)
      expect(screen.queryByTitle('Expand all')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { expanded: false })).not.toBeInTheDocument()
    })

    it('should expand and collapse nested messages in read-only views', async () => {
      render(
        <ProtoMessageRenderer
          schema={deeplyNestedSchema}
          data={testData.deeplyNested}
          onChange={vi.fn()}
          defaultCollapsed={true}
          readOnly
        />,
      )

      expect(screen.queryByDisplayValue('Child Level')).not.toBeInTheDocument()

      fireEvent.click(screen.getByTitle('Expand all'))
      await waitFor(() => {
        expect(screen.getByDisplayValue('Child Level')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTitle('Collapse all'))
      await waitFor(() => {
        expect(screen.queryByDisplayValue('Child Level')).not.toBeInTheDocument()
      })
      expect(screen.getByDisplayValue('Root Level')).toBeInTheDocument()
    })

    it('should show a sent message while editing and hide it once unticked', async () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={deeplyNestedSchema} data={testData.deeplyNested} onChange={onChange} />)

      expect(screen.getByDisplayValue('Child Level')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('checkbox', { name: 'Send child' }))
      await waitFor(() => {
        expect('child' in latestCall(onChange)).toBe(false)
      })
      expect(screen.queryByPlaceholderText(/enter name/i)).toBeInTheDocument() // root level name only
      expect(screen.getAllByPlaceholderText(/enter name/i)).toHaveLength(1)
    })

    it('should keep unsent lists and maps closed until ticked while editing', async () => {
      const onChange = vi.fn()
      render(<ProtoMessageRenderer schema={mapFieldsSchema} data={{}} onChange={onChange} />)

      expect(screen.queryByText(/add entry/i)).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('checkbox', { name: 'Send stringToString' }))
      await waitFor(() => {
        expect(latestCall(onChange).stringToString).toEqual({})
      })
      expect(screen.getByText(/add entry/i)).toBeInTheDocument()
    })
  })
})
