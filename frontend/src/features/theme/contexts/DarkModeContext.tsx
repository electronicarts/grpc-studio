// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'darkMode'

interface DarkModeContextValue {
  darkMode: boolean
  toggleDarkMode: () => void
}

const DarkModeContext = createContext<DarkModeContextValue | null>(null)

export function useDarkModeContext(): DarkModeContextValue {
  const context = useContext(DarkModeContext)
  if (!context) {
    throw new Error('useDarkModeContext must be used within DarkModeProvider')
  }
  return context
}

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  })

  useEffect(() => {
    const isDark = localStorage.getItem(STORAGE_KEY) === 'true'
    setDarkMode(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next.toString())
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
