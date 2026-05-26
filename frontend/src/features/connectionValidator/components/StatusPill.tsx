// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { useConnectionStatus } from '../hooks/useConnectionStatus'

const StatusPill: React.FC = () => {
  const status = useConnectionStatus()

  return (
    <footer className="fixed bottom-0 inset-x-0 z-50 border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="flex items-center justify-end space-x-3 px-8 py-2.5">
        {status.loading ? (
          <>
            <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></div>
            <span className="text-base font-medium text-gray-700 dark:text-gray-300">Connecting</span>
            {status.targetServer && (
              <span className="text-base text-gray-500 dark:text-gray-400">to {status.targetServer}</span>
            )}
          </>
        ) : status.error ? (
          <>
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-base font-medium text-red-700 dark:text-red-400">Disconnected</span>
            {status.targetServer && (
              <span className="text-base text-gray-500 dark:text-gray-400">from {status.targetServer}</span>
            )}
          </>
        ) : status.servicesCount > 0 ? (
          <>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-base font-medium text-green-700 dark:text-green-400">Connected</span>
            {status.targetServer && (
              <span className="text-base text-gray-500 dark:text-gray-400">to {status.targetServer}</span>
            )}
            <span className="text-base text-gray-500 dark:text-gray-400">•</span>
            <span className="text-base text-gray-600 dark:text-gray-400">{status.servicesCount} service{status.servicesCount !== 1 ? 's' : ''}</span>
          </>
        ) : (
          <>
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <span className="text-base font-medium text-gray-500 dark:text-gray-400">Ready</span>
          </>
        )}
      </div>
    </footer>
  )
}

export default StatusPill
