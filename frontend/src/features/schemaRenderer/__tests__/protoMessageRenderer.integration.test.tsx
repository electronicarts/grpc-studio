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
  enumSchema,
  repeatedFieldsSchema,
  mapFieldsSchema,
  oneofBasicSchema,
  multipleOneofSchema,
  wellKnownTypesSchema,
  structMessageSchema,
  repeatedWithOneofSchema,
  mapWithOneofSchema,
  deeplyNestedSchema,
  comprehensiveSchema,
  testData,
  schemaCache as testSchemaMap,
} from './protoMessageRenderer.fixtures'

// Mock protobuf registry to return our test schemas
vi.mock('../../schemaLoader/lib/schemaCache', () => ({
  schemaCache: {
    getSchema: vi.fn((type: string) => {
      return Promise.resolve(testSchemaMap.get(type) || null)
    }),
    getCacheSize: vi.fn(() => testSchemaMap.size),
    getSchemaMap: vi.fn(() => new Map(testSchemaMap)),
    getCachedSchema: vi.fn((type: string) => testSchemaMap.get(type) ?? null),
    subscribe: vi.fn(() => () => {}),
    get allLoaded() { return true },
  },
  needsSchemaLoad: vi.fn(() => false),
}))

describe('ProtoMessageRenderer Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering Scalar Types', () => {
    it('should render all scalar field inputs', () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer 
          schema={allScalarsSchema} 
          data={{}} 
          onChange={onChange} 
        />
      )

      // Check that string input is rendered
      expect(screen.getByPlaceholderText(/enter stringField/i)).toBeInTheDocument()
      
      // Check that numeric inputs are rendered
      expect(screen.getByPlaceholderText(/enter int32Field/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/enter doubleField/i)).toBeInTheDocument()
    })

    it('should render boolean as checkbox', () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer 
          schema={allScalarsSchema} 
          data={{ boolField: true }} 
          onChange={onChange} 
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeInTheDocument()
      expect(checkbox).toBeChecked()
    })

    it('should update string value on input', async () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer 
          schema={allScalarsSchema} 
          data={{}} 
          onChange={onChange} 
        />
      )

      const input = screen.getByPlaceholderText(/enter stringField/i)
      fireEvent.change(input, { target: { value: 'test value' } })

      await waitFor(() => {
        expect(onChange).toHaveBeenCalled()
        const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
        expect(lastCall.stringField).toBe('test value')
      })
    })

    it('should parse numeric values correctly', async () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer 
          schema={allScalarsSchema} 
          data={{}} 
          onChange={onChange} 
        />
      )

      const input = screen.getByPlaceholderText(/enter int32Field/i)
      fireEvent.change(input, { target: { value: '42' } })

      await waitFor(() => {
        expect(onChange).toHaveBeenCalled()
        const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
        expect(lastCall.int32Field).toBe(42)
      })
    })
  })

  describe('Rendering Enum Types', () => {
    it('should render enum as select dropdown', () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer 
          schema={enumSchema} 
          data={{}} 
          onChange={onChange} 
        />
      )

      const selects = screen.getAllByRole('combobox')
      expect(selects.length).toBeGreaterThan(0)
    })

    it('should show all enum options', () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer 
          schema={enumSchema} 
          data={{}} 
          onChange={onChange} 
        />
      )

      // Check for enum values in the select
      expect(screen.getByText('STATUS_ACTIVE')).toBeInTheDocument()
      expect(screen.getByText('STATUS_INACTIVE')).toBeInTheDocument()
    })

    it('should show selected enum value', () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer 
          schema={enumSchema} 
          data={{ status: 'STATUS_ACTIVE' }} 
          onChange={onChange} 
        />
      )

      const select = screen.getAllByRole('combobox')[0]
      expect(select).toHaveValue('STATUS_ACTIVE')
    })
  })

  describe('Rendering Oneof Types', () => {
    it('should render oneof as labeled section', () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer 
          schema={oneofBasicSchema} 
          data={{}} 
          onChange={onChange} 
        />
      )

      // Should show oneof badge
      expect(screen.getByText('oneof')).toBeInTheDocument()
      expect(screen.getByText('testOneof')).toBeInTheDocument()
    })

    it('should render oneof dropdown with all options', () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer 
          schema={oneofBasicSchema} 
          data={{}} 
          onChange={onChange} 
        />
      )

      // Find the oneof select
      const select = screen.getAllByRole('combobox').find(s => 
        s.textContent?.includes('Select an option') || 
        s.querySelector('option[value=""]')
      )
      expect(select).toBeInTheDocument()
    })

    it('should show selected oneof option from data', async () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer 
          schema={oneofBasicSchema} 
          data={{ id: 'test', stringOption: 'my value' }} 
          onChange={onChange} 
        />
      )

      await waitFor(() => {
        // The string input should be visible with the value
        const input = screen.queryByDisplayValue('my value')
        expect(input).toBeInTheDocument()
      })
    })

    it('should handle changing oneof selection', async () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer 
          schema={oneofBasicSchema} 
          data={{ id: 'test' }} 
          onChange={onChange} 
        />
      )

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

  describe('Rendering Multiple Oneof Groups', () => {
    it('should render multiple oneof sections', () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer 
          schema={multipleOneofSchema} 
          data={{ id: 'test' }} 
          onChange={onChange} 
        />
      )

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
        />
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
        />
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
        />
      )

      // Click to expand (starts collapsed due to defaultCollapsed)
      const button = screen.getByText('repeatedString')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/Add repeatedString/i)).toBeInTheDocument()
      })
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
        />
      )

      expect(screen.getByText(/Map \(2\)/i)).toBeInTheDocument()
    })

    it('should not normalize invalid array map values', () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer
          schema={mapFieldsSchema}
          data={{ stringToString: [] }}
          onChange={onChange}
        />
      )

      expect(onChange).not.toHaveBeenCalled()
      expect(screen.getByText(/Map \(0\)/i)).toBeInTheDocument()
    })

    it('should expand to show map entries', async () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer 
          schema={mapFieldsSchema} 
          data={{ stringToString: { myKey: 'myValue' } }} 
          onChange={onChange}
          defaultCollapsed={true}
        />
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
      render(
        <ProtoMessageRenderer
          schema={wellKnownTypesSchema}
          data={{ id: 'test' }}
          onChange={onChange}
        />
      )

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
        />
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
        />
      )

      await waitFor(() => {
        expect(screen.getByText('metadata')).toBeInTheDocument()
        expect(screen.getByText(/dietary/i)).toBeInTheDocument()
        expect(screen.getByDisplayValue('grain-free')).toBeInTheDocument()
      })
    })
  })

  describe('ReadOnly Mode', () => {
    it('should disable all inputs in readOnly mode', () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer 
          schema={allScalarsSchema} 
          data={{ stringField: 'test' }} 
          onChange={onChange}
          readOnly={true}
        />
      )

      // Filter out the search toolbar input which is not a form field
      const inputs = screen.getAllByRole('textbox')
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
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeDisabled()
    })
  })

  describe('Oneof in Repeated Fields (Key Test Case)', () => {
    it('should render repeated items with oneof inside', async () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer 
          schema={repeatedWithOneofSchema} 
          data={testData.repeatedWithOneof} 
          onChange={onChange} 
        />
      )

      // Expand the items array
      const itemsButton = screen.getByText('items')
      fireEvent.click(itemsButton)

      await waitFor(() => {
        // Should show 3 items
        expect(screen.getByText(/3 items/i)).toBeInTheDocument()
      })
    })

    it('should detect different oneof selections in array items', async () => {
      const onChange = vi.fn()
      const { container } = render(
        <ProtoMessageRenderer 
          schema={repeatedWithOneofSchema} 
          data={testData.repeatedWithOneof} 
          onChange={onChange} 
        />
      )

      // Use Expand All to ensure all nested sections are visible
      const expandButton = screen.getByTitle('Expand all')
      fireEvent.click(expandButton)

      await waitFor(() => {
        // Each item has a different oneof selected
        // Item 1: stringValue, Item 2: intValue, Item 3: messageValue
        const oneofBadges = container.querySelectorAll('.bg-purple-500')
        expect(oneofBadges.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Oneof in Map Values (Key Test Case)', () => {
    it('should render map entries with oneof inside', async () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer 
          schema={mapWithOneofSchema} 
          data={testData.mapWithOneof} 
          onChange={onChange} 
        />
      )

      // Expand the entries map
      const entriesButton = screen.getByText('entries')
      fireEvent.click(entriesButton)

      await waitFor(() => {
        // Should show 3 entries
        expect(screen.getByText(/Map \(3\)/i)).toBeInTheDocument()
      })
    })
  })

  describe('Deeply Nested Structures', () => {
    it('should render deeply nested message', async () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer 
          schema={deeplyNestedSchema} 
          data={testData.deeplyNested} 
          onChange={onChange} 
        />
      )

      // Should show Level1 name
      expect(screen.getByDisplayValue('Root Level')).toBeInTheDocument()
    })
  })

  describe('Comprehensive Schema', () => {
    it('should render comprehensive schema with all field types', async () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer 
          schema={comprehensiveSchema} 
          data={testData.comprehensive} 
          onChange={onChange} 
        />
      )

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
      render(
        <ProtoMessageRenderer 
          schema={null} 
          data={{}} 
          onChange={onChange} 
        />
      )

      expect(screen.getByText('No schema available')).toBeInTheDocument()
    })
  })

  describe('Data Synchronization', () => {
    it('should update form when data prop changes', async () => {
      const onChange = vi.fn()
      const { rerender } = render(
        <ProtoMessageRenderer
          schema={allScalarsSchema}
          data={{ stringField: 'initial' }}
          onChange={onChange}
        />
      )

      expect(screen.getByDisplayValue('initial')).toBeInTheDocument()

      rerender(
        <ProtoMessageRenderer
          schema={allScalarsSchema}
          data={{ stringField: 'updated' }}
          onChange={onChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('updated')).toBeInTheDocument()
      })
    })

    it('should detect oneof from updated data', async () => {
      const onChange = vi.fn()
      const { rerender } = render(
        <ProtoMessageRenderer
          schema={oneofBasicSchema}
          data={{ id: 'test' }}
          onChange={onChange}
        />
      )

      rerender(
        <ProtoMessageRenderer
          schema={oneofBasicSchema}
          data={{ id: 'test', stringOption: 'new value' }}
          onChange={onChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('new value')).toBeInTheDocument()
      })
    })
  })

  describe('Expand/Collapse Controls', () => {
    it('should have expand all button for schemas with nested fields', () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer
          schema={deeplyNestedSchema}
          data={{}}
          onChange={onChange}
        />
      )

      const expandButton = screen.getByRole('button', { name: /expand/i })
      expect(expandButton).toBeInTheDocument()
    })

    it('should expand all nested fields when expand all is clicked', async () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer
          schema={deeplyNestedSchema}
          data={{}}
          onChange={onChange}
          defaultCollapsed={true}
        />
      )

      // Initially, nested fields should be collapsed
      // The child field is a nested message, so it should not be visible initially
      expect(screen.queryByPlaceholderText(/enter name/i)).toBeInTheDocument() // root level name
      const childInputs = screen.queryAllByPlaceholderText(/enter name/i)
      expect(childInputs.length).toBe(1) // Only root level visible

      // Click expand all
      const expandButton = screen.getByRole('button', { name: /expand/i })
      fireEvent.click(expandButton)

      // After expanding, nested fields should be visible (child.name field)
      await waitFor(() => {
        const allNameInputs = screen.getAllByPlaceholderText(/enter name/i)
        expect(allNameInputs.length).toBeGreaterThan(1) // Both root and child visible
      })
    })

    it('should expand all fields even with empty data (request form case)', async () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer
          schema={deeplyNestedSchema}
          data={{}}
          onChange={onChange}
          defaultCollapsed={true}
        />
      )

      // This is the key test for the fix:
      // With empty data (like in a request form), expand all should still work
      const expandButton = screen.getByRole('button', { name: /expand/i })
      fireEvent.click(expandButton)

      // Nested fields should become visible even though data is empty
      await waitFor(() => {
        const allNameInputs = screen.getAllByPlaceholderText(/enter name/i)
        expect(allNameInputs.length).toBeGreaterThan(1) // Should show nested child.name field
      })
    })

    it('should collapse all nested fields when collapse all is clicked', async () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer
          schema={deeplyNestedSchema}
          data={testData.deeplyNested}
          onChange={onChange}
        />
      )

      // Initially, fields with data are auto-expanded
      // Click expand all to make sure everything is expanded first
      const expandButton = screen.getByRole('button', { name: /expand/i })
      fireEvent.click(expandButton)

      await waitFor(() => {
        const allNameInputs = screen.getAllByPlaceholderText(/enter name/i)
        expect(allNameInputs.length).toBeGreaterThan(1)
      })

      // Now click collapse
      const collapseButton = screen.getByRole('button', { name: /collapse/i })
      fireEvent.click(collapseButton)

      // Nested fields should be hidden, only root level visible
      await waitFor(() => {
        const visibleInputs = screen.queryAllByPlaceholderText(/enter name/i)
        expect(visibleInputs.length).toBe(1) // Only root level visible after collapse
      })
    })

    it('should work correctly for repeated fields', async () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer
          schema={repeatedFieldsSchema}
          data={{}}
          onChange={onChange}
          defaultCollapsed={true}
        />
      )

      // Click expand all
      const expandButton = screen.getByRole('button', { name: /expand/i })
      fireEvent.click(expandButton)

      // Repeated field sections should become visible
      await waitFor(() => {
        // Look for the "Add" button which indicates the repeated field is expanded
        const addButtons = screen.queryAllByRole('button', { name: /add/i })
        expect(addButtons.length).toBeGreaterThan(0)
      })
    })

    it('should work correctly for map fields', async () => {
      const onChange = vi.fn()
      render(
        <ProtoMessageRenderer
          schema={mapFieldsSchema}
          data={{}}
          onChange={onChange}
          defaultCollapsed={true}
        />
      )

      // Initially map fields are collapsed
      expect(screen.queryAllByText(/add entry/i).length).toBe(0)

      // Click expand all
      const expandButton = screen.getByRole('button', { name: /expand/i })
      fireEvent.click(expandButton)

      // Map field sections should become visible
      await waitFor(() => {
        // After expanding, map field UI should be visible (check for field names)
        const mapFieldLabels = screen.queryAllByText(/map/i)
        expect(mapFieldLabels.length).toBeGreaterThan(0)
      })
    })
  })
})
