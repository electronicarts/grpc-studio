// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { FormInput, Code, FileCode2, Tags } from 'lucide-react'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmentedControl'

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
  <SegmentedControl aria-label="View">
    {hasSchema && (
      <SegmentedControlItem selected={activeTab === 'form'} onClick={() => onTabChange('form')}>
        <FormInput className="size-3.5" />
        Form
      </SegmentedControlItem>
    )}
    <SegmentedControlItem selected={activeTab === 'json'} onClick={() => onTabChange('json')}>
      <Code className="size-3.5" />
      JSON
    </SegmentedControlItem>
    {showSchemaTab && (
      <SegmentedControlItem selected={activeTab === 'schema'} onClick={() => onTabChange('schema')}>
        <FileCode2 className="size-3.5" />
        Schema
      </SegmentedControlItem>
    )}
    {showMetadataTab && (
      <SegmentedControlItem selected={activeTab === 'metadata'} onClick={() => onTabChange('metadata')}>
        <Tags className="size-3.5" />
        Metadata
        {metadataCount > 0 && (
          <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
            {metadataCount}
          </span>
        )}
      </SegmentedControlItem>
    )}
  </SegmentedControl>
)

export default ViewTabs
