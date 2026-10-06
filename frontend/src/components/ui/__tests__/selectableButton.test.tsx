// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SelectableButton } from '../selectableButton'

function selectContentsOf(node: Node) {
  const range = document.createRange()
  range.selectNodeContents(node)
  window.getSelection()?.addRange(range)
}

describe('SelectableButton', () => {
  afterEach(() => {
    window.getSelection()?.removeAllRanges()
  })

  it('activates on click', () => {
    const onActivate = vi.fn()
    render(<SelectableButton onActivate={onActivate}>Endpoint: localhost:50051</SelectableButton>)
    fireEvent.click(screen.getByRole('button'))
    expect(onActivate).toHaveBeenCalledOnce()
  })

  it('does not activate when the click ends a text selection inside it', () => {
    const onActivate = vi.fn()
    render(<SelectableButton onActivate={onActivate}>Endpoint: localhost:50051</SelectableButton>)
    const button = screen.getByRole('button')

    selectContentsOf(button)
    fireEvent.click(button)

    expect(onActivate).not.toHaveBeenCalled()
  })

  it('still activates when the only selection is elsewhere on the page', () => {
    const onActivate = vi.fn()
    render(
      <>
        <p>Unrelated text</p>
        <SelectableButton onActivate={onActivate}>Endpoint: localhost:50051</SelectableButton>
      </>
    )

    selectContentsOf(screen.getByText('Unrelated text'))
    fireEvent.click(screen.getByRole('button'))

    expect(onActivate).toHaveBeenCalledOnce()
  })

  it('activates with Enter and Space for keyboard users', () => {
    const onActivate = vi.fn()
    render(<SelectableButton onActivate={onActivate}>Row</SelectableButton>)
    const button = screen.getByRole('button')

    fireEvent.keyDown(button, { key: 'Enter' })
    fireEvent.keyDown(button, { key: ' ' })
    fireEvent.keyDown(button, { key: 'a' })

    expect(onActivate).toHaveBeenCalledTimes(2)
    expect(button).toHaveAttribute('tabindex', '0')
  })

  it("runs the caller's onKeyDown and respects preventDefault", () => {
    const onActivate = vi.fn()
    render(
      <SelectableButton onActivate={onActivate} onKeyDown={(e) => e.preventDefault()}>
        Row
      </SelectableButton>
    )

    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })

    expect(onActivate).not.toHaveBeenCalled()
  })
})
