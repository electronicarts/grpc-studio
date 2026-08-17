// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Regression tests for cyclic schema graphs.
 *
 * A message that contains itself (directly, through a repeated field, through a
 * map value, or indirectly via another message) makes the descriptor graph
 * infinite. Every schema walker must therefore track which message types it is
 * already inside, or it recurses until the stack overflows.
 *
 * Mirrors examples/petstore Pet.parent / Pet.offspring / Pet.lineage and
 * examples/bookstore Book.prequel / Book.sequels / Book.lineage.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SchemaRenderer from '../components/core/SchemaRenderer'
import { collectExpandablePaths } from '../utils/pathAnalysis'
import { filterFields } from '../utils/fieldFiltering'
import { detectOneOfSelections } from '../utils/oneOfDetection'
import {
  recursiveSchema,
  lineageSchema,
  recursiveOneofSchema,
  testData,
  schemaCache as testSchemaMap,
} from './protoMessageRenderer.fixtures'

vi.mock('../../schemaLoader/lib/schemaCache', () => ({
  schemaCache: {
    getSchema: vi.fn((_target: string, type: string) => Promise.resolve(testSchemaMap.get(type) || null)),
    getCacheSize: vi.fn(() => testSchemaMap.size),
    getSchemaMap: vi.fn(() => new Map(testSchemaMap)),
    getCachedSchema: vi.fn((_target: string, type: string) => testSchemaMap.get(type) ?? null),
    subscribe: vi.fn(() => () => {}),
    get allLoaded() { return true },
  },
  needsSchemaLoad: vi.fn(() => false),
}))

describe('cyclic schemas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('collectExpandablePaths', () => {
    it('terminates on a directly self-referencing message with no data', () => {
      const paths = collectExpandablePaths(recursiveSchema, {})
      expect(paths.has('parent')).toBe(true)
      expect(paths.has('children')).toBe(true)
      expect(paths.has('lineage')).toBe(true)
    })

    it('terminates on an indirect cycle (Recursive → Lineage → Recursive)', () => {
      const paths = collectExpandablePaths(lineageSchema, {})
      expect(paths.has('ancestor')).toBe(true)
      expect(paths.has('branches')).toBe(true)
    })

    it('walks a self-nested payload to the depth the data actually has', () => {
      const paths = collectExpandablePaths(recursiveSchema, testData.recursive)

      // Direct recursion follows the data
      expect(paths.has('parent')).toBe(true)
      expect(paths.has('parent.parent')).toBe(true)
      // Repeated recursion indexes each item, and recurses into them
      expect(paths.has('children[0]')).toBe(true)
      expect(paths.has('children[1]')).toBe(true)
      expect(paths.has('children[0].children[0]')).toBe(true)
      // Map values recurse too
      expect(paths.has('byName[entry-a]')).toBe(true)
      expect(paths.has('byName[entry-a].parent')).toBe(true)
      // Indirect recursion through Lineage
      expect(paths.has('lineage.ancestor')).toBe(true)
      expect(paths.has('lineage.ancestor.parent')).toBe(true)
      expect(paths.has('lineage.branches[0]')).toBe(true)
      expect(paths.has('lineage.branches[0].branches[0]')).toBe(true)
    })

    it('does not emit unboundedly deep schema-only paths', () => {
      // Without data there is nothing to bound the walk but cycle detection.
      const paths = collectExpandablePaths(recursiveSchema, {})
      const deepest = Math.max(...[...paths].map(p => p.split('.').length))
      expect(deepest).toBeLessThan(20)
      expect(paths.size).toBeLessThan(500)
    })

    it('terminates on a self-referencing oneOf member', () => {
      const paths = collectExpandablePaths(recursiveOneofSchema, {
        label: 'root',
        self: { label: 'inner', self: { label: 'innermost' } },
      })
      expect(paths.has('self')).toBe(true)
      expect(paths.has('self.self')).toBe(true)
    })
  })

  describe('filterFields', () => {
    it('terminates when searching a cyclic schema', () => {
      const { filteredRegular } = filterFields(recursiveSchema, testData.recursive, {
        searchQuery: 'zzz-no-match',
        hideEmptyFields: false,
        isRoot: true,
      })
      expect(filteredRegular).toHaveLength(0)
    })

    it('still finds a match nested behind a cycle', () => {
      const { filteredRegular } = filterFields(recursiveSchema, testData.recursive, {
        searchQuery: 'registryId',
        hideEmptyFields: false,
        isRoot: true,
      })
      expect(filteredRegular.map(f => f.name)).toContain('lineage')
    })
  })

  describe('detectOneOfSelections', () => {
    it('terminates on a self-nested oneOf payload', () => {
      const selections = detectOneOfSelections(recursiveOneofSchema, {
        label: 'root',
        self: { label: 'inner', plain: 'leaf' },
      })
      expect(selections.get('relative')).toBe('self')
      expect(selections.get('self.relative')).toBe('plain')
    })
  })

  describe('SchemaRenderer', () => {
    it('renders a cyclic schema with no data', () => {
      render(<SchemaRenderer schema={recursiveSchema} data={{}} onChange={vi.fn()} />)
      expect(screen.getByText('test.Recursive')).toBeInTheDocument()
      expect(screen.getByText('parent')).toBeInTheDocument()
    })

    it('renders a self-nested response payload', () => {
      render(
        <SchemaRenderer
          schema={recursiveSchema}
          data={testData.recursive}
          onChange={vi.fn()}
          readOnly
        />
      )
      expect(screen.getByText('test.Recursive')).toBeInTheDocument()
      expect(screen.getByDisplayValue('root')).toBeInTheDocument()
      // The nested Recursive inside `parent` is expanded because it has data
      expect(screen.getByDisplayValue('grandparent')).toBeInTheDocument()
    })

    it('expandAll terminates on a cyclic schema', async () => {
      const user = userEvent.setup()
      render(<SchemaRenderer schema={recursiveSchema} data={testData.recursive} onChange={vi.fn()} />)

      await user.click(screen.getByTitle('Expand all'))

      // Still responsive, and the recursive branch is reachable
      expect(screen.getByText('test.Recursive')).toBeInTheDocument()
      expect(screen.getByDisplayValue('great-grandparent')).toBeInTheDocument()
    })

    it('drilling into a recursive field renders the same message type again', async () => {
      const user = userEvent.setup()
      render(<SchemaRenderer schema={recursiveSchema} data={{}} onChange={vi.fn()} />)

      // Expanding `parent` must reveal that Recursive's own fields, one level
      // at a time — lazily, not by pre-walking the infinite graph.
      await user.click(screen.getByRole('button', { name: /^parent/ }))
      expect(screen.getAllByText('parent').length).toBeGreaterThan(1)
    })
  })
})
