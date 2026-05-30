// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * onChange contract tests for every interactive UI component in schemaRenderer.
 *
 * Each test verifies the EXACT shape/type that onChange emits when a value is:
 *   - filled  (correct type, not a wrapper object)
 *   - cleared  (undefined / field deleted, not {} or wrong type)
 *
 * These tests were introduced after two bugs where the wrong shapes were emitted:
 *   - WrapperField emitted { value: X } instead of raw scalar X
 *   - StructValue emitted undefined on clear, flipping 'number_value' → 'string_value'
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SchemaRenderer from '../components/core/SchemaRenderer'
import {
  enumSchema,
  oneofBasicSchema,
  repeatedFieldsSchema,
  repeatedWithOneofSchema,
  mapFieldsSchema,
  mapWithOneofSchema,
  wellKnownTypesSchema,
  structMessageSchema,
  durationMessageSchema,
  fieldMaskMessageSchema,
  anyMessageSchema,
  schemaCache as testSchemaMap,
} from './protoMessageRenderer.fixtures'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../schemaLoader/lib/schemaCache', () => ({
  schemaCache: {
    getSchema: vi.fn((type: string) => Promise.resolve(testSchemaMap.get(type) ?? null)),
    getCacheSize: vi.fn(() => testSchemaMap.size),
    getCachedSchema: vi.fn((type: string) => testSchemaMap.get(type) ?? null),
    subscribe: vi.fn(() => () => {}),
    get allLoaded() { return true },
  },
  needsSchemaLoad: vi.fn(() => false),
}))

// Replace MuiDateTimePicker with a simple controlled text input so
// TimestampField can be tested without MUI/dayjs browser-env complexity.
vi.mock('@/components/ui/mui-datetime-picker', () => ({
  MuiDateTimePicker: ({
    value,
    onChange,
    disabled,
  }: {
    value: string | undefined
    onChange: (v: string | undefined) => void
    disabled?: boolean
  }) => (
    <>
      <input
        data-testid="timestamp-input"
        type="text"
        value={value ?? ''}
        disabled={disabled}
        onChange={e => onChange(e.target.value || undefined)}
      />
      <button
        data-testid="timestamp-clear"
        type="button"
        onClick={() => onChange(undefined)}
      />
    </>
  ),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => vi.clearAllMocks())

function latestCall(onChange: ReturnType<typeof vi.fn>) {
  return onChange.mock.calls.at(-1)![0] as Record<string, unknown>
}

// ---------------------------------------------------------------------------
// EnumField
// ---------------------------------------------------------------------------

describe('EnumField onChange', () => {
  it('emits the selected enum name string', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SchemaRenderer schema={enumSchema} data={{}} onChange={onChange} readOnly={false} />)

    await user.selectOptions(screen.getByRole('combobox'), 'STATUS_ACTIVE')

    await waitFor(() => {
      const latest = latestCall(onChange)
      expect(latest.status).toBe('STATUS_ACTIVE')
      expect(typeof latest.status).toBe('string')
    })
  })

  it('emits undefined (field deleted) when the blank option is selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer schema={enumSchema} data={{ status: 'STATUS_ACTIVE' }} onChange={onChange} readOnly={false} />
    )

    await user.selectOptions(screen.getByRole('combobox'), '')

    await waitFor(() => {
      // e.target.value = '' → `'' || undefined` = undefined → setFieldValue deletes key
      expect('status' in latestCall(onChange)).toBe(false)
    })
  })

  it('emits the new value when an already-selected enum is changed to a different value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer schema={enumSchema} data={{ status: 'STATUS_ACTIVE' }} onChange={onChange} readOnly={false} />
    )

    await user.selectOptions(screen.getByRole('combobox'), 'STATUS_INACTIVE')

    await waitFor(() => {
      expect(latestCall(onChange).status).toBe('STATUS_INACTIVE')
    })
  })
})

// ---------------------------------------------------------------------------
// TimestampField
// ---------------------------------------------------------------------------

