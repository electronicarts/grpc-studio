// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import UserMenu from '@/components/shared/UserMenu'
import { DarkModeToggle } from '@/features/theme'
import { requestHomeNavigation } from '@/utils/homeNavigation'

export function AppHeader() {
  return (
    <header className="border-b">
      <div className="px-6 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={requestHomeNavigation}
          className="flex items-center space-x-2 rounded-md text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
          aria-label="Go to gRPC Studio home"
        >
          <img src="/logo.svg" alt="gRPC Studio" className="h-7 w-7" />
          <h1 className="text-2xl font-bold">gRPC Studio</h1>
        </button>
        <div className="flex items-center space-x-4">
          <UserMenu />
          <DarkModeToggle />
        </div>
      </div>
    </header>
  )
}
