// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React, { useState, useMemo, useCallback, useSyncExternalStore } from 'react'
import { Server } from 'lucide-react'
import ServiceItem from './ServiceItem'
import MethodItem from './MethodItem'
import type { ServiceExplorerProps } from '../types'
import type { GrpcService } from '../../../types/grpc'
import { schemaCache } from '../../schemaLoader/lib/schemaCache'

function serviceLabel(service: GrpcService): string {
  return service.name ?? service.fullName.split('.').pop() ?? service.fullName
}

const ServiceExplorer: React.FC<ServiceExplorerProps> = ({
  selectedService,
  selectedMethod,
  onServiceSelect,
  onMethodSelect,
}) => {
  const services = useSyncExternalStore(
    (cb) => schemaCache.subscribe(cb),
    () => schemaCache.getServices()
  )
  const [expandedService, setExpandedService] = useState<string | null>(null)

  React.useEffect(() => {
    if (!selectedService) setExpandedService(null)
  }, [selectedService])

  const toggleService = useCallback((service: GrpcService) => {
    setExpandedService(prev => {
      if (prev === service.fullName) return null
      onServiceSelect(service)
      return service.fullName
    })
  }, [onServiceSelect])

  const sortedServices = useMemo(
    () => [...services].sort((a, b) => serviceLabel(a).localeCompare(serviceLabel(b))),
    [services]
  )

  const sortedMethods = useMemo(
    () => selectedService ? [...selectedService.methods].sort((a, b) => a.name.localeCompare(b.name)) : [],
    [selectedService]
  )

  if (services.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Server className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm">No services discovered yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sortedServices.map((service) => {
        const isSelected = selectedService?.fullName === service.fullName
        const isExpanded = expandedService === service.fullName
        return (
          <ServiceItem
            key={service.fullName}
            service={service}
            isSelected={isSelected}
            isExpanded={isExpanded}
            onToggle={toggleService}
          >
            {isSelected && sortedMethods.map((method) => (
              <MethodItem
                key={method.name}
                method={method}
                service={service}
                isSelected={selectedMethod?.name === method.name}
                onSelect={onMethodSelect}
              />
            ))}
          </ServiceItem>
        )
      })}
    </div>
  )
}

export default ServiceExplorer
