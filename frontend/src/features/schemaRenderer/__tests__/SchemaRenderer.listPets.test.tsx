// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Integration tests for SchemaRenderer using a realistic ListPetsResponse structure.
 * Tests the expand/collapse behavior for repeated message fields with nested data.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SchemaRenderer from '../components/core/SchemaRenderer'
import { listPetsResponseSchema } from '@/test/petstore.fixtures'
import { collectExpandablePaths } from '../utils/pathAnalysis'

// Mock ListPetsResponse schema structure

describe('SchemaRenderer - ListPetsResponse Integration', () => {
  const schema = listPetsResponseSchema

  const sampleResponseData = {
    pets: [
      {
        id: 'pet-1',
        name: 'Fluffy',
        breed: 'Persian',
        owner: {
          name: 'John Doe',
          email: 'john@example.com',
          address: {
            street: '123 Main St',
            city: 'San Francisco',
            coordinates: {
              latitude: 37.7749,
              longitude: -122.4194,
            },
          },
        },
        vaccinations: [
          { name: 'Rabies', veterinarian: 'Dr. Smith' },
          { name: 'Distemper', veterinarian: 'Dr. Jones' },
        ],
      },
      {
        id: 'pet-2',
        name: 'Rex',
        breed: 'Golden Retriever',
        owner: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          address: {
            street: '456 Oak Ave',
            city: 'New York',
            coordinates: {
              latitude: 40.7128,
              longitude: -74.006,
            },
          },
        },
        vaccinations: [
          { name: 'FVRCP', veterinarian: 'Dr. Wilson' },
        ],
      },
    ],
    total_count: 2,
  }

  describe('Path collection', () => {
    it('collects all expandable paths including array items', () => {
      const paths = collectExpandablePaths(schema, sampleResponseData)

      // Top-level repeated field
      expect(paths.has('pets')).toBe(true)

      // Array items
      expect(paths.has('pets[0]')).toBe(true)
      expect(paths.has('pets[1]')).toBe(true)

      // Nested messages in first pet
      expect(paths.has('pets[0].owner')).toBe(true)
      expect(paths.has('pets[0].owner.address')).toBe(true)
      expect(paths.has('pets[0].owner.address.coordinates')).toBe(true)

      // Nested repeated field in first pet
      expect(paths.has('pets[0].vaccinations')).toBe(true)
      expect(paths.has('pets[0].vaccinations[0]')).toBe(true)
      expect(paths.has('pets[0].vaccinations[1]')).toBe(true)

      // Second pet paths
      expect(paths.has('pets[1].owner')).toBe(true)
      expect(paths.has('pets[1].vaccinations')).toBe(true)
      expect(paths.has('pets[1].vaccinations[0]')).toBe(true)
    })

    it('handles empty pets array', () => {
      const emptyData = { pets: [], total_count: 0 }
      const paths = collectExpandablePaths(schema, emptyData)

      expect(paths.has('pets')).toBe(true)
      expect(paths.has('pets[0]')).toBe(false)
    })

    it('works without data (request form case)', () => {
      const paths = collectExpandablePaths(schema)

      // Only schema-based paths
      expect(paths.has('pets')).toBe(true)

      // No array item paths without data
      expect(paths.has('pets[0]')).toBe(false)
    })
  })

  describe('Rendering with data', () => {
    it('renders repeated pets with nested structure', () => {
      render(
        <SchemaRenderer
          schema={schema}
          data={sampleResponseData}
          onChange={() => {}}
          readOnly={true}
        />
      )

      // Should show the message type name
      expect(screen.getByText(/ListPetsResponse/i)).toBeInTheDocument()

      // Should show the pets field container
      expect(screen.getByText('pets')).toBeInTheDocument()

      // Should show item count badge (use getAllByText since nested arrays also have item counts)
      const itemBadges = screen.getAllByText(/2 items/i)
      expect(itemBadges.length).toBeGreaterThan(0)
    })

    it('shows individual pet items when pets is expanded', async () => {
      const user = userEvent.setup()

      render(
        <SchemaRenderer
          schema={schema}
          data={sampleResponseData}
          onChange={() => {}}
          readOnly={true}
          defaultCollapsed={true}
        />
      )

      // Initially collapsed - items not visible
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument()

      // Click to expand pets field
      const petsButton = screen.getByRole('button', { name: /pets/i })
      await user.click(petsButton)

      // Now items should be visible
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
    })

    it('expand all button expands all nested fields including array items', async () => {
      const user = userEvent.setup()

      render(
        <SchemaRenderer
          schema={schema}
          data={sampleResponseData}
          onChange={() => {}}
          readOnly={true}
          defaultCollapsed={true}
        />
      )

      // Click "Expand" button (expand all)
      const expandButton = screen.getByRole('button', { name: /expand/i })
      await user.click(expandButton)

      // Pets container expanded - check for Item labels
      const itemLabels = screen.getAllByText(/Item \d+/)
      expect(itemLabels.length).toBeGreaterThanOrEqual(2) // At least 2 pets

      // Pet details visible (name fields)
      const nameInputs = screen.getAllByDisplayValue(/Fluffy|Rex/i)
      expect(nameInputs.length).toBeGreaterThan(0)

      // Owner nested message visible (check for owner field)
      const ownerFields = screen.getAllByText('owner')
      expect(ownerFields.length).toBeGreaterThanOrEqual(2) // One for each pet

      // Vaccinations visible (check for vaccination items)
      const vaccinationFields = screen.getAllByText('vaccinations')
      expect(vaccinationFields.length).toBeGreaterThanOrEqual(2)
    })

    it('shows correct data in nested fields', async () => {
      const user = userEvent.setup()

      render(
        <SchemaRenderer
          schema={schema}
          data={sampleResponseData}
          onChange={() => {}}
          readOnly={true}
        />
      )

      // Expand all
      const expandButton = screen.getByRole('button', { name: /expand/i })
      await user.click(expandButton)

      // Check pet names are displayed
      expect(screen.getByDisplayValue('Fluffy')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Rex')).toBeInTheDocument()

      // Check owner emails
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument()

      // Check vaccination data
      expect(screen.getByDisplayValue('Rabies')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Dr. Smith')).toBeInTheDocument()
    })
  })

  describe('Empty data scenarios', () => {
    it('handles empty pets array gracefully', () => {
      const emptyData = { pets: [], total_count: 0 }

      render(
        <SchemaRenderer
          schema={schema}
          data={emptyData}
          onChange={() => {}}
          readOnly={true}
        />
      )

      // Should show 0 items
      expect(screen.getByText(/0 items/i)).toBeInTheDocument()

      // Should not show any pet items
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
    })

    it('handles missing pets field (undefined)', () => {
      const dataWithoutPets = { total_count: 0 }

      render(
        <SchemaRenderer
          schema={schema}
          data={dataWithoutPets}
          onChange={() => {}}
          readOnly={true}
        />
      )

      // Should still render without crashing
      expect(screen.getByText('pets')).toBeInTheDocument()
    })
  })

  describe('Deep nesting verification', () => {
    it('expands deeply nested coordinates in address', async () => {
      const user = userEvent.setup()

      render(
        <SchemaRenderer
          schema={schema}
          data={sampleResponseData}
          onChange={() => {}}
          readOnly={true}
        />
      )

      // Expand all to show deep nesting
      const expandButton = screen.getByRole('button', { name: /expand/i })
      await user.click(expandButton)

      // Verify coordinates data is visible (latitude/longitude)
      expect(screen.getByDisplayValue('37.7749')).toBeInTheDocument()
      expect(screen.getByDisplayValue('-122.4194')).toBeInTheDocument()
      expect(screen.getByDisplayValue('40.7128')).toBeInTheDocument()
    })

    it('verifies path depth: pets[0].owner.address.coordinates', async () => {
      const user = userEvent.setup()

      render(
        <SchemaRenderer
          schema={schema}
          data={sampleResponseData}
          onChange={() => {}}
          readOnly={true}
        />
      )

      const expandButton = screen.getByRole('button', { name: /expand/i })
      await user.click(expandButton)

      // All levels should be expanded
      const paths = collectExpandablePaths(schema, sampleResponseData)

      // Verify the full path exists
      expect(paths.has('pets[0].owner.address.coordinates')).toBe(true)

      // And the coordinates data is rendered
      const latitudeInputs = screen.getAllByDisplayValue(/37\.7749|40\.7128/)
      expect(latitudeInputs.length).toBeGreaterThan(0)
    })
  })
})
