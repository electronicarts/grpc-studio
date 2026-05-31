// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, expect, it, vi } from 'vitest'
import { toWireFormat } from '../payload'
import {
  schemaCache as testSchemaMap,
} from '../../../schemaRenderer/__tests__/protoMessageRenderer.fixtures'




vi.mock('../../../schemaLoader/lib/schemaCache', () => ({
  schemaCache: {
    getCachedSchema: vi.fn((type: string) => testSchemaMap.get(type) ?? null),
    getSchemaMap: vi.fn(() => testSchemaMap),
  },
}))

describe('payload conversion', () => {
  it('keeps empty protobuf maps as JSON objects', () => {
    const payload = toWireFormat({ stringToString: {} }, 'test.MapFields')

    expect(payload.wire).toEqual({})
  })

  it('rejects array values for protobuf map fields', () => {
    expect(() => toWireFormat({ stringToString: [] }, 'test.MapFields'))
      .toThrow('expected object, got Array')
  })

  it('allows arbitrary JSON object keys for google.protobuf.Struct fields', () => {
    const payload = toWireFormat(
      { metadata: { dietary: ['grain-free'], priority: 3 } },
      'test.StructMessage',
    )

    expect(payload.wire).toEqual({
      metadata: { dietary: ['grain-free'], priority: 3 },
    })
  })
})

// ---------------------------------------------------------------------------
// Wrapper type fields (google.protobuf.*Value)
// These tests guard against two bugs:
//   1. WrapperField emitting { value: X } instead of raw scalar X
//   2. WrapperField emitting { value: undefined }, which cleanFormData turns
//      into {}, which bufbuild rejects with "expected number, got object"
// ---------------------------------------------------------------------------

describe('wrapper type fields', () => {
  it('accepts raw scalar for Int32Value field', () => {
    const payload = toWireFormat({ int_val: 134200 }, 'test.WrapperMessage')
    expect(payload.wire).toEqual({ int_val: 134200 })
  })

  it('accepts raw string for StringValue field', () => {
    const payload = toWireFormat({ str_val: 'hello' }, 'test.WrapperMessage')
    expect(payload.wire).toEqual({ str_val: 'hello' })
  })

  it('accepts null to clear a wrapper field', () => {
    const payload = toWireFormat({ int_val: null }, 'test.WrapperMessage')
    expect(payload.wire).toEqual({})
  })

  it('omits absent wrapper fields', () => {
    const payload = toWireFormat({}, 'test.WrapperMessage')
    expect(payload.wire).toEqual({})
  })

  it('throws when Int32Value field receives empty object — the cleared-input regression', () => {
    // Before fix: WrapperField called onChange({ value: undefined }).
    // cleanFormData({ value: undefined }) returned {} (empty object, not undefined).
    // fromJson then received {} for the Int32Value field and threw.
    expect(() => toWireFormat({ int_val: {} }, 'test.WrapperMessage'))
      .toThrow('cannot decode field google.protobuf.Int32Value.value')
  })

  it('throws when Int32Value field receives wrapped object { value: X } — the pre-fix WrapperField format', () => {
    // Before fix: WrapperField called onChange({ value: 134200 }) instead of onChange(134200).
    // bufbuild well-known-type decoder expects a raw scalar, not an object wrapper.
    expect(() => toWireFormat({ int_val: { value: 134200 } }, 'test.WrapperMessage'))
      .toThrow('cannot decode field google.protobuf.Int32Value.value')
  })

  it('handles multiple wrapper fields together', () => {
    const payload = toWireFormat({ int_val: 42, str_val: 'test', float_val: 3.14 }, 'test.WrapperMessage')
    expect(payload.wire.int_val).toBe(42)
    expect(payload.wire.str_val).toBe('test')
    expect((payload.wire.float_val as number)).toBeCloseTo(3.14, 2)
  })
})

// ---------------------------------------------------------------------------
// Duration well-known type (google.protobuf.Duration)
// Proto3 JSON encodes Duration as a string like "86400s", not as an object.
// DurationField stores the value as a string; these tests verify that the
// string form round-trips cleanly and that the pre-fix object form throws.
// ---------------------------------------------------------------------------

describe('Duration well-known type field', () => {
  it('accepts Duration encoded as a proto JSON string ("86400s")', () => {
    const payload = toWireFormat({ dur: '86400s' }, 'test.DurationMessage')
    expect(payload.wire).toEqual({ dur: '86400s' })
  })

  it('accepts fractional Duration string ("1.5s") and normalises it', () => {
    const payload = toWireFormat({ dur: '1.5s' }, 'test.DurationMessage')
    expect(typeof payload.wire.dur).toBe('string')
    expect((payload.wire.dur as string).endsWith('s')).toBe(true)
  })

  it('accepts zero Duration ("0s")', () => {
    const payload = toWireFormat({ dur: '0s' }, 'test.DurationMessage')
    expect(payload.wire.dur).toBe('0s')
  })

  it('omits absent Duration field', () => {
    const payload = toWireFormat({}, 'test.DurationMessage')
    expect(payload.wire).toEqual({})
  })

  it('throws when Duration field receives an object — the pre-fix MessageRenderer bug', () => {
    // Before fix: Duration had no dedicated renderer, so MessageRenderer rendered
    // seconds/nanos scalar inputs. User filling seconds=86400 produced
    // { seconds: 86400 }, which fromJson rejects for a well-known Duration field.
    expect(() => toWireFormat({ dur: { seconds: 86400 } }, 'test.DurationMessage'))
      .toThrow('cannot decode message google.protobuf.Duration from JSON')
  })
})

