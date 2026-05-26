// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useEffect, useState, useCallback } from 'react'

const STORAGE_KEY = 'darkMode'

export function useDarkMode() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const isDark = localStorage.getItem(STORAGE_KEY) === 'true'
    setDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next.toString())
      document.documentElement.classList.toggle('dark', next)
      return next
    })
  }, [])

  return { darkMode, toggleDarkMode }
}
