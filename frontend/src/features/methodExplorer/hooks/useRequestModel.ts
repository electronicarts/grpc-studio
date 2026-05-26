// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useState, useEffect, useCallback, useRef } from 'react'
import type { DescMessage } from '@bufbuild/protobuf'
import type { GrpcMethod } from '../../../types/grpc'
import { schemaCache } from '../../schemaLoader/lib/schemaCache'
import { canonicalizeProtoJson } from '../utils/payload'
import type { RequestModel } from '../types'

export function useRequestModel(
  selectedMethod: GrpcMethod | null,
  initialRequestBody?: Record<string, unknown> | null
): RequestModel {
  const [body, setBody] = useState<string>(
    initialRequestBody ? JSON.stringify(initialRequestBody, null, 2) : '{}'
  )
  const [formData, setFormData] = useState<Record<string, unknown>>(initialRequestBody ?? {})
  const [formKey, setFormKey] = useState(0)
  const [isFormMode, setIsFormMode] = useState(true)
  const [schema, setSchema] = useState<DescMessage | null>(null)
  const [loadingSchema, setLoadingSchema] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const initialRequestCanonicalizedRef = useRef(false)

  const canonicalizeRequestData = useCallback((data: Record<string, unknown>) => {
    return canonicalizeProtoJson(data, schema)
  }, [schema])

  useEffect(() => {
    if (!selectedMethod?.inputType) return
    initialRequestCanonicalizedRef.current = false

    const cached = schemaCache.getCachedSchema(selectedMethod.inputType)
    if (cached) {
      setSchema(cached)
      setLoadingSchema(false)
      return
    }
    setLoadingSchema(true)
    schemaCache.getSchema(selectedMethod.inputType).then(desc => {
      setSchema(desc)
      setLoadingSchema(false)
    })
  }, [selectedMethod?.inputType])

  useEffect(() => {
    if (!schema || !initialRequestBody || initialRequestCanonicalizedRef.current) return

    try {
      const canonical = canonicalizeRequestData(initialRequestBody)
      setFormData(canonical)
      setBody(JSON.stringify(canonical, null, 2))
      setFormKey(prev => prev + 1)
      setValidationError(null)
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Invalid request payload')
    } finally {
      initialRequestCanonicalizedRef.current = true
    }
  }, [canonicalizeRequestData, initialRequestBody, schema])

  const syncFormToJson = useCallback(() => {
    try {
      const canonical = canonicalizeRequestData(formData)
      setBody(JSON.stringify(canonical, null, 2))
      setValidationError(null)
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Invalid request payload')
    }
  }, [canonicalizeRequestData, formData])

  const toggleMode = useCallback((checked: boolean) => {
    if (checked && !isFormMode) {
      try {
        const sanitized = body.trim().replace(/[\u200B-\u200D\uFEFF]/g, '')
        const parsed = JSON.parse(sanitized)
        const canonical = canonicalizeRequestData({ ...parsed })
        setFormData(canonical)
        setBody(JSON.stringify(canonical, null, 2))
        setFormKey(prev => prev + 1)
        setValidationError(null)
      } catch (error) {
        setFormData({})
        setFormKey(prev => prev + 1)
        setValidationError(error instanceof Error ? error.message : 'Invalid request JSON')
      }
    } else if (!checked && isFormMode) {
      syncFormToJson()
    }
    setIsFormMode(checked)
  }, [isFormMode, body, canonicalizeRequestData, syncFormToJson])

  const reset = useCallback(() => {
    setBody('{}')
    setFormData({})
    setFormKey(prev => prev + 1)
    setValidationError(null)
  }, [])

  const clear = useCallback(() => {
    setBody('{}')
    setFormData({})
    setFormKey(prev => prev + 1)
    setSchema(null)
    setValidationError(null)
  }, [])

  return {
    body, formData, formKey, isFormMode, schema, loadingSchema, validationError,
    setBody, setFormData, toggleMode, reset, clear,
  }
}
