// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Authentication Module Exports
 */

export { AuthProvider } from '@/features/auth/components/AuthProvider'

export { useAuth } from '@/features/auth/hooks/useAuth'
export { useAutoLogin } from '@/features/auth/hooks/useAutoLogin'
export { useUserMenu } from '@/features/auth/hooks/useUserMenu'

export { initializeAuthFromYaml } from '@/features/auth/api/authInitializer'
