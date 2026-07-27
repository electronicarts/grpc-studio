// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ViewTabs from '../ViewTabs'

describe('ViewTabs', () => {
  it('renders Form, JSON and Schema tabs by default', () => {
    render(<ViewTabs activeTab="json" onTabChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Form/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /JSON/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Schema/ })).toBeInTheDocument()
  })

  it('invokes onTabChange when an inactive tab is clicked', () => {
    const onTabChange = vi.fn()
    render(<ViewTabs activeTab="json" onTabChange={onTabChange} />)

    fireEvent.click(screen.getByRole('button', { name: /Form/ }))
    expect(onTabChange).toHaveBeenCalledWith('form')

    fireEvent.click(screen.getByRole('button', { name: /Schema/ }))
    expect(onTabChange).toHaveBeenCalledWith('schema')
  })

  it('styles inactive tabs as clickable, not disabled', () => {
    render(<ViewTabs activeTab="json" onTabChange={vi.fn()} />)

    const formTab = screen.getByRole('button', { name: /Form/ })
    // Interactive affordance is present...
    expect(formTab.className).toContain('cursor-pointer')
    // ...and the muted grey used for disabled-looking text is NOT applied.
    expect(formTab.className).not.toContain('text-gray-500')
    // A real disabled attribute must never be set on an inactive tab.
    expect(formTab).not.toBeDisabled()
  })
})
