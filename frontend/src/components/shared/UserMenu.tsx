// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { LogIn, LogOut, User, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Spinner } from '@/components/ui/spinner'
import { useUserMenu } from '@/features/auth'

function UserMenu() {
  const {
    closeMenu,
    isAuthenticated,
    isLoading,
    isLoggingIn,
    isLoggingOut,
    isOpen,
    isSsoEnabled,
    loginUser,
    logoutUser,
    toggleMenu,
    user,
  } = useUserMenu()

  if (!isSsoEnabled) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 text-sm text-muted-foreground" data-testid="userMenu-loading">
        <Spinner size={4} tone="primary" />
        <span>Loading...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={loginUser}
        disabled={isLoggingIn}
        className="flex items-center space-x-2 rounded-md bg-primary px-3 py-1.5 
                   text-sm font-medium text-primary-foreground transition-colors
                   hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="userMenu-loginButton"
      >
        {isLoggingIn ? (
          <>
            <Spinner size={4} tone="onAccent" />
            <span>Signing in...</span>
          </>
        ) : (
          <>
            <LogIn className="size-4" />
            <span>Sign In</span>
          </>
        )}
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={toggleMenu}
        className="flex items-center space-x-2 rounded-md bg-muted px-3 py-1.5
                   text-sm font-medium transition-colors hover:bg-accent"
        data-testid="userMenu-triggerButton"
      >
        <div className="flex size-6 items-center justify-center rounded-full bg-primary/20">
          <User className="size-4 text-primary" />
        </div>
        <span className="max-w-[150px] truncate">{user?.name || user?.email || 'User'}</span>
        <ChevronDown className={cn('size-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={closeMenu}
            data-testid="userMenu-backdrop"
          />
          
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border
                          border-input bg-popover shadow-lg"
          >
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-medium text-foreground">
                {user?.name || 'User'}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email}
              </p>
            </div>

            <div className="py-1">
              <button
                onClick={logoutUser}
                disabled={isLoggingOut}
                className="flex w-full items-center space-x-2 px-4 py-2 text-sm text-foreground/90
                           hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="userMenu-logoutButton"
              >
                {isLoggingOut ? (
                  <>
                    <Spinner size={4} tone="primary" />
                    <span>Signing out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="size-4" />
                    <span>Sign Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default UserMenu
