// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { ChevronRight, Server } from 'lucide-react'
import type { ServiceItemProps } from '../types'

const ServiceItem: React.FC<ServiceItemProps> = ({ service, isSelected, isExpanded, onToggle, children }) => {
  const displayName = service.name ?? service.fullName.split('.').pop() ?? service.fullName

  return (
    <div>
      <button
        className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
        }`}
        onClick={() => onToggle(service)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              isSelected ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              <Server className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">{displayName}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{service.methods.length} methods</p>
            </div>
          </div>
          <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-90' : ''
          }`} />
        </div>
      </button>

      {isExpanded && children && (
        <div className="mt-3 ml-6 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  )
}

export default ServiceItem
