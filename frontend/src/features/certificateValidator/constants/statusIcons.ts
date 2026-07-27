// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { ElementType } from 'react'
import { Shield, ShieldAlert, ShieldX, ShieldCheck } from 'lucide-react'
import type { CertificateStatusType } from '../types'

/**
 * Canonical mapping from certificate status to its lucide icon.
 * Shared by every component that renders a certificate indicator.
 */
export const statusIcons: Record<CertificateStatusType, ElementType> = {
  valid: ShieldCheck,
  warning: ShieldAlert,
  critical: ShieldAlert,
  expired: ShieldX,
  unreadable: Shield,
  unknown: Shield,
}