// ---------------------------------------------------------------------------
// FieldMask well-known type (google.protobuf.FieldMask)
// Proto3 JSON encodes FieldMask as a comma-separated lowerCamelCase string.
// bufbuild rejects snake_case paths; only camelCase is valid.
// ---------------------------------------------------------------------------

describe('FieldMask well-known type field', () => {
  it('accepts lowerCamelCase field paths', () => {
    const payload = toWireFormat({ mask: 'user.displayName,email' }, 'test.FieldMaskMessage')
    expect(payload.wire.mask).toBe('user.displayName,email')
  })

  it('accepts a single lowerCamelCase path', () => {
    const payload = toWireFormat({ mask: 'displayName' }, 'test.FieldMaskMessage')
    expect(typeof payload.wire.mask).toBe('string')
  })

  it('omits absent FieldMask field', () => {
    const payload = toWireFormat({}, 'test.FieldMaskMessage')
    expect(payload.wire).toEqual({})
  })

  it('throws when FieldMask field receives snake_case paths — bufbuild requires lowerCamelCase', () => {
    expect(() => toWireFormat({ mask: 'user.display_name' }, 'test.FieldMaskMessage'))
      .toThrow('path names must be lowerCamelCase')
  })

  it('throws when FieldMask field receives an object — pre-fix MessageRenderer bug', () => {
    // Before fix: would render as a repeated-string list, producing { paths: [...] }
    expect(() => toWireFormat({ mask: { paths: ['displayName'] } }, 'test.FieldMaskMessage'))
      .toThrow('cannot decode message google.protobuf.FieldMask from JSON')
  })
})

// ---------------------------------------------------------------------------
// Any well-known type (google.protobuf.Any)
// Proto3 JSON: { "@type": "type.googleapis.com/...", ...fields }
// Requires the backend to pass { registry } to fromJson/toJson.
// ---------------------------------------------------------------------------

describe('Any well-known type field', () => {
  it('accepts an Any object with a "@type" key', () => {
    const input = { '@type': 'type.googleapis.com/google.protobuf.StringValue', 'value': 'hello' }
    // AnyField stores the parsed JS object; fromJson needs { registry } on the backend.
    // On the frontend payload layer, the value is passed through as-is (the backend handles Any).
    const payload = toWireFormat({ payload: input }, 'test.AnyMessage')
    // The wire output contains the Any object with @type preserved
    expect((payload.wire.payload as Record<string, unknown>)['@type'])
      .toBe('type.googleapis.com/google.protobuf.StringValue')
  })

  it('omits absent Any field', () => {
    const payload = toWireFormat({}, 'test.AnyMessage')
    expect(payload.wire).toEqual({})
  })

  it('throws when Any field receives a plain string instead of an object', () => {
    expect(() => toWireFormat({ payload: 'not-an-object' }, 'test.AnyMessage'))
      .toThrow()
  })
})

// Test for the user-reported issue: empty WKT fields in Any
describe('Any with empty WKT fields', () => {
  it('omits Any field when it has only @type (no data) - BytesValue', () => {
    // When user selects a WKT type but hasn't filled in any data yet,
    // cleanFormData treats { '@type': '...' } as undefined to avoid fromJson errors
    const payload = toWireFormat(
      { payload: { '@type': 'type.googleapis.com/google.protobuf.BytesValue' } },
      'test.AnyMessage'
    )
    // The Any field should be omitted entirely (proto3 default)
    expect(payload.wire).toEqual({})
  })

  it('throws when Any with BytesValue has empty object as value', () => {
    expect(() => toWireFormat(
      { payload: { '@type': 'type.googleapis.com/google.protobuf.BytesValue', 'value': {} } },
      'test.AnyMessage'
    )).toThrow('cannot decode field google.protobuf.BytesValue.value')
  })

  it('omits Any field when it has only @type (no data) - StringValue', () => {
    const payload = toWireFormat(
      { payload: { '@type': 'type.googleapis.com/google.protobuf.StringValue' } },
      'test.AnyMessage'
    )
    expect(payload.wire).toEqual({})
  })

  it('includes Any field when it has @type and actual data', () => {
    const payload = toWireFormat(
      { payload: { '@type': 'type.googleapis.com/google.protobuf.StringValue', 'value': 'hello' } },
      'test.AnyMessage'
    )
    expect((payload.wire.payload as Record<string, unknown>)['@type'])
      .toBe('type.googleapis.com/google.protobuf.StringValue')
    expect((payload.wire.payload as Record<string, unknown>)['value']).toBe('hello')
  })
})
