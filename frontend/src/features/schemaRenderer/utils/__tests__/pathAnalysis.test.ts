// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect } from 'vitest'
import { collectExpandablePaths, hasDataAtPath } from '../pathAnalysis'
import type { DescMessage } from '@bufbuild/protobuf'

describe('pathAnalysis', () => {
  describe('collectExpandablePaths', () => {
    it('collects paths for nested message fields', () => {
      const schema: Partial<DescMessage> = {
        typeName: 'TestMessage',
        fields: [
          {
            name: 'address',
            fieldKind: 'message',
            message: {
              typeName: 'Address',
              fields: [],
              oneofs: [],
              nestedMessages: [],
              nestedEnums: [],
            } as DescMessage,
          } as DescField,
          {
            name: 'name',
            fieldKind: 'scalar',
          } as DescField,
        ],
        oneofs: [],
        nestedMessages: [],
        nestedEnums: [],
      }

      const paths = collectExpandablePaths(schema as DescMessage)

      expect(paths.has('address')).toBe(true)
      expect(paths.has('name')).toBe(false) // scalar fields are not expandable
      expect(paths.size).toBe(1)
    })

    it('collects paths for repeated fields', () => {
      const schema: Partial<DescMessage> = {
        typeName: 'TestMessage',
        fields: [
          {
            name: 'tags',
            fieldKind: 'list',
            listKind: 'scalar',
          } as DescField,
          {
            name: 'items',
            fieldKind: 'list',
            listKind: 'message',
            message: {
              typeName: 'Item',
              fields: [],
              oneofs: [],
              nestedMessages: [],
              nestedEnums: [],
            } as DescMessage,
          } as DescField,
        ],
        oneofs: [],
        nestedMessages: [],
        nestedEnums: [],
      }

      const paths = collectExpandablePaths(schema as DescMessage)

      expect(paths.has('tags')).toBe(true)
      expect(paths.has('items')).toBe(true)
      expect(paths.size).toBe(2)
    })

    it('collects paths for map fields', () => {
      const schema: Partial<DescMessage> = {
        typeName: 'TestMessage',
        fields: [
          {
            name: 'metadata',
            fieldKind: 'map',
            mapKind: 'scalar',
          } as DescField,
          {
            name: 'configs',
            fieldKind: 'map',
            mapKind: 'message',
            message: {
              typeName: 'Config',
              fields: [],
              oneofs: [],
              nestedMessages: [],
              nestedEnums: [],
            } as DescMessage,
          } as DescField,
        ],
        oneofs: [],
        nestedMessages: [],
        nestedEnums: [],
      }

      const paths = collectExpandablePaths(schema as DescMessage)

      expect(paths.has('metadata')).toBe(true)
      expect(paths.has('configs')).toBe(true)
      expect(paths.size).toBe(2)
    })

    it('collects deeply nested paths', () => {
      const schema: Partial<DescMessage> = {
        typeName: 'TestMessage',
        fields: [
          {
            name: 'user',
            fieldKind: 'message',
            message: {
              typeName: 'User',
              fields: [
                {
                  name: 'profile',
                  fieldKind: 'message',
                  message: {
                    typeName: 'Profile',
                    fields: [
                      {
                        name: 'avatar',
                        fieldKind: 'message',
                        message: {
                          typeName: 'Avatar',
                          fields: [],
                          oneofs: [],
                          nestedMessages: [],
                          nestedEnums: [],
                        } as DescMessage,
                      } as DescField,
                    ],
                    oneofs: [],
                    nestedMessages: [],
                    nestedEnums: [],
                  } as DescMessage,
                } as DescField,
              ],
              oneofs: [],
              nestedMessages: [],
              nestedEnums: [],
            } as DescMessage,
          } as DescField,
        ],
        oneofs: [],
        nestedMessages: [],
        nestedEnums: [],
      }

      const paths = collectExpandablePaths(schema as DescMessage)

      expect(paths.has('user')).toBe(true)
      expect(paths.has('user.profile')).toBe(true)
      expect(paths.has('user.profile.avatar')).toBe(true)
      expect(paths.size).toBe(3)
    })

    it('works with empty schema (no fields)', () => {
      const schema: Partial<DescMessage> = {
        typeName: 'EmptyMessage',
        fields: [],
        oneofs: [],
        nestedMessages: [],
        nestedEnums: [],
      }

      const paths = collectExpandablePaths(schema as DescMessage)

      expect(paths.size).toBe(0)
    })

    it('collects paths regardless of data presence (empty form)', () => {
      const schema: Partial<DescMessage> = {
        typeName: 'RequestMessage',
        fields: [
          {
            name: 'address',
            fieldKind: 'message',
            message: {
              typeName: 'Address',
              fields: [
                {
                  name: 'street',
                  fieldKind: 'scalar',
                } as DescField,
              ],
              oneofs: [],
              nestedMessages: [],
              nestedEnums: [],
            } as DescMessage,
          } as DescField,
          {
            name: 'items',
            fieldKind: 'list',
            listKind: 'message',
            message: {
              typeName: 'Item',
              fields: [],
              oneofs: [],
              nestedMessages: [],
              nestedEnums: [],
            } as DescMessage,
          } as DescField,
          {
            name: 'metadata',
            fieldKind: 'map',
            mapKind: 'scalar',
          } as DescField,
        ],
        oneofs: [],
        nestedMessages: [],
        nestedEnums: [],
      }

      // This test verifies the fix: collectExpandablePaths should work
      // even when there's no data (empty request form case)
      const paths = collectExpandablePaths(schema as DescMessage)

      expect(paths.has('address')).toBe(true)
      expect(paths.has('items')).toBe(true)
      expect(paths.has('metadata')).toBe(true)
      expect(paths.size).toBe(3)
    })

    it('generates paths for array items when data is provided', () => {
      const schema: Partial<DescMessage> = {
        typeName: 'TestMessage',
        fields: [
          {
            name: 'users',
            fieldKind: 'list',
            listKind: 'message',
            message: {
              typeName: 'User',
              fields: [
                {
                  name: 'name',
                  fieldKind: 'scalar',
                } as DescField,
              ],
              oneofs: [],
              nestedMessages: [],
              nestedEnums: [],
            } as DescMessage,
          } as DescField,
        ],
        oneofs: [],
        nestedMessages: [],
        nestedEnums: [],
      }

      const data = {
        users: [
          { name: 'Alice' },
          { name: 'Bob' },
          { name: 'Charlie' },
        ],
      }

      const paths = collectExpandablePaths(schema as DescMessage, data)

      // Should include container and each array item
      expect(paths.has('users')).toBe(true)
      expect(paths.has('users[0]')).toBe(true)
      expect(paths.has('users[1]')).toBe(true)
      expect(paths.has('users[2]')).toBe(true)
      expect(paths.size).toBe(4)
    })

    it('generates paths for nested arrays', () => {
      const schema: Partial<DescMessage> = {
        typeName: 'TestMessage',
        fields: [
          {
            name: 'groups',
            fieldKind: 'list',
            listKind: 'message',
            message: {
              typeName: 'Group',
              fields: [
                {
                  name: 'members',
                  fieldKind: 'list',
                  listKind: 'message',
                  message: {
                    typeName: 'Member',
                    fields: [],
                    oneofs: [],
                    nestedMessages: [],
                    nestedEnums: [],
                  } as DescMessage,
                } as DescField,
              ],
              oneofs: [],
              nestedMessages: [],
              nestedEnums: [],
            } as DescMessage,
          } as DescField,
        ],
        oneofs: [],
        nestedMessages: [],
        nestedEnums: [],
      }

      const data = {
        groups: [
          {
            members: [{ name: 'Alice' }, { name: 'Bob' }],
          },
        ],
      }

      const paths = collectExpandablePaths(schema as DescMessage, data)

      expect(paths.has('groups')).toBe(true)
      expect(paths.has('groups[0]')).toBe(true)
      expect(paths.has('groups[0].members')).toBe(true)
      expect(paths.has('groups[0].members[0]')).toBe(true)
      expect(paths.has('groups[0].members[1]')).toBe(true)
    })

    it('collects paths for oneof fields when they have data', () => {
      const schema: Partial<DescMessage> = {
        typeName: 'TestMessage',
        fields: [
          {
            name: 'normalField',
            fieldKind: 'message',
            oneof: undefined,
            message: {
              typeName: 'Normal',
              fields: [],
              oneofs: [],
              nestedMessages: [],
              nestedEnums: [],
            } as DescMessage,
          } as DescField,
          {
            name: 'optionA',
            fieldKind: 'message',
            oneof: {
              name: 'myOneof',
              fields: [],
            },
            message: {
              typeName: 'OptionA',
              fields: [],
              oneofs: [],
              nestedMessages: [],
              nestedEnums: [],
            } as DescMessage,
          } as DescField,
          {
            name: 'optionB',
            fieldKind: 'scalar',
            oneof: {
              name: 'myOneof',
              fields: [],
            },
          } as DescField,
        ],
        oneofs: [
          {
            name: 'myOneof',
            fields: [
              {
                name: 'optionA',
                fieldKind: 'message',
                message: {
                  typeName: 'OptionA',
                  fields: [],
                  oneofs: [],
                  nestedMessages: [],
                  nestedEnums: [],
                } as DescMessage,
              } as DescField,
              {
                name: 'optionB',
                fieldKind: 'scalar',
              } as DescField,
            ],
          },
        ],
        nestedMessages: [],
        nestedEnums: [],
      }

      // Data with optionA selected (message type)
      const dataWithOptionA = {
        normalField: {},
        optionA: { someField: 'value' },
      }

      const pathsWithOptionA = collectExpandablePaths(schema as DescMessage, dataWithOptionA)

      // Should collect both normalField and the selected oneOf option
      expect(pathsWithOptionA.has('normalField')).toBe(true)
      expect(pathsWithOptionA.has('optionA')).toBe(true)
      expect(pathsWithOptionA.has('optionB')).toBe(false) // not selected
      expect(pathsWithOptionA.size).toBe(2)

      // Data with optionB selected (scalar type)
      const dataWithOptionB = {
        normalField: {},
        optionB: 'some value',
      }

      const pathsWithOptionB = collectExpandablePaths(schema as DescMessage, dataWithOptionB)

      // optionB is scalar, so it shouldn't be expandable
      expect(pathsWithOptionB.has('normalField')).toBe(true)
      expect(pathsWithOptionB.has('optionA')).toBe(false) // not selected
      expect(pathsWithOptionB.has('optionB')).toBe(false) // scalar, not expandable
      expect(pathsWithOptionB.size).toBe(1)

      // Data with no oneOf option selected
      const dataNoSelection = {
        normalField: {},
      }

      const pathsNoSelection = collectExpandablePaths(schema as DescMessage, dataNoSelection)

      // Should only collect normalField
      expect(pathsNoSelection.has('normalField')).toBe(true)
      expect(pathsNoSelection.has('optionA')).toBe(false)
      expect(pathsNoSelection.has('optionB')).toBe(false)
      expect(pathsNoSelection.size).toBe(1)
    })

    it('collects paths for nested messages inside oneof fields', () => {
      const schema: Partial<DescMessage> = {
        typeName: 'TestMessage',
        fields: [
          {
            name: 'payment',
            fieldKind: 'message',
            oneof: {
              name: 'paymentMethod',
              fields: [],
            },
            message: {
              typeName: 'CreditCard',
              fields: [
                {
                  name: 'billingAddress',
                  fieldKind: 'message',
                  message: {
                    typeName: 'Address',
                    fields: [],
                    oneofs: [],
                    nestedMessages: [],
                    nestedEnums: [],
                  } as DescMessage,
                } as DescField,
              ],
              oneofs: [],
              nestedMessages: [],
              nestedEnums: [],
            } as DescMessage,
          } as DescField,
        ],
        oneofs: [
          {
            name: 'paymentMethod',
            fields: [
              {
                name: 'payment',
                fieldKind: 'message',
                message: {
                  typeName: 'CreditCard',
                  fields: [
                    {
                      name: 'billingAddress',
                      fieldKind: 'message',
                      message: {
                        typeName: 'Address',
                        fields: [],
                        oneofs: [],
                        nestedMessages: [],
                        nestedEnums: [],
                      } as DescMessage,
                    } as DescField,
                  ],
                  oneofs: [],
                  nestedMessages: [],
                  nestedEnums: [],
                } as DescMessage,
              } as DescField,
            ],
          },
        ],
        nestedMessages: [],
        nestedEnums: [],
      }

      const data = {
        payment: {
          billingAddress: {
            street: '123 Main St',
          },
        },
      }

      const paths = collectExpandablePaths(schema as DescMessage, data)

      // Should collect the oneOf field and its nested message
      expect(paths.has('payment')).toBe(true)
      expect(paths.has('payment.billingAddress')).toBe(true)
      expect(paths.size).toBe(2)
    })
  })

  describe('hasDataAtPath', () => {
    it('returns true for existing nested data', () => {
      const data = {
        user: {
          profile: {
            name: 'John',
          },
        },
      }

      expect(hasDataAtPath(data, 'user')).toBe(true)
      expect(hasDataAtPath(data, 'user.profile')).toBe(true)
      expect(hasDataAtPath(data, 'user.profile.name')).toBe(true)
    })

    it('returns false for non-existing paths', () => {
      const data = {
        user: {
          profile: {
            name: 'John',
          },
        },
      }

      expect(hasDataAtPath(data, 'user.address')).toBe(false)
      expect(hasDataAtPath(data, 'user.profile.email')).toBe(false)
      expect(hasDataAtPath(data, 'nonexistent')).toBe(false)
    })

    it('returns false for null and undefined values', () => {
      const data = {
        user: null,
        profile: undefined,
        active: false,
      }

      expect(hasDataAtPath(data, 'user')).toBe(false)
      expect(hasDataAtPath(data, 'profile')).toBe(false)
      expect(hasDataAtPath(data, 'active')).toBe(true) // false is valid data
    })

    it('handles array notation in paths', () => {
      const data = {
        items: [
          { name: 'item1' },
          { name: 'item2' },
        ],
      }

      expect(hasDataAtPath(data, 'items[0]')).toBe(true)
      expect(hasDataAtPath(data, 'items[0].name')).toBe(true)
      expect(hasDataAtPath(data, 'items[1]')).toBe(true)
      expect(hasDataAtPath(data, 'items[2]')).toBe(false)
    })

    it('handles empty objects and arrays', () => {
      const data = {
        emptyObj: {},
        emptyArr: [],
        zero: 0,
        emptyString: '',
      }

      expect(hasDataAtPath(data, 'emptyObj')).toBe(true)
      expect(hasDataAtPath(data, 'emptyArr')).toBe(true)
      expect(hasDataAtPath(data, 'zero')).toBe(true)
      expect(hasDataAtPath(data, 'emptyString')).toBe(true)
    })

    it('handles complex nested paths', () => {
      const data = {
        users: [
          {
            profile: {
              contacts: {
                email: 'test@example.com',
              },
            },
          },
        ],
      }

      expect(hasDataAtPath(data, 'users[0].profile.contacts.email')).toBe(true)
      expect(hasDataAtPath(data, 'users[0].profile.contacts.phone')).toBe(false)
    })
  })
})