describe('TimestampField onChange', () => {
  it('emits an ISO string when a date is entered', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SchemaRenderer schema={wellKnownTypesSchema} data={{}} onChange={onChange} readOnly={false} />)

    // TimestampField renders inline (no MessageFieldFrame), so no expand needed
    await user.type(screen.getByTestId('timestamp-input'), '2025-06-01T12:00:00.000Z')

    await waitFor(() => {
      const latest = latestCall(onChange)
      expect(typeof latest.createdAt).toBe('string')
      expect(latest.createdAt as string).toContain('2025-06-01')
    })
  })

  it('emits undefined (field deleted) when the timestamp is cleared', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={wellKnownTypesSchema}
        data={{ createdAt: '2025-01-01T00:00:00.000Z' }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.click(screen.getByTestId('timestamp-clear'))

    await waitFor(() => {
      expect('createdAt' in latestCall(onChange)).toBe(false)
    })
  })

  it('emits the new ISO string when an existing timestamp is changed to a different date', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={wellKnownTypesSchema}
        data={{ createdAt: '2025-01-01T00:00:00.000Z' }}
        onChange={onChange}
        readOnly={false}
      />
    )

    // Clear current value and type a new date
    const input = screen.getByTestId('timestamp-input')
    await user.clear(input)
    await user.type(input, '2025-12-25T15:30:00.000Z')

    await waitFor(() => {
      const latest = latestCall(onChange)
      expect(typeof latest.createdAt).toBe('string')
      expect(latest.createdAt as string).toContain('2025-12-25')
    })
  })
})

// ---------------------------------------------------------------------------
// DurationField
// ---------------------------------------------------------------------------

describe('DurationField onChange', () => {
  it('emits the Duration string when a value is entered', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SchemaRenderer schema={durationMessageSchema} data={{}} onChange={onChange} readOnly={false} />)

    await user.type(screen.getByPlaceholderText(/86400s/i), '3600s')

    await waitFor(() => {
      expect(latestCall(onChange).dur).toBe('3600s')
      expect(typeof latestCall(onChange).dur).toBe('string')
    })
  })

  it('emits undefined (field deleted) when the input is cleared', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer schema={durationMessageSchema} data={{ dur: '86400s' }} onChange={onChange} readOnly={false} />
    )

    await user.clear(screen.getByDisplayValue('86400s'))

    await waitFor(() => {
      expect('dur' in latestCall(onChange)).toBe(false)
    })
  })

  it('emits the new string when an existing Duration is changed', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer schema={durationMessageSchema} data={{ dur: '86400s' }} onChange={onChange} readOnly={false} />
    )

    const input = screen.getByDisplayValue('86400s')
    await user.clear(input)
    await user.type(input, '3600s')

    await waitFor(() => {
      expect(latestCall(onChange).dur).toBe('3600s')
    })
  })

  it('never emits an object — the value is always a string or absent', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SchemaRenderer schema={durationMessageSchema} data={{}} onChange={onChange} readOnly={false} />)

    await user.type(screen.getByPlaceholderText(/86400s/i), '7200s')

    await waitFor(() => {
      const calls = onChange.mock.calls.map(c => c[0] as Record<string, unknown>)
      for (const call of calls) {
        if ('dur' in call) {
          expect(typeof call.dur).toBe('string')
          expect(typeof call.dur).not.toBe('object')
        }
      }
    })
  })
})

// ---------------------------------------------------------------------------
// FieldMaskField
// ---------------------------------------------------------------------------

describe('FieldMaskField onChange', () => {
  it('emits a lowerCamelCase path string when a value is entered', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SchemaRenderer schema={fieldMaskMessageSchema} data={{}} onChange={onChange} readOnly={false} />)

    await user.type(screen.getByPlaceholderText(/lowerCamelCase/i), 'user.displayName,email')

    await waitFor(() => {
      expect(latestCall(onChange).mask).toBe('user.displayName,email')
      expect(typeof latestCall(onChange).mask).toBe('string')
    })
  })

  it('emits undefined (field deleted) when the input is cleared', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer schema={fieldMaskMessageSchema} data={{ mask: 'displayName' }} onChange={onChange} readOnly={false} />
    )

    await user.clear(screen.getByDisplayValue('displayName'))

    await waitFor(() => {
      expect('mask' in latestCall(onChange)).toBe(false)
    })
  })

  it('emits the new string when an existing FieldMask is changed', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer schema={fieldMaskMessageSchema} data={{ mask: 'name' }} onChange={onChange} readOnly={false} />
    )

    const input = screen.getByDisplayValue('name')
    await user.clear(input)
    await user.type(input, 'email,phone')

    await waitFor(() => {
      expect(latestCall(onChange).mask).toBe('email,phone')
    })
  })

  it('never emits an object — value is always a string or absent', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SchemaRenderer schema={fieldMaskMessageSchema} data={{}} onChange={onChange} readOnly={false} />)

    await user.type(screen.getByPlaceholderText(/lowerCamelCase/i), 'foo.barBaz')

    await waitFor(() => {
      for (const [call] of onChange.mock.calls as [Record<string, unknown>][]) {
        if ('mask' in call) expect(typeof call.mask).toBe('string')
      }
    })
  })
})

