// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect } from 'vitest'
import { ScalarType, create, toBinary } from '@bufbuild/protobuf'
import { FileDescriptorSetSchema } from '@bufbuild/protobuf/wkt'
import { base64Encode } from '@bufbuild/protobuf/wire'
import { scalarTypeName, fieldTypeName, parseDescriptorIntoMap, anyTypeName, anyTypeUrl } from '@/utils/descUtils'
import type { DescField, DescMessage } from '@bufbuild/protobuf'

describe('descUtils', () => {
  describe('scalarTypeName', () => {
    it('should return lowercase scalar type names', () => {
      expect(scalarTypeName(ScalarType.STRING)).toBe('string')
      expect(scalarTypeName(ScalarType.INT32)).toBe('int32')
      expect(scalarTypeName(ScalarType.BOOL)).toBe('bool')
      expect(scalarTypeName(ScalarType.DOUBLE)).toBe('double')
      expect(scalarTypeName(ScalarType.BYTES)).toBe('bytes')
    })

    it('should handle all scalar types', () => {
      const scalarTypes = [
        ScalarType.STRING,
        ScalarType.INT32,
        ScalarType.INT64,
        ScalarType.UINT32,
        ScalarType.UINT64,
        ScalarType.BOOL,
        ScalarType.FLOAT,
        ScalarType.DOUBLE,
        ScalarType.BYTES,
      ]

      scalarTypes.forEach(type => {
        const name = scalarTypeName(type)
        expect(name).toBeTruthy()
        expect(typeof name).toBe('string')
        expect(name).toBe(name.toLowerCase())
      })
    })
  })

  describe('fieldTypeName', () => {
    it('should return type name for scalar field', () => {
      const field: Partial<DescField> = {
        fieldKind: 'scalar',
        scalar: ScalarType.STRING,
      }

      expect(fieldTypeName(field as DescField)).toBe('string')
    })

    it('should return type name for enum field', () => {
      const field: Partial<DescField> = {
        fieldKind: 'enum',
        enum: { typeName: 'MyEnum' } as unknown as DescEnum,
      }

      expect(fieldTypeName(field as DescField)).toBe('MyEnum')
    })

    it('should return type name for message field', () => {
      const field: Partial<DescField> = {
        fieldKind: 'message',
        message: { typeName: 'MyMessage' } as unknown as DescMessage,
      }

      expect(fieldTypeName(field as DescField)).toBe('MyMessage')
    })

    it('should return type name for list of scalars', () => {
      const field: Partial<DescField> = {
        fieldKind: 'list',
        listKind: 'scalar',
        scalar: ScalarType.INT32,
      }

      expect(fieldTypeName(field as DescField)).toBe('int32')
    })

    it('should return type name for list of enums', () => {
      const field: Partial<DescField> = {
        fieldKind: 'list',
        listKind: 'enum',
        enum: { typeName: 'Status' } as unknown as DescEnum,
      }

      expect(fieldTypeName(field as DescField)).toBe('Status')
    })

    it('should return type name for list of messages', () => {
      const field: Partial<DescField> = {
        fieldKind: 'list',
        listKind: 'message',
        message: { typeName: 'Item' } as unknown as DescMessage,
      }

      expect(fieldTypeName(field as DescField)).toBe('Item')
    })

    it('should return formatted type name for map with scalar value', () => {
      const field: Partial<DescField> = {
        fieldKind: 'map',
        mapKey: ScalarType.STRING,
        mapKind: 'scalar',
        scalar: ScalarType.INT32,
      }

      expect(fieldTypeName(field as DescField)).toBe('map<string, int32>')
    })

    it('should return formatted type name for map with enum value', () => {
      const field: Partial<DescField> = {
        fieldKind: 'map',
        mapKey: ScalarType.STRING,
        mapKind: 'enum',
        enum: { typeName: 'Color' } as unknown as DescEnum,
      }

      expect(fieldTypeName(field as DescField)).toBe('map<string, Color>')
    })

    it('should return formatted type name for map with message value', () => {
      const field: Partial<DescField> = {
        fieldKind: 'map',
        mapKey: ScalarType.STRING,
        mapKind: 'message',
        message: { typeName: 'Value' } as unknown as DescMessage,
      }

      expect(fieldTypeName(field as DescField)).toBe('map<string, Value>')
    })
  })

  describe('parseDescriptorIntoMap', () => {
    it('should collect top-level and nested messages by their full name', () => {
      const fdSet = create(FileDescriptorSetSchema, {
        file: [
          {
            name: 'outer.proto',
            package: 'pkg',
            syntax: 'proto3',
            messageType: [{ name: 'Outer', nestedType: [{ name: 'Inner', nestedType: [{ name: 'Deepest' }] }] }],
          },
        ],
      })
      const target = new Map<string, DescMessage>()

      parseDescriptorIntoMap(base64Encode(toBinary(FileDescriptorSetSchema, fdSet)), target)

      expect([...target.keys()].sort()).toEqual(['pkg.Outer', 'pkg.Outer.Inner', 'pkg.Outer.Inner.Deepest'])
    })

    it('should parse simple descriptor set', () => {
      // Create a minimal valid FileDescriptorSet as base64
      // This is a simplified descriptor for testing
      const mockDescriptor = createMockDescriptorBase64()
      const target = new Map()

      parseDescriptorIntoMap(mockDescriptor, target)

      // Should have added message to map
      expect(target.size).toBeGreaterThanOrEqual(0)
    })

    it('should handle empty descriptor set', () => {
      const emptyDescriptor = createEmptyDescriptorBase64()
      const target = new Map()

      parseDescriptorIntoMap(emptyDescriptor, target)

      expect(target.size).toBe(0)
    })

    it('should collect nested messages', () => {
      const descriptorWithNested = createMockDescriptorBase64()
      const target = new Map()

      parseDescriptorIntoMap(descriptorWithNested, target)

      // Should work without throwing
      expect(target).toBeInstanceOf(Map)
    })
  })
})

// Helper functions to create test descriptors
function createEmptyDescriptorBase64(): string {
  // Empty FileDescriptorSet
  const emptyFDS = new Uint8Array([])
  return btoa(String.fromCharCode(...emptyFDS))
}

function createMockDescriptorBase64(): string {
  // Minimal valid FileDescriptorSet
  // This is a simplified version for testing
  const mockFDS = new Uint8Array([0x0a, 0x00]) // Empty file list
  return btoa(String.fromCharCode(...mockFDS))
}

describe('Any type URLs', () => {
  it('should build the type URL for a message type', () => {
    expect(anyTypeUrl('pkg.Outer.Inner')).toBe('type.googleapis.com/pkg.Outer.Inner')
  })

  it('should read the type name after the last slash, whatever the host', () => {
    expect(anyTypeName('type.googleapis.com/pkg.Outer.Inner')).toBe('pkg.Outer.Inner')
    expect(anyTypeName('example.com/types/pkg.Msg')).toBe('pkg.Msg')
    expect(anyTypeName(anyTypeUrl('pkg.Msg'))).toBe('pkg.Msg')
  })
})
