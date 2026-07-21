// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function formatDate(dateString?: string): string {
  if (!dateString) return 'Unknown'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.toLocaleTimeString()} - ${d.toLocaleDateString()}`
}
