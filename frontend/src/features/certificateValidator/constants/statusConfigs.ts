// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { CertificateStatusType } from '../types'
import type { StatusConfig } from '../types'

export const statusConfigs: Record<CertificateStatusType, StatusConfig> = {
  valid: {
    tone: 'success',
    label: 'Certificate Valid'
  },
  warning: {
    tone: 'warning',
    label: 'Expiring Soon'
  },
  critical: {
    tone: 'critical',
    label: 'Expires in < 7 days'
  },
  expired: {
    tone: 'danger',
    label: 'Certificate Expired'
  },
  unreadable: {
    tone: 'neutral',
    label: 'Certificate Unreadable'
  },
  unknown: {
    tone: 'neutral',
    label: 'Certificate Status Unknown'
  }
}
