// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useState, useEffect, useCallback, useRef } from 'react'
import type { DescMessage } from '@bufbuild/protobuf'
import type { GrpcMethod } from '../../../types/grpc'
import { schemaCache } from '../../schemaLoader/lib/schemaCache'
import { canonicalizeProtoJson } from '../utils/payload'
import type { RequestModel } from '../types'
import type { TabRequestSnapshot } from '@/stores'

export function useRequestModel(
  selectedTarget: string,
  selectedMethod: GrpcMethod | null,
  initialRequestBody?: Record<string, unknown> | null,
  restored?: TabRequestSnapshot
): RequestModel {
  const [body, setBody] = useState<string>(
    restored?.body ?? (initialRequestBody ? JSON.stringify(initialRequestBody, null, 2) : '{}')
  )
  const [formData, setFormData] = useState<Record<string, unknown>>(restored?.formData ?? initialRequestBody ?? {})
  const [formKey, setFormKey] = useState(restored?.formKey ?? 0)
  const [isFormMode, setIsFormMode] = useState(restored?.isFormMode ?? true)
  const [schema, setSchema] = useState<DescMessage | null>(restored?.schema ?? null)
  const [loadingSchema, setLoadingSchema] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(restored?.validationError ?? null)
  // When rehydrating a tab the initial body was already canonicalized on first
  // mount, so don't run it again (it would clobber the user's edits).
  const initialRequestCanonicalizedRef = useRef(restored != null)
  // Captured once: was this hook mounted with a restored snapshot? Read inside
  // the schema-load effect without widening its deps.
  const restoredOnMountRef = useRef(restored != null)

  const canonicalizeRequestData = useCallback((data: Record<string, unknown>) => {
    return canonicalizeProtoJson(data, schema, { target: selectedTarget })
  }, [schema, selectedTarget])

  const firstSchemaLoadRef = useRef(true)
  useEffect(() => {
    if (!selectedMethod?.inputType) return
    // Skip re-canonicalizing on the very first load of a restored tab — its
    // body was already canonicalized before it was snapshotted.
    if (!(firstSchemaLoadRef.current && restoredOnMountRef.current)) {
      initialRequestCanonicalizedRef.current = false
    }
    firstSchemaLoadRef.current = false

    const cached = schemaCache.getCachedSchema(selectedTarget, selectedMethod.inputType)
    if (cached) {
      setSchema(cached)
      setLoadingSchema(false)
      return
    }
    setLoadingSchema(true)
    schemaCache.getSchema(selectedTarget, selectedMethod.inputType).then(desc => {
      setSchema(desc)
      setLoadingSchema(false)
    })
  }, [selectedTarget, selectedMethod?.inputType])

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