// ---------------------------------------------------------------------------
// AnyField
// ---------------------------------------------------------------------------

describe('AnyField onChange', () => {
  it('emits a parsed JS object when valid JSON is entered', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SchemaRenderer schema={anyMessageSchema} data={{}} onChange={onChange} readOnly={false} />)

    const anyJson = JSON.stringify({
      '@type': 'type.googleapis.com/google.protobuf.StringValue',
      'value': 'hello',
    })
    fireEvent.change(screen.getByTestId('anyField-textarea'), { target: { value: anyJson } })

    await waitFor(() => {
      const v = latestCall(onChange).payload as Record<string, unknown>
      expect(v['@type']).toBe('type.googleapis.com/google.protobuf.StringValue')
      expect(v['value']).toBe('hello')
      expect(typeof v).toBe('object')
    })
  })

  it('emits undefined (field deleted) when the textarea is cleared', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const initial = { '@type': 'type.googleapis.com/google.protobuf.StringValue', 'value': 'hi' }
    render(
      <SchemaRenderer schema={anyMessageSchema} data={{ payload: initial }} onChange={onChange} readOnly={false} />
    )

    fireEvent.change(screen.getByTestId('anyField-textarea'), { target: { value: '' } })

    await waitFor(() => {
      expect('payload' in latestCall(onChange)).toBe(false)
    })
  })

  it('does not emit when the JSON is invalid (user is mid-type)', async () => {
    const onChange = vi.fn()
    render(<SchemaRenderer schema={anyMessageSchema} data={{}} onChange={onChange} readOnly={false} />)

    // Partial/invalid JSON — onChange must NOT be called
    fireEvent.change(screen.getByTestId('anyField-textarea'), { target: { value: '{ "@type": ' } })

    await new Promise(r => setTimeout(r, 30))
    expect(onChange.mock.calls.length).toBe(0)
  })

  it('emits the new object when an existing Any value is changed', async () => {
    const onChange = vi.fn()
    const initial = { '@type': 'type.googleapis.com/google.protobuf.StringValue', 'value': 'old' }
    render(
      <SchemaRenderer schema={anyMessageSchema} data={{ payload: initial }} onChange={onChange} readOnly={false} />
    )

    const updated = JSON.stringify({
      '@type': 'type.googleapis.com/google.protobuf.Int32Value',
      'value': 42,
    })
    fireEvent.change(screen.getByTestId('anyField-textarea'), { target: { value: updated } })

    await waitFor(() => {
      const v = latestCall(onChange).payload as Record<string, unknown>
      expect(v['@type']).toBe('type.googleapis.com/google.protobuf.Int32Value')
      expect(v['value']).toBe(42)
    })
  })
})

// ---------------------------------------------------------------------------
// OneOfField
// ---------------------------------------------------------------------------

