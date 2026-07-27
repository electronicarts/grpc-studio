// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useState } from 'react'
import { useAuth } from '@/features/auth'
import { createLogger } from '@/utils/debugLogger'

const logger = createLogger('UserMenu')

export function useUserMenu() {
  const { isAuthenticated, isLoading, user, login, logout, isSsoEnabled } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const closeMenu = () => setIsOpen(false)
  const toggleMenu = () => setIsOpen((current) => !current)

  const loginUser = async () => {
    setIsLoggingIn(true)
    try {
      await login()
    } catch (error) {
      logger.error('Login error:', error)
    } finally {
      setIsLoggingIn(false)
    }
  }

  const logoutUser = async () => {
    setIsLoggingOut(true)
    closeMenu()

    try {
      await logout()
    } catch (error) {
      logger.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return {
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
  }
}
