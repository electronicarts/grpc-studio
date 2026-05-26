// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React, { useState } from 'react'
import { Shield, ShieldAlert, ShieldX, ShieldCheck, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useCertificateStatus } from '../hooks/useCertificateStatus'
import type { CertificateStatusType } from '../types'
import { CertificateDetails } from './CertificateDetails'

interface CertificateStatusProps {
  className?: string
}

const statusIcons: Record<CertificateStatusType, React.ElementType> = {
  valid: ShieldCheck,
  warning: ShieldAlert,
  critical: ShieldAlert,
  expired: ShieldX,
  unreadable: Shield,
  unknown: Shield,
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
      <div className={cn('flex items-center gap-2 text-gray-500', className)} data-testid="certificateStatus-loading">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs">Checking cert...</span>
      </div>
    )
  }

  if (!configured) {
    return null
  }

  const config = getStatusConfig()
  const Icon = statusIcons[certInfo?.status || 'unknown']

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:shadow-sm cursor-pointer',
          config.bgColor,
          config.borderColor,
          config.color,
        )}
        data-testid="certificateStatus-triggerButton"
      >
        <Icon className="w-4 h-4" />
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