describe('OneOfField onChange', () => {
  it('selecting a scalar option clears all other oneof keys and does not pre-set the chosen key', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={oneofBasicSchema}
        data={{ id: 'x', stringOption: 'old', intOption: 5 }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.selectOptions(screen.getByRole('combobox'), 'stringOption')

    await waitFor(() => {
      const latest = latestCall(onChange)
      // scalar/enum options are not pre-initialised — user must type a value
      expect('stringOption' in latest).toBe(false)
      expect('intOption' in latest).toBe(false)
      expect(latest.id).toBe('x') // non-oneof field is preserved
    })
  })

  it('selecting a message option initialises that field to {}', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SchemaRenderer schema={oneofBasicSchema} data={{}} onChange={onChange} readOnly={false} />)

    await user.selectOptions(screen.getByRole('combobox'), 'messageOption')

    await waitFor(() => {
      const latest = latestCall(onChange)
      expect(latest.messageOption).toEqual({})
      expect('stringOption' in latest).toBe(false)
      expect('intOption' in latest).toBe(false)
    })
  })

  it('filling a nested field inside a message oneof emits the updated nested object', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SchemaRenderer schema={oneofBasicSchema} data={{}} onChange={onChange} readOnly={false} />)

    // Select the message oneof option — initialises to {}
    await user.selectOptions(screen.getByRole('combobox'), 'messageOption')

    // Fill the nested NestedValue.name field inside the message oneof
    await user.type(screen.getByPlaceholderText(/Enter name/i), 'nested-value')

    await waitFor(() => {
      const latest = latestCall(onChange)
      // Must be an object with the filled field, not {} or a scalar
      expect(typeof latest.messageOption).toBe('object')
      expect((latest.messageOption as Record<string, unknown>).name).toBe('nested-value')
      // No other oneof branches present
      expect('stringOption' in latest).toBe(false)
      expect('intOption' in latest).toBe(false)
    })
  })

  it('clearing a field inside a message oneof removes that key from the nested object', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={oneofBasicSchema}
        data={{ messageOption: { name: 'existing' } }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.clear(screen.getByDisplayValue('existing'))

    await waitFor(() => {
      const latest = latestCall(onChange)
      // The messageOption object stays present but the name key is deleted
      expect('messageOption' in latest).toBe(true)
      expect('name' in (latest.messageOption as Record<string, unknown>)).toBe(false)
    })
  })

  it('clearing the selection ("Select an option") removes all oneof keys', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={oneofBasicSchema}
        data={{ id: 'y', stringOption: 'hello' }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.selectOptions(screen.getByRole('combobox'), '')

    await waitFor(() => {
      const latest = latestCall(onChange)
      expect('stringOption' in latest).toBe(false)
      expect('intOption' in latest).toBe(false)
      expect('messageOption' in latest).toBe(false)
      expect(latest.id).toBe('y')
    })
  })

  it('typing into a selected scalar oneof field emits the value under the correct key', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SchemaRenderer schema={oneofBasicSchema} data={{}} onChange={onChange} readOnly={false} />)

    // Select scalar option first
    await user.selectOptions(screen.getByRole('combobox'), 'stringOption')
    // Then fill it in
    await user.type(screen.getByPlaceholderText(/Enter stringOption/i), 'world')

    await waitFor(() => {
      expect(latestCall(onChange).stringOption).toBe('world')
    })
  })

  it('changing the value of an already-filled scalar oneof field emits the updated value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={oneofBasicSchema}
        data={{ stringOption: 'original' }}
        onChange={onChange}
        readOnly={false}
      />
    )

    // The field is already populated and the select should reflect stringOption
    const input = screen.getByDisplayValue('original')
    await user.clear(input)
    await user.type(input, 'updated')

    await waitFor(() => {
      expect(latestCall(onChange).stringOption).toBe('updated')
      // Other oneof fields must stay absent
      expect('intOption' in latestCall(onChange)).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// ListField — scalar items
// ---------------------------------------------------------------------------

describe('ListField (scalar items) onChange', () => {
  it('adding an item appends an empty string to the array', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SchemaRenderer schema={repeatedFieldsSchema} data={{}} onChange={onChange} readOnly={false} />)

    await user.click(screen.getByRole('button', { name: /expand/i }))
    await user.click(screen.getByRole('button', { name: /Add repeatedString/i }))

    await waitFor(() => {
      const arr = latestCall(onChange).repeatedString as unknown[]
      expect(Array.isArray(arr)).toBe(true)
      expect(arr).toHaveLength(1)
      expect(arr[0]).toBe('')
    })
  })

  it('editing an item updates only that index, preserving others', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={repeatedFieldsSchema}
        data={{ repeatedString: ['alpha', 'beta', 'gamma'] }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /expand/i }))
    const betaInput = screen.getByDisplayValue('beta')
    await user.clear(betaInput)
    await user.type(betaInput, 'BETA')

    await waitFor(() => {
      const arr = latestCall(onChange).repeatedString as string[]
      expect(arr[0]).toBe('alpha')
      expect(arr[1]).toBe('BETA')
      expect(arr[2]).toBe('gamma')
    })
  })

  it('clearing an item emits undefined at that index (cleanFormData will strip it before wire encoding)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={repeatedFieldsSchema}
        data={{ repeatedString: ['alpha', 'beta'] }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /expand/i }))
    await user.clear(screen.getByDisplayValue('beta'))

    await waitFor(() => {
      const arr = latestCall(onChange).repeatedString as unknown[]
      // parseValue('', STRING) → undefined; replaceArrayItem puts undefined at index 1
      expect(arr[0]).toBe('alpha')
      expect(arr[1]).toBeUndefined()
    })
  })

  it('removing an item emits a shorter array with no undefined gaps', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={repeatedFieldsSchema}
        data={{ repeatedString: ['alpha', 'beta', 'gamma'] }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /expand/i }))
    const xButtons = screen.getAllByRole('button').filter(b => b.querySelector('svg'))
    // find the X buttons inside the list items (not expand/collapse)
    const removeButton = xButtons.find(b => b.closest('[class*="border-l-2"]'))
    if (removeButton) await user.click(removeButton)

    await waitFor(() => {
      const arr = latestCall(onChange).repeatedString as unknown[]
      expect(arr).toHaveLength(2)
      expect(arr.includes(undefined)).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// MapField — scalar values
// ---------------------------------------------------------------------------

describe('MapField (scalar values) onChange', () => {
  it('adding an entry emits the map with the new key/value pair', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SchemaRenderer schema={mapFieldsSchema} data={{}} onChange={onChange} readOnly={false} />)

    await user.click(screen.getByRole('button', { name: /expand/i }))
    await user.type(screen.getByPlaceholderText('Key'), 'color')
    await user.type(screen.getByPlaceholderText('Value'), 'red')
    await user.click(screen.getByTestId('mapField-addEntryButton'))

    await waitFor(() => {
      const map = latestCall(onChange).stringToString as Record<string, string>
      expect(map.color).toBe('red')
    })
  })

  it('adding an entry with no value gives an empty-string value (not undefined)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SchemaRenderer schema={mapFieldsSchema} data={{}} onChange={onChange} readOnly={false} />)

    await user.click(screen.getByRole('button', { name: /expand/i }))
    await user.type(screen.getByPlaceholderText('Key'), 'size')
    await user.click(screen.getByTestId('mapField-addEntryButton'))

    await waitFor(() => {
      const map = latestCall(onChange).stringToString as Record<string, string>
      // KeyInputAdder passes '' when value input is blank
      expect(map.size).toBe('')
    })
  })

  it('editing a scalar map value emits the updated value without touching other keys', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={mapFieldsSchema}
        data={{ stringToString: { color: 'blue', size: 'large' } }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /expand/i }))
    const colorInput = screen.getByDisplayValue('blue')
    await user.clear(colorInput)
    await user.type(colorInput, 'red')

    await waitFor(() => {
      const map = latestCall(onChange).stringToString as Record<string, string>
      expect(map.color).toBe('red')
      expect(map.size).toBe('large')
    })
  })

  it('clearing a scalar map value emits empty string (raw Input value, not parsed via parseValue)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={mapFieldsSchema}
        data={{ stringToString: { color: 'blue' } }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /expand/i }))
    await user.clear(screen.getByDisplayValue('blue'))

    await waitFor(() => {
      const map = latestCall(onChange).stringToString as Record<string, string>
      // MapField uses e.target.value directly, NOT parseValue — so '' not undefined
      expect(map.color).toBe('')
    })
  })

  it('removing an entry emits the map without that key and no undefined values', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={mapFieldsSchema}
        data={{ stringToString: { color: 'blue', size: 'large' } }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /expand/i }))
    const removeButtons = screen.getAllByRole('button').filter(
      b => b.closest('[class*="border-l-2"]') && b.querySelector('svg')
    )
    await user.click(removeButtons[0])

    await waitFor(() => {
      const map = latestCall(onChange).stringToString as Record<string, unknown>
      expect(Object.keys(map)).toHaveLength(1)
      expect(Object.values(map).includes(undefined)).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// StructFieldAdder — adding fields to a Struct
// ---------------------------------------------------------------------------

describe('StructFieldAdder onChange', () => {
  it('adding a new field emits the struct with the key initialised to empty string', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer schema={structMessageSchema} data={{ metadata: {} }} onChange={onChange} readOnly={false} />
    )

    await user.click(screen.getByRole('button', { name: /expand/i }))
    await user.type(screen.getByPlaceholderText('Field name'), 'priority')
    await user.click(screen.getByTestId('structField-addButton'))

    await waitFor(() => {
      const struct = latestCall(onChange).metadata as Record<string, unknown>
      expect('priority' in struct).toBe(true)
      expect(typeof struct.priority).toBe('string')
    })
  })

  it('adding a duplicate key is a no-op — onChange is not called again', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={structMessageSchema}
        data={{ metadata: { priority: 'high' } }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /expand/i }))

    // Wait for initial render to stabilise
    await waitFor(() => expect(screen.getByTestId('structField-addButton')).toBeInTheDocument())
    const countBefore = onChange.mock.calls.length

    await user.type(screen.getByPlaceholderText('Field name'), 'priority')
    await user.click(screen.getByTestId('structField-addButton'))

    // Give React a tick to process
    await new Promise(r => setTimeout(r, 50))
    expect(onChange.mock.calls.length).toBe(countBefore)
  })
})

