// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import type { DescMessage } from '@bufbuild/protobuf'
import { isRecord } from '@/utils/jsonUtils'
import { renderWellKnownType } from '@/features/schemaRenderer/components/shared/WellKnownTypeRenderer'
import MessageRenderer from '@/features/schemaRenderer/components/core/MessageRenderer'

interface MessageValueProps {
  schema: DescMessage
  /** Label for a well-known type's editor, e.g. the list or map field's name. */
  name: string
  value: unknown
  onChange: (value: unknown) => void
  path: string
}

/**
 * A message-typed list item or map value: well-known types get their own editor (a Timestamp is a date picker,
 * not seconds/nanos), as they do for singular fields; other messages get the nested form.
 */
const MessageValue: React.FC<MessageValueProps> = ({ schema, name, value, onChange, path }) =>
  renderWellKnownType({ message: schema, fieldName: name, value, onChange, path }) ?? (
    <div className="rounded bg-muted p-2">
      <MessageRenderer schema={schema} value={isRecord(value) ? value : {}} onChange={onChange} basePath={path} />
    </div>
  )

export default MessageValue
