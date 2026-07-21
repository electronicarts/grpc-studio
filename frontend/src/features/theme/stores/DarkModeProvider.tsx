// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { ReactNode, useState, useEffect, useCallback } from 'react'
import { safeGetJSON, safeSetJSON } from '@/utils/storageHelpers'
import { DarkModeContext } from './darkModeContext'

const STORAGE_KEY = 'darkMode'

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(() => safeGetJSON<boolean>(STORAGE_KEY) === true)

  useEffect(() => {
    const isDark = safeGetJSON<boolean>(STORAGE_KEY) === true
    setDarkMode(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev
      safeSetJSON(STORAGE_KEY, next)
      document.documentElement.classList.toggle('dark', next)
      return next
    })
  }, [])

  return (
    <DarkModeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  )
}