// ---------------------------------------------------------------------------
// StructArrayItems — array items inside a Struct list field
// ---------------------------------------------------------------------------

describe('StructArrayItems onChange', () => {
  it('"Add item" appends an empty string to the array', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={structMessageSchema}
        data={{ metadata: { items: ['a', 'b'] } }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /expand/i }))
    await user.click(screen.getByTestId('structField-addItemButton'))

    await waitFor(() => {
      const items = (latestCall(onChange).metadata as Record<string, unknown>).items as unknown[]
      expect(Array.isArray(items)).toBe(true)
      expect(items).toHaveLength(3)
      expect(items[2]).toBe('') // StructArrayItems always appends ''
    })
  })

  it('removing a list item emits a shorter array with no undefined gaps', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={structMessageSchema}
        data={{ metadata: { items: ['only'] } }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /expand/i }))
    // Two remove buttons: [0] = outer (remove 'items' key), [1] = inner (remove items[0])
    const removeButtons = screen.getAllByTestId('structField-removeButton')
    await user.click(removeButtons[1]) // inner — removes the array item

    await waitFor(() => {
      const items = (latestCall(onChange).metadata as Record<string, unknown>).items as unknown[]
      expect(items).toHaveLength(0)
      expect(items.includes(undefined)).toBe(false)
    })
  })

  it('updating an existing array item emits the array with the new value at that index', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={structMessageSchema}
        data={{ metadata: { items: ['original', 'second'] } }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /expand/i }))
    const originalInput = screen.getByDisplayValue('original')
    await user.clear(originalInput)
    await user.type(originalInput, 'updated')

    await waitFor(() => {
      const items = (latestCall(onChange).metadata as Record<string, unknown>).items as string[]
      expect(items[0]).toBe('updated')
      expect(items[1]).toBe('second') // other item unchanged
    })
  })
})

