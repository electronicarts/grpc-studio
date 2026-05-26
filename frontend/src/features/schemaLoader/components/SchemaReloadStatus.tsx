// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { RefreshCw, CheckCircle, XCircle, Database } from 'lucide-react'
import { formatTime } from '../../../utils/dateFormatters'
import { STATUS_TONES } from '../../../utils/statusStyles'

interface SchemaReloadStatusProps {
  lastFetchedAt: Date | null
  lastReloadSuccess: boolean | null
  reloading: boolean
  onReload: () => void
}

function getStatusStyle(reloading: boolean, lastReloadSuccess: boolean | null) {
  if (reloading) return STATUS_TONES.blue
  if (lastReloadSuccess === false) return STATUS_TONES.red
  if (lastReloadSuccess === true) return STATUS_TONES.green
  return STATUS_TONES.gray
}

export function SchemaReloadStatus({ lastFetchedAt, lastReloadSuccess, reloading, onReload }: SchemaReloadStatusProps) {
  const style = getStatusStyle(reloading, lastReloadSuccess)

  const Icon = reloading
    ? RefreshCw
    : lastReloadSuccess === false
      ? XCircle
      : lastReloadSuccess === true
        ? CheckCircle
        : Database

  const label = reloading
    ? 'Syncing…'
    : lastReloadSuccess === false
      ? `Sync failed ${lastFetchedAt ? formatTime(lastFetchedAt) : ''}`
      : lastFetchedAt
        ? `Last synced ${formatTime(lastFetchedAt)}`
        : 'Sync Schemas'

  return (
    <button
      onClick={onReload}
      disabled={reloading}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all
        ${style.bgColor} ${style.borderColor} ${style.color}
        hover:shadow-sm cursor-pointer disabled:cursor-wait`}
      title="Sync schemas from server"
    >
      <Icon className={`w-4 h-4 ${reloading ? 'animate-spin' : ''}`} />
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}
