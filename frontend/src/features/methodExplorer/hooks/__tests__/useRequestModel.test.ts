// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useRequestModel } from '@/features/methodExplorer/hooks/useRequestModel'
import { allScalarsSchema } from '@/test/protoMessageRenderer.fixtures'

describe('useRequestModel JSON view', () => {
  it('holds exactly the fields set in the form, including plain proto3 fields at their default value', () => {
    const { result } = renderHook(() =>
      useRequestModel('', null, null, {
        body: '{}',
        formData: { stringField: 'hello', boolField: false },
        formKey: 0,
        isFormMode: true,
        schema: allScalarsSchema,
        validationError: null,
        metadataRows: [],
      }),
    )

    act(() => result.current.toggleMode(false))

    expect(JSON.parse(result.current.body)).toEqual({ stringField: 'hello', boolField: false })
  })

  it('keeps those fields when switching back to the form', () => {
    const { result } = renderHook(() =>
      useRequestModel('', null, null, {
        body: '{ "int32Field": 0, "stringField": "" }',
        formData: {},
        formKey: 0,
        isFormMode: false,
        schema: allScalarsSchema,
        validationError: null,
        metadataRows: [],
      }),
    )

    act(() => result.current.toggleMode(true))

    expect(result.current.formData).toEqual({ int32Field: 0, stringField: '' })
  })
})
