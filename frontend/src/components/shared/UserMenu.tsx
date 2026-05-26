// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { LogIn, LogOut, User, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useUserMenu } from './useUserMenu'

export function UserMenu() {
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
      <div className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-500" data-testid="userMenu-loading">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
        <span>Loading...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={loginUser}
        disabled={isLoggingIn}
        className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium 
                   bg-primary text-primary-foreground rounded-md hover:bg-primary/90
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        data-testid="userMenu-loginButton"
      >
        {isLoggingIn ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Signing in...</span>
          </>
        ) : (
          <>
            <LogIn className="w-4 h-4" />
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
        className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium
                   bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 
                   dark:hover:bg-gray-700 transition-colors"
        data-testid="userMenu-triggerButton"
      >
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
        <span className="max-w-[150px] truncate">{user?.name || user?.email || 'User'}</span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={closeMenu}
            data-testid="userMenu-backdrop"
          />
          
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg 
                          shadow-lg border border-gray-200 dark:border-gray-700 z-50"
          >
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.email}
              </p>
            </div>

            <div className="py-1">
              <button
                onClick={logoutUser}
                disabled={isLoggingOut}
                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 
                           dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700
                           disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="userMenu-logoutButton"
              >
                {isLoggingOut ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                    <span>Signing out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
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
