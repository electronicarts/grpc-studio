// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/dateFormatters'
import type { CertificateInfo, StatusConfig } from '../types'

interface CertificateDetailsProps {
  certInfo: CertificateInfo
  config: StatusConfig
  formatTimeRemaining: () => string | null
  onClose: () => void
}

function getExpiryTextClass(certInfo: CertificateInfo): string {
  if (certInfo.status === 'unreadable') return ''
  if (certInfo.isExpired) return 'text-red-600 dark:text-red-400'
  if (certInfo.isExpiringSoon) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-gray-900 dark:text-gray-100'
}

function getTimeRemainingClass(certInfo: CertificateInfo): string {
  if (certInfo.status === 'unreadable') return ''
  if (certInfo.isExpired) return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
  if (certInfo.isExpiringSoon) return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
  return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
}

export function CertificateDetails({
  certInfo,
  config,
  formatTimeRemaining,
  onClose,
}: CertificateDetailsProps) {
  const readableCert = certInfo.status !== 'unreadable' ? certInfo : null
  const unreadableError = certInfo.status === 'unreadable' ? certInfo.error : null

  return (
    <div
      className={cn(
        'fixed top-auto right-4 mt-2 w-80 rounded-lg border shadow-xl z-[9999] max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-900',
        config.bgColor,
        config.borderColor,
      )}
      data-testid="certificateStatus-details"
    >
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className={cn('font-semibold', config.color)}>mTLS Certificate</h4>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            data-testid="certificateStatus-closeButton"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-sm">
          {readableCert?.subject && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Subject: </span>
              <span className="text-gray-900 dark:text-gray-100 font-mono text-xs break-all">
                {readableCert.subject}
              </span>
            </div>
          )}

          {readableCert && (
            <>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Valid From: </span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatDate(readableCert.validFrom)}
                </span>
              </div>

              <div>
                <span className="text-gray-500 dark:text-gray-400">Expires: </span>
                <span className={cn('font-medium', getExpiryTextClass(readableCert))}>
                  {formatDate(readableCert.validTo)}
                </span>
              </div>
            </>
          )}

          {readableCert?.daysRemaining !== null && readableCert?.daysRemaining !== undefined && (
            <div className={cn('mt-2 p-2 rounded', getTimeRemainingClass(readableCert))}>
              <span className="text-sm font-medium">{formatTimeRemaining()}</span>
            </div>
          )}

          {unreadableError && (
            <div className="mt-2 p-2 rounded bg-red-100 dark:bg-red-900/50">
              <span className="text-sm text-red-700 dark:text-red-300">
                Error: {unreadableError}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
