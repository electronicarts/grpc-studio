// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { ReactNode } from 'react'
import { DarkModeProvider } from '@/features/theme'

export function TestWrapper({ children }: { children: ReactNode }) {
  return <DarkModeProvider>{children}</DarkModeProvider>
}
