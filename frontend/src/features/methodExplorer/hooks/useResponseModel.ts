// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useState, useCallback } from 'react'
import type { DescMessage } from '@bufbuild/protobuf'
import type { ResponseModel } from '../types'

export function useResponseModel(): ResponseModel {
  const [raw, setRaw] = useState('')
  const [data, setData] = useState<unknown>(null)
  const [time, setTime] = useState<number | null>(null)
  const [size, setSize] = useState<number | null>(null)
  const [schema, setSchema] = useState<DescMessage | null>(null)
  const [isFormMode, setFormMode] = useState(false)
  const [singleExpanded, setSingleExpanded] = useState(true)

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
