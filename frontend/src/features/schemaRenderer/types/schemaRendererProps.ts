// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescMessage } from '@bufbuild/protobuf'

export interface ProtoMessageRendererProps {
  target: string
  schema: DescMessage | null
  data: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
  readOnly?: boolean
  defaultCollapsed?: boolean
  showControls?: boolean
  hideEmptyFields?: boolean
}