// ---------------------------------------------------------------------------
// StructObjectFields — changing an existing scalar field value inside a Struct
// ---------------------------------------------------------------------------

describe('StructObjectFields (existing field) onChange', () => {
  it('changing a string field value emits the struct with the updated value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={structMessageSchema}
        data={{ metadata: { label: 'old-label', count: 5 } }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /expand/i }))
    const labelInput = screen.getByDisplayValue('old-label')
    await user.clear(labelInput)
    await user.type(labelInput, 'new-label')

    await waitFor(() => {
      const struct = latestCall(onChange).metadata as Record<string, unknown>
      expect(struct.label).toBe('new-label')
      expect(struct.count).toBe(5) // other field unchanged
    })
  })

  it('changing a number field value keeps the kind as number and emits the updated value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={structMessageSchema}
        data={{ metadata: { score: 42 } }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /expand/i }))

    // Verify kind is number before editing
    const kindSelect = screen.getByTestId('structField-kindSelect')
    expect((kindSelect as HTMLSelectElement).value).toBe('number')

    const scoreInput = screen.getByDisplayValue('42')
    await user.clear(scoreInput)
    await user.type(scoreInput, '99')

    await waitFor(() => {
      const struct = latestCall(onChange).metadata as Record<string, unknown>
      expect(struct.score).toBe(99)
      expect(typeof struct.score).toBe('number')
      // Kind must stay number, not flip to string
      expect((kindSelect as HTMLSelectElement).value).toBe('number')
    })
  })

  it('changing a boolean field value emits the inverted boolean', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={structMessageSchema}
        data={{ metadata: { active: true } }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /expand/i }))

    // Verify kind is bool
    const kindSelect = screen.getByTestId('structField-kindSelect')
    expect((kindSelect as HTMLSelectElement).value).toBe('bool')

    // Toggle the bool — bool_value renders as a checkbox via ScalarField
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)

    await waitFor(() => {
      const struct = latestCall(onChange).metadata as Record<string, unknown>
      expect(struct.active).toBe(false)
      expect(typeof struct.active).toBe('boolean')
    })
  })
})

