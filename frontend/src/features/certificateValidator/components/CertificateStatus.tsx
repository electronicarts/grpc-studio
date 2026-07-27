// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React, { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { TONES } from '@/utils/tones'
import { useCertificateStatus } from '../hooks/useCertificateStatus'
import { statusIcons } from '../constants/statusIcons'
import { CertificateDetails } from './CertificateDetails'

interface CertificateStatusProps {
  className?: string
}

const CertificateStatus: React.FC<CertificateStatusProps> = ({ 
  className = ''
}) => {
  const {
    loading,
    configured,
    certificate: certInfo,
    formatTimeRemaining,
    getShortDisplay,
    getStatusConfig,
  } = useCertificateStatus()

  const [expanded, setExpanded] = useState(false)

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)} data-testid="certificateStatus-loading">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-xs">Checking cert...</span>
      </div>
    )
  }

  if (!configured) {
    return null
  }

  const config = getStatusConfig()
  const tone = TONES[config.tone]
  const Icon = statusIcons[certInfo?.status || 'unknown']

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 transition-all hover:shadow-sm',
          tone.bg,
          tone.border,
          tone.text,
        )}
        data-testid="certificateStatus-triggerButton"
      >
        <Icon className="size-4" />
        <span className="text-xs font-medium">
          {getShortDisplay()}
        </span>
      </button>

      {expanded && certInfo && (
        <CertificateDetails
          certInfo={certInfo}
          config={config}
          formatTimeRemaining={formatTimeRemaining}
          onClose={() => setExpanded(false)}
        />
      )}
    </div>
  )
}

export default CertificateStatus
