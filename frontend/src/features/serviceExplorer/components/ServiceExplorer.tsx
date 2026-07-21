// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React, { useState, useMemo, useCallback, useRef } from 'react'
import { Server } from 'lucide-react'
import ServiceItem from './ServiceItem'
import MethodItem from './MethodItem'
import { Panel } from '@/components/ui/panel'
import { SearchInput } from '@/components/ui/searchInput'
import type { ServiceExplorerProps } from '../types'
import type { GrpcService } from '../../../types/grpc'
import { useSchemas } from '../../schemaLoader'

function serviceLabel(service: GrpcService): string {
  return service.name ?? service.fullName.split('.').pop() ?? service.fullName
}

interface ServiceExplorerWithServerProps extends ServiceExplorerProps {
  selectedServerNames: string[]
  serviceSearchQuery: string
  onSearchChange: (query: string) => void
}

// A service's identity in the sidebar is (server, service) — two servers can
// expose the same fullName, so the server name must be part of the key.
function serviceKey(serverName: string, service: GrpcService): string {
  return `${serverName}::${service.fullName}`
}

const ServiceExplorer: React.FC<ServiceExplorerWithServerProps> = ({
  selectedTarget,
  selectedService,
  selectedMethod,
  onServiceSelect,
  onMethodSelect,
  selectedServerNames,
  serviceSearchQuery,
  onSearchChange,
}) => {
  const { servers } = useSchemas()

  // Service expansion (search query now comes from parent)
  const [expandedService, setExpandedService] = useState<string | null>(null)

  // Filter servers based on selection (empty array = all servers)
  const filteredServers = useMemo(() => {
    if (selectedServerNames.length === 0) return servers
    return servers.filter(s => selectedServerNames.includes(s.name))
  }, [servers, selectedServerNames])

  // Aggregate services from filtered servers with server info
  const allServices = useMemo(() => {
    return filteredServers.flatMap(server =>
      server.services.map(service => ({
        service,
        serverName: server.name,
        serverTarget: server.target,
      }))
    )
  }, [filteredServers])

  // Filter services based on search (only filters services, not methods)
  const filteredServices = useMemo(() => {
    if (!serviceSearchQuery.trim()) return allServices

    const query = serviceSearchQuery.toLowerCase()
    return allServices.filter(({ service }) => {
      const serviceMatches = (service.name ?? service.fullName).toLowerCase().includes(query)
      const methodMatches = service.methods.some((method) =>
        method.name.toLowerCase().includes(query)
      )
      return serviceMatches || methodMatches
    })
  }, [allServices, serviceSearchQuery])

  // Auto-expand selected service (on its selected target)
  React.useEffect(() => {
    if (selectedService && selectedTarget) {
      setExpandedService(serviceKey(selectedTarget, selectedService))
    }
  }, [selectedService, selectedTarget])

  // Auto-expand the first matching service, but ONLY when the search query itself
  // changes — not on every render. Keying this effect off selectedService (or the
  // filteredServices identity) made a click that changes the selection re-fire this
  // and yank expansion back to the first match, so selecting any non-first match took
  // two clicks. Tracking the last-applied query confines the auto-expand to real
  // query edits and leaves user clicks alone.
  const lastAppliedQuery = useRef<string | null>(null)
  React.useEffect(() => {
    const query = serviceSearchQuery.trim()
    if (query === lastAppliedQuery.current) return
    lastAppliedQuery.current = query

    if (query && filteredServices.length > 0) {
      const first = filteredServices[0]
      setExpandedService(serviceKey(first.serverName, first.service))
    } else if (!query && !selectedService) {
      // Clear expansion when search is cleared and nothing is selected
      setExpandedService(null)
    }
  }, [serviceSearchQuery, filteredServices, selectedService])

  const toggleService = useCallback((service: GrpcService, serverName: string) => {
    const server = servers.find(s => s.name === serverName)
    if (!server) return

    const key = serviceKey(serverName, service)

    // Only collapse when the row is both selected and expanded; otherwise select it.
    // A row can be expanded without being selected (e.g. search auto-expand), so
    // keying the collapse purely off expansion would swallow the first click.
    const isActive =
      selectedTarget === serverName &&
      selectedService?.fullName === service.fullName &&
      expandedService === key

    if (isActive) {
      setExpandedService(null)
    } else {
      onServiceSelect(service, server)
      setExpandedService(key)
    }
  }, [selectedTarget, selectedService, expandedService, onServiceSelect, servers])

  const sortedServices = useMemo(
    () => [...filteredServices].sort((a, b) => serviceLabel(a.service).localeCompare(serviceLabel(b.service))),
    [filteredServices]
  )

  if (servers.length === 0) {
    return (
      <Panel className="p-6">
        <div className="py-8 text-center text-muted-foreground">
          <Server className="mx-auto mb-2 size-8 text-muted-foreground/50" />
          <p className="text-sm">No servers discovered yet</p>
        </div>
      </Panel>
    )
  }

  return (
    <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border p-4">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-foreground/90">
            <svg className="size-4 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Services
          </h2>

          {/* Service Search */}
          <SearchInput
            placeholder="Search..."
            value={serviceSearchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Service List */}
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {sortedServices.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No services match "{serviceSearchQuery}"
          </div>
        ) : (
          sortedServices.map(({ service, serverName, serverTarget }) => {
            const isSelected =
              selectedTarget === serverName &&
              selectedService?.fullName === service.fullName
            const isExpanded = expandedService === serviceKey(serverName, service)
            const server = servers.find(s => s.name === serverName)

            // Sort methods
            const sortedMethods = isSelected
              ? [...service.methods].sort((a, b) => a.name.localeCompare(b.name))
              : []

            return (
              <div key={`${serverName}::${service.fullName}`}>
                <ServiceItem
                  service={service}
                  isSelected={isSelected}
                  isExpanded={isExpanded}
                  onToggle={(svc) => toggleService(svc, serverName)}
                  serverName={serverName}
                  serverTarget={serverTarget}
                >
                  {isSelected && server && sortedMethods.map((method) => {
                    // Method selection must match target, service and method name —
                    // the same method can exist on multiple servers.
                    const isMethodSelected =
                      selectedTarget === serverName &&
                      selectedMethod?.name === method.name &&
                      selectedService?.fullName === service.fullName

                    return (
                      <MethodItem
                        key={method.name}
                        method={method}
                        service={service}
                        server={server}
                        isSelected={isMethodSelected}
                        onSelect={onMethodSelect}
                      />
                    )
                  })}
                </ServiceItem>
              </div>
            )
          })
        )}
      </div>
    </Panel>
  )
}

export default ServiceExplorer