// ---------------------------------------------------------------------------
// StructValue kind selector — the oneof inside google.protobuf.Value
//
// Each struct field holds a google.protobuf.Value which is a oneof
// (null_value, number_value, string_value, bool_value, struct_value,
// list_value).  The kind <select> in StructValue changes the active branch.
// When it changes, onChange must receive defaultStructValue(newKind), NOT the
// old value and NOT undefined — otherwise structKind() on the next render
// will derive a different kind than the user selected.
// ---------------------------------------------------------------------------

describe('StructValue kind selector onChange', () => {
  // Helper: render a struct with one field of the given initial value, expand,
  // find the kind select for that field, and return it + the onChange mock.
  async function setup(initialValue: unknown) {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={structMessageSchema}
        data={{ metadata: { field: initialValue } }}
        onChange={onChange}
        readOnly={false}
      />
    )
    await user.click(screen.getByRole('button', { name: /expand/i }))
    return { user, onChange, kindSelect: screen.getByTestId('structField-kindSelect') }
  }

  it('switching from number → string emits empty string (default for string kind)', async () => {
    const { user, onChange, kindSelect } = await setup(42)
    await user.selectOptions(kindSelect, 'string')
    await waitFor(() => {
      const v = (latestCall(onChange).metadata as Record<string, unknown>).field
      expect(v).toBe('')
      expect(typeof v).toBe('string')
    })
  })

  it('switching from string → number emits 0 (default for number kind)', async () => {
    const { user, onChange, kindSelect } = await setup('hello')
    await user.selectOptions(kindSelect, 'number')
    await waitFor(() => {
      const v = (latestCall(onChange).metadata as Record<string, unknown>).field
      expect(v).toBe(0)
      expect(typeof v).toBe('number')
    })
  })

  it('switching from number → bool emits false (default for bool kind)', async () => {
    const { user, onChange, kindSelect } = await setup(7)
    await user.selectOptions(kindSelect, 'bool')
    await waitFor(() => {
      const v = (latestCall(onChange).metadata as Record<string, unknown>).field
      expect(v).toBe(false)
      expect(typeof v).toBe('boolean')
    })
  })

  it('switching from string → null emits null', async () => {
    const { user, onChange, kindSelect } = await setup('text')
    await user.selectOptions(kindSelect, 'null')
    await waitFor(() => {
      const v = (latestCall(onChange).metadata as Record<string, unknown>).field
      expect(v).toBeNull()
    })
  })

  it('switching from null → number emits 0', async () => {
    const { user, onChange, kindSelect } = await setup(null)
    await user.selectOptions(kindSelect, 'number')
    await waitFor(() => {
      const v = (latestCall(onChange).metadata as Record<string, unknown>).field
      expect(v).toBe(0)
    })
  })

  it('switching from string → struct emits {} (default for struct kind)', async () => {
    const { user, onChange, kindSelect } = await setup('text')
    await user.selectOptions(kindSelect, 'struct')
    await waitFor(() => {
      const v = (latestCall(onChange).metadata as Record<string, unknown>).field
      expect(v).toEqual({})
    })
  })

  it('switching from number → list emits [] (default for list kind)', async () => {
    const { user, onChange, kindSelect } = await setup(5)
    await user.selectOptions(kindSelect, 'list')
    await waitFor(() => {
      const v = (latestCall(onChange).metadata as Record<string, unknown>).field
      expect(Array.isArray(v)).toBe(true)
      expect((v as unknown[]).length).toBe(0)
    })
  })

  it('kind selector reflects the current value type on initial render', async () => {
    const { kindSelect } = await setup(99)
    expect((kindSelect as HTMLSelectElement).value).toBe('number')
  })

  it('kind selector reflects string type when value is a string', async () => {
    const { kindSelect } = await setup('hello')
    expect((kindSelect as HTMLSelectElement).value).toBe('string')
  })

  it('kind selector reflects bool type when value is a boolean', async () => {
    const { kindSelect } = await setup(false)
    expect((kindSelect as HTMLSelectElement).value).toBe('bool')
  })

  it('kind selector reflects null type when value is null', async () => {
    const { kindSelect } = await setup(null)
    expect((kindSelect as HTMLSelectElement).value).toBe('null')
  })
})

// ---------------------------------------------------------------------------
// ListField — message items
//
// Each item is a full nested message rendered via MessageRenderer.
// The onChange path is: edit field inside item → MessageRenderer.onChange
// → ListField.updateItem(index, newObj) → replaceArrayItem → parent onChange.
// ---------------------------------------------------------------------------

