// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StreamingMessageDisplay from './StreamingMessageDisplay'

describe('StreamingMessageDisplay', () => {
  it('shows a waiting state for active empty streams', () => {
    render(
      <StreamingMessageDisplay
        label="Received Messages"
        messages={[]}
        schema={null}
        active
      />
    )

    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.getByText('Waiting for messages...')).toBeInTheDocument()
  })

  it('shows an ended empty state for completed streams with no messages', () => {
    render(
      <StreamingMessageDisplay
        label="Received Messages"
        messages={[]}
        schema={null}
        active={false}
      />
    )

    expect(screen.getByText('Ended')).toBeInTheDocument()
    expect(screen.getByText('Stream ended with no messages.')).toBeInTheDocument()
  })
})
