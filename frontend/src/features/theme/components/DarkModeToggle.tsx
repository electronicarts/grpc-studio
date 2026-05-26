// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { Moon, Sun } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useDarkMode } from '../hooks/useDarkMode'

export function DarkModeToggle() {
  const { darkMode, toggleDarkMode } = useDarkMode()

  return (
    <div className="flex items-center space-x-2">
      <Sun className="h-4 w-4" />
      <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
      <Moon className="h-4 w-4" />
    </div>
  )
}