describe('ListField (message items) onChange', () => {
  it('adding a message item appends {} to the array', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SchemaRenderer schema={repeatedWithOneofSchema} data={{}} onChange={onChange} readOnly={false} />)

    await user.click(screen.getByRole('button', { name: /expand/i }))
    await user.click(screen.getByRole('button', { name: /Add items/i }))

    await waitFor(() => {
      const arr = latestCall(onChange).items as unknown[]
      expect(arr).toHaveLength(1)
      expect(arr[0]).toEqual({})
    })
  })

  it('editing a scalar field inside a message item updates only that index', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={repeatedWithOneofSchema}
        data={{ items: [{ label: 'first' }, { label: 'second' }] }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /expand/i }))
    const firstInput = screen.getByDisplayValue('first')
    await user.clear(firstInput)
    await user.type(firstInput, 'UPDATED')

    await waitFor(() => {
      const arr = latestCall(onChange).items as Record<string, unknown>[]
      expect(arr[0].label).toBe('UPDATED')
      expect(arr[1].label).toBe('second')
    })
  })

  it('clearing a scalar field inside a message item deletes that key from the item object', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={repeatedWithOneofSchema}
        data={{ items: [{ label: 'hello' }] }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /expand/i }))
    await user.clear(screen.getByDisplayValue('hello'))

    await waitFor(() => {
      const arr = latestCall(onChange).items as Record<string, unknown>[]
      expect('label' in arr[0]).toBe(false)
    })
  })

  it('removing a message item emits a shorter array with no undefined gaps', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={repeatedWithOneofSchema}
        data={{ items: [{ label: 'first' }, { label: 'second' }] }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /expand/i }))
    const xButtons = screen.getAllByRole('button').filter(b => b.closest('[class*="border-l-2"]') && b.querySelector('svg'))
    await user.click(xButtons[0])

    await waitFor(() => {
      const arr = latestCall(onChange).items as Record<string, unknown>[]
      expect(arr).toHaveLength(1)
      expect(arr[0].label).toBe('second')
      expect(arr.includes(undefined)).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// MapField — message values (map<string, Message>)
//
// Each value is a nested message rendered via MessageRenderer.
// The onChange path is: edit field inside value → MessageRenderer.onChange
// → MapField: onChange(setObjectEntry(mapValue, key, newVal)).
// ---------------------------------------------------------------------------

describe('MapField (message values) onChange', () => {
  it('adding an entry initialises the message value to {}', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SchemaRenderer schema={mapWithOneofSchema} data={{}} onChange={onChange} readOnly={false} />)

    await user.click(screen.getByRole('button', { name: /expand/i }))
    await user.type(screen.getByPlaceholderText('Key'), 'myKey')
    await user.click(screen.getByTestId('mapField-addEntryButton'))

    await waitFor(() => {
      const entries = latestCall(onChange).entries as Record<string, unknown>
      expect(entries.myKey).toEqual({})
    })
  })

  it('editing a scalar field inside a message value updates only that entry', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={mapWithOneofSchema}
        data={{ entries: { alpha: { label: 'a' }, beta: { label: 'b' } } }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /expand/i }))
    const aInput = screen.getByDisplayValue('a')
    await user.clear(aInput)
    await user.type(aInput, 'UPDATED')

    await waitFor(() => {
      const entries = latestCall(onChange).entries as Record<string, Record<string, unknown>>
      expect(entries.alpha.label).toBe('UPDATED')
      expect(entries.beta.label).toBe('b')
    })
  })

  it('clearing a scalar field inside a message value deletes that key from the value object', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={mapWithOneofSchema}
        data={{ entries: { item: { label: 'hello' } } }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /expand/i }))
    await user.clear(screen.getByDisplayValue('hello'))

    await waitFor(() => {
      const entries = latestCall(onChange).entries as Record<string, Record<string, unknown>>
      expect('label' in entries.item).toBe(false)
    })
  })

  it('removing a message map entry emits the map without that key', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SchemaRenderer
        schema={mapWithOneofSchema}
        data={{ entries: { keep: { label: 'keep' }, drop: { label: 'drop' } } }}
        onChange={onChange}
        readOnly={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /expand/i }))
    const removeButtons = screen.getAllByRole('button').filter(
      b => b.closest('[class*="border-l-2"]') && b.querySelector('svg')
    )
    await user.click(removeButtons[0])

    await waitFor(() => {
      const entries = latestCall(onChange).entries as Record<string, unknown>
      expect(Object.keys(entries)).toHaveLength(1)
      expect(Object.values(entries).includes(undefined)).toBe(false)
    })
  })
})
