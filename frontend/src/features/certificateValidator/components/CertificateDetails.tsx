// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { TONES, type Tone } from '@/utils/tones'
import { formatDate } from '@/utils/dateFormatters'
import type { CertificateInfo, StatusConfig } from '../types'

interface CertificateDetailsProps {
  certInfo: CertificateInfo
  config: StatusConfig
  formatTimeRemaining: () => string | null
  onClose: () => void
}

/** Map an expiry state to the shared tone, or null when it should stay neutral. */
function expiryTone(certInfo: CertificateInfo): Tone | null {
  if (certInfo.status === 'unreadable') return null
  if (certInfo.isExpired) return 'danger'
  if (certInfo.isExpiringSoon) return 'warning'
  return 'success'
}

function getExpiryTextClass(certInfo: CertificateInfo): string {
  const tone = expiryTone(certInfo)
  if (!tone) return ''
  // Valid certs keep the default foreground; only danger/warning are emphasized.
  return tone === 'success' ? 'text-foreground' : TONES[tone].text
}

function getTimeRemainingClass(certInfo: CertificateInfo): string {
  const tone = expiryTone(certInfo)
  if (!tone) return ''
  return cn(TONES[tone].bg, TONES[tone].text)
}

export function CertificateDetails({
  certInfo,
  config,
  formatTimeRemaining,
  onClose,
}: CertificateDetailsProps) {
  const readableCert = certInfo.status !== 'unreadable' ? certInfo : null
  const unreadableError = certInfo.status === 'unreadable' ? certInfo.error : null
  const tone = TONES[config.tone]

  return (
    <div
      className={cn(
        'fixed right-4 top-auto z-[9999] mt-2 max-h-[80vh] w-80 overflow-y-auto rounded-lg border bg-card shadow-xl',
        tone.bg,
        tone.border,
      )}
      data-testid="certificateStatus-details"
    >
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h4 className={cn('font-semibold', tone.text)}>mTLS Certificate</h4>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            data-testid="certificateStatus-closeButton"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-2 text-sm">
          {readableCert?.subject && (
            <div>
              <span className="text-muted-foreground">Subject: </span>
              <span className="break-all font-mono text-xs text-foreground">
                {readableCert.subject}
              </span>
            </div>
          )}

          {readableCert && (
            <>
              <div>
                <span className="text-muted-foreground">Valid From: </span>
                <span className="text-foreground">
                  {formatDate(readableCert.validFrom)}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground">Expires: </span>
                <span className={cn('font-medium', getExpiryTextClass(readableCert))}>
                  {formatDate(readableCert.validTo)}
                </span>
              </div>
            </>
          )}

          {readableCert?.daysRemaining !== null && readableCert?.daysRemaining !== undefined && (
            <div className={cn('mt-2 rounded p-2', getTimeRemainingClass(readableCert))}>
              <span className="text-sm font-medium">{formatTimeRemaining()}</span>
            </div>
          )}

          {unreadableError && (
            <div className={cn('mt-2 rounded p-2', TONES.danger.bg)}>
              <span className={cn('text-sm', TONES.danger.text)}>
                Error: {unreadableError}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
