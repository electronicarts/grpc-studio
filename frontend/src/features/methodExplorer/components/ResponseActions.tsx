// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React, { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check, Download } from 'lucide-react'
import { useCopyToClipboard } from '../../../utils/useCopyToClipboard'

interface ResponseActionsProps {
  raw: string
  serviceName?: string
  methodName?: string
}

const ResponseActions: React.FC<ResponseActionsProps> = ({
  raw, serviceName, methodName,
}) => {
  const { copied, copy } = useCopyToClipboard()

  const copyResponse = useCallback(() => {
    copy(raw)
  }, [raw, copy])

  const downloadResponse = useCallback(() => {
    const blob = new Blob([raw], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${serviceName || 'response'}_${methodName || 'method'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [raw, serviceName, methodName])

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7 rounded-full px-3"
        onClick={copyResponse}
      >
        {copied ? <Check className="mr-1 size-3 text-success" /> : <Copy className="mr-1 size-3" />}
        {copied ? 'Copied!' : 'Copy'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-7 rounded-full px-3"
        onClick={downloadResponse}
      >
        <Download className="mr-1 size-3" />
        Save
      </Button>
    </>
  )
}

export default ResponseActions
