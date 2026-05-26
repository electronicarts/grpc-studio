// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'

interface SchemaLoadingScreenProps {
  targetServer: string
}

const SchemaLoadingScreen: React.FC<SchemaLoadingScreenProps> = ({ targetServer }) => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="flex items-center justify-center h-96">
        <div className="text-center w-full max-w-md px-8">
          <img src="/logo.svg" alt="gRPC Studio" className="w-16 h-16 mx-auto mb-6 rounded-2xl animate-pulse" />
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">Connecting to gRPC Server</h3>
          <p className="text-lg text-gray-600 dark:text-gray-400 mx-auto mb-6">
            {targetServer
              ? `Discovering services on ${targetServer}`
              : 'Establishing connection...'}
          </p>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div className="bg-blue-500 h-2 rounded-full w-1/3 animate-[indeterminate_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SchemaLoadingScreen
