// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useState, useCallback } from 'react'
import type { DescMessage } from '@bufbuild/protobuf'
import type { ResponseModel } from '../types'
import type { TabResponseSnapshot } from '@/stores'

export function useResponseModel(restored?: TabResponseSnapshot): ResponseModel {
  const [raw, setRaw] = useState(restored?.raw ?? '')
  const [data, setData] = useState<unknown>(restored?.data ?? null)
  const [time, setTime] = useState<number | null>(restored?.time ?? null)
  const [size, setSize] = useState<number | null>(restored?.size ?? null)
  const [schema, setSchema] = useState<DescMessage | null>(restored?.schema ?? null)
  const [isFormMode, setFormMode] = useState(restored?.isFormMode ?? false)
  const [singleExpanded, setSingleExpanded] = useState(restored?.singleExpanded ?? true)

  const clear = useCallback(() => {
    setRaw('')
    setData(null)
    setTime(null)
    setSize(null)
    setSchema(null)
  }, [])

  return {
    raw, data, time, size, schema, isFormMode, singleExpanded,
    setRaw, setData, setTime, setSize, setSchema, setFormMode, setSingleExpanded,
    clear,
  }
}
