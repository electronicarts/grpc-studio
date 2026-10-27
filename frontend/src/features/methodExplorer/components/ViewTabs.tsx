// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { FormInput, Code, FileCode2, Tags } from 'lucide-react'
import { viewTabClass } from './viewTabClass'

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
      <button type="button" onClick={() => onTabChange('form')} className={viewTabClass(activeTab === 'form')}>
        <FormInput className="size-3.5" />
        Form
      </button>
    )}
    <button type="button" onClick={() => onTabChange('json')} className={viewTabClass(activeTab === 'json')}>
      <Code className="size-3.5" />
      JSON
    </button>
    {showSchemaTab && (
      <button type="button" onClick={() => onTabChange('schema')} className={viewTabClass(activeTab === 'schema')}>
        <FileCode2 className="size-3.5" />
        Schema
      </button>
    )}
    {showMetadataTab && (
      <button type="button" onClick={() => onTabChange('metadata')} className={viewTabClass(activeTab === 'metadata')}>
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
