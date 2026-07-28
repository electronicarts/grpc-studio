// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { FormInput, Code, FileCode2, Tags } from 'lucide-react'

export type ViewTab = 'form' | 'json' | 'schema' | 'metadata'

interface ViewTabsProps {
  activeTab: ViewTab
  onTabChange: (tab: ViewTab) => void
  /** When false, the Form tab is hidden (e.g. when no schema is available). Defaults to true. */
  hasSchema?: boolean
  /** When false, the Schema tab is hidden. Defaults to true. */
  showSchemaTab?: boolean
  /** When false, the Metadata tab is hidden. Defaults to true. */
  showMetadataTab?: boolean
  /** Count of active metadata entries, shown as a badge on the Metadata tab. */
  metadataCount?: number
}

const cls = (active: boolean) =>
  `flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
    active
      ? 'bg-white dark:bg-gray-700 text-foreground shadow-sm'
      : 'text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
  }`

const ViewTabs: React.FC<ViewTabsProps> = ({
  activeTab,
  onTabChange,
  hasSchema = true,
  showSchemaTab = true,
  showMetadataTab = true,
  metadataCount = 0,
}) => (
  <div className="flex items-center rounded-lg bg-muted p-0.5">
    {hasSchema && (
      <button type="button" onClick={() => onTabChange('form')} className={cls(activeTab === 'form')}>
        <FormInput className="size-3.5" />
        Form
      </button>
    )}
    <button type="button" onClick={() => onTabChange('json')} className={cls(activeTab === 'json')}>
      <Code className="size-3.5" />
      JSON
    </button>
    {showSchemaTab && (
      <button type="button" onClick={() => onTabChange('schema')} className={cls(activeTab === 'schema')}>
        <FileCode2 className="size-3.5" />
        Schema
      </button>
    )}
    {showMetadataTab && (
      <button type="button" onClick={() => onTabChange('metadata')} className={cls(activeTab === 'metadata')}>
        <Tags className="size-3.5" />
        Metadata
        {metadataCount > 0 && (
          <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
            {metadataCount}
          </span>
        )}
      </button>
    )}
  </div>
)

export default ViewTabs
