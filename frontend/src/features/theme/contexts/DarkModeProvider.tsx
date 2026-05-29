// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { ReactNode, useState, useEffect, useCallback } from 'react'
import { DarkModeContext } from './darkModeContext'

const STORAGE_KEY = 'darkMode'

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
