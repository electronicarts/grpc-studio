// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useContext } from 'react'
import { DarkModeContext, type DarkModeContextValue } from '../stores/darkModeContext'

export function useDarkMode(): DarkModeContextValue {
  const context = useContext(DarkModeContext)
  if (!context) {
    throw new Error('useDarkMode must be used within DarkModeProvider')
  }
  return context
}
