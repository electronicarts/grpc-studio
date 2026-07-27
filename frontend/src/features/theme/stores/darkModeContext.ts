// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { createContext } from 'react'

export interface DarkModeContextValue {
  darkMode: boolean
  toggleDarkMode: () => void
}

export const DarkModeContext = createContext<DarkModeContextValue | null>(null)
