// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Central tone system — the single source of truth for status/accent colors.
 *
 * Every tone is built on the semantic CSS tokens defined in globals.css
 * (--danger, --success, --warning, --critical, --info, --brand). Those tokens
 * carry their own light/dark values and flip automatically via the `.dark`
 * class, so the class strings here deliberately contain NO `dark:` variants —
 * the pairing lives in one place (globals.css), not scattered across components.
 *
 * Prefer routing through shared components (AlertPanel, StatusBadge, StatusDot)
 * or referencing TONES[tone] directly instead of hand-writing color classes.
 */

export type Tone =
  | 'danger'
  | 'success'
  | 'warning'
  | 'critical'
  | 'info'
  | 'brand'
  | 'neutral'

export interface ToneClasses {
  /** Foreground text/icon in the tone color. */
  text: string
  /** Soft tinted surface background (cards, panels, badges). */
  bg: string
  /** Solid fill in the tone color (status dots, emphasis pills). */
  bgSolid: string
  /** Tinted border matching the tone. */
  border: string
  /** Focus ring in the tone color. */
  ring: string
}

export const TONES: Record<Tone, ToneClasses> = {
  danger: {
    text: 'text-danger',
    bg: 'bg-danger/10',
    bgSolid: 'bg-danger',
    border: 'border-danger/30',
    ring: 'ring-danger',
  },
  success: {
    text: 'text-success',
    bg: 'bg-success/10',
    bgSolid: 'bg-success',
    border: 'border-success/30',
    ring: 'ring-success',
  },
  warning: {
    text: 'text-warning',
    bg: 'bg-warning/10',
    bgSolid: 'bg-warning',
    border: 'border-warning/30',
    ring: 'ring-warning',
  },
  critical: {
    text: 'text-critical',
    bg: 'bg-critical/10',
    bgSolid: 'bg-critical',
    border: 'border-critical/30',
    ring: 'ring-critical',
  },
  info: {
    text: 'text-info',
    bg: 'bg-info/10',
    bgSolid: 'bg-info',
    border: 'border-info/30',
    ring: 'ring-info',
  },
  brand: {
    text: 'text-brand',
    bg: 'bg-brand/10',
    bgSolid: 'bg-brand',
    border: 'border-brand/30',
    ring: 'ring-brand',
  },
  neutral: {
    text: 'text-muted-foreground',
    bg: 'bg-muted',
    bgSolid: 'bg-muted-foreground',
    border: 'border-border',
    ring: 'ring-ring',
  },
}
