// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { CertificateStatusType } from '../types'
import type { StatusConfig } from '../types'
import { STATUS_TONES } from '../../../utils/statusStyles'

export const statusConfigs: Record<CertificateStatusType, StatusConfig> = {
  valid: {
    ...STATUS_TONES.green,
    label: 'Certificate Valid'
  },
  warning: {
    ...STATUS_TONES.yellow,
    label: 'Expiring Soon'
  },
  critical: {
    ...STATUS_TONES.orange,
    label: 'Expires in < 7 days'
  },
  expired: {
    ...STATUS_TONES.red,
    label: 'Certificate Expired'
  },
  unreadable: {
    ...STATUS_TONES.gray,
    label: 'Certificate Unreadable'
  },
  unknown: {
    ...STATUS_TONES.gray,
    label: 'Certificate Status Unknown'
  }
}
