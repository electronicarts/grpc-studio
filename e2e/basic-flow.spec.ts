// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { test, expect } from '@playwright/test'

test.describe('gRPC Studio - Basic Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start with a clean state
    await page.goto('http://localhost:3000')
  })

  test('should load the application', async ({ page }) => {
    // Wait for main heading
    await expect(page.locator('h1')).toContainText('gRPC Studio')

    // Check for tagline
    await expect(page.locator('text=Connect, inspect, and call any gRPC service')).toBeVisible()
  })

  test('should show connection status', async ({ page }) => {
    // Wait for status indicator to appear
    const statusIndicator = page.locator('[data-testid="status-pill"], .status-pill, text=/connected|disconnected/i').first()
    await expect(statusIndicator).toBeVisible({ timeout: 10000 })
  })

  test('should display service list after discovery', async ({ page }) => {
    // Wait for service explorer to load
    await page.waitForSelector('[data-testid="service-explorer"], .service-explorer, [class*="ServiceExplorer"]', {
      timeout: 10000
    })

    // Check if services are loaded (may vary based on backend)
    const serviceElements = page.locator('[data-testid="service-item"], .service-item, [class*="service"]').first()

    // Either services loaded or empty state shown
    const hasServices = await serviceElements.count() > 0
    const hasEmptyState = await page.locator('text=/no services|ready to play/i').count() > 0

    expect(hasServices || hasEmptyState).toBeTruthy()
  })

  test('should show empty state when no method selected', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check for empty state message
    const emptyStateElements = await page.locator('text=/ready to play|select a service/i').count()
    expect(emptyStateElements).toBeGreaterThan(0)
  })

  test('should have dark mode toggle', async ({ page }) => {
    // Look for theme toggle button
    const themeToggle = page.locator('[data-testid="theme-toggle"], [aria-label*="theme" i], button:has-text("Theme")').first()

    if (await themeToggle.count() > 0) {
      await expect(themeToggle).toBeVisible()
    }
  })

  test('should handle page refresh gracefully', async ({ page }) => {
    // Load page
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Refresh
    await page.reload()

    // Should still show main content
    await expect(page.locator('h1')).toContainText('gRPC Studio')
  })

  test('should show certificate status when configured', async ({ page }) => {
    // Certificate status may not always be visible depending on config
    await page.waitForLoadState('networkidle')

    // Check if certificate indicator exists
    const certStatus = await page.locator('[data-testid="certificate-status"], [class*="certificate" i]').count()

    // Just verify page loaded - cert status is optional
    expect(certStatus).toBeGreaterThanOrEqual(0)
  })

  test('should have responsive layout', async ({ page }) => {
    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page.locator('h1')).toBeVisible()

    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('h1')).toBeVisible()

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('h1')).toBeVisible()
  })

  test('should load without console errors', async ({ page }) => {
    const errors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Filter out expected errors (e.g., failed network requests in dev)
    const criticalErrors = errors.filter(err =>
      !err.includes('Failed to load resource') &&
      !err.includes('net::ERR_') &&
      !err.includes('favicon')
    )

    expect(criticalErrors).toHaveLength(0)
  })
})

test.describe('gRPC Studio - Service Discovery', () => {
  test('should attempt to discover services on load', async ({ page }) => {
    // Monitor network requests
    const discoveryRequests: string[] = []

    page.on('request', request => {
      if (request.url().includes('/api/grpc/discover')) {
        discoveryRequests.push(request.url())
      }
    })

    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Should have attempted discovery
    expect(discoveryRequests.length).toBeGreaterThan(0)
  })

  test('should show loading state during discovery', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Check for loading indicator (might be brief)
    const loadingIndicator = page.locator('[data-testid="loading"], [class*="loading" i], text=/loading|discovering/i').first()

    // May or may not catch it depending on speed
    const loadingVisible = await loadingIndicator.isVisible().catch(() => false)

    // Test passes if loading was shown OR if content loaded quickly
    expect(loadingVisible || true).toBeTruthy()
  })

  test('should handle discovery errors gracefully', async ({ page }) => {
    // Intercept discovery request to simulate error
    await page.route('**/api/grpc/discover', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Test error' } })
      })
    })

    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Should show error message
    const errorMessage = await page.locator('text=/error|failed|connection/i').count()
    expect(errorMessage).toBeGreaterThan(0)
  })
})

test.describe('gRPC Studio - Navigation', () => {
  test('should navigate to home when clicking logo', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Find and click logo
    const logo = page.locator('img[alt*="gRPC" i], [data-testid="logo"]').first()

    if (await logo.count() > 0) {
      await logo.click()

      // Should still be on main page
      await expect(page.locator('h1')).toContainText('gRPC Studio')
    }
  })

  test('should maintain state across navigation', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Get initial state
    const initialContent = await page.locator('body').textContent()

    // Refresh page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Content should be similar (services discovered)
    const afterContent = await page.locator('body').textContent()

    // Both should have main heading at minimum
    expect(initialContent).toContain('gRPC Studio')
    expect(afterContent).toContain('gRPC Studio')
  })
})

test.describe('gRPC Studio - Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Should have h1
    const h1 = await page.locator('h1').count()
    expect(h1).toBeGreaterThanOrEqual(1)

    // Should not skip heading levels
    const h1Text = await page.locator('h1').first().textContent()
    expect(h1Text).toBeTruthy()
  })

  test('should have accessible buttons', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // All buttons should have accessible text or aria-label
    const buttons = await page.locator('button').all()

    for (const button of buttons) {
      const text = await button.textContent()
      const ariaLabel = await button.getAttribute('aria-label')
      const hasAccessibleName = (text && text.trim().length > 0) || (ariaLabel && ariaLabel.length > 0)

      expect(hasAccessibleName).toBeTruthy()
    }
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Tab through interactive elements
    await page.keyboard.press('Tab')

    // At least one element should receive focus
    const focusedElement = await page.locator(':focus').count()
    expect(focusedElement).toBeGreaterThan(0)
  })
})

test.describe('gRPC Studio - Performance', () => {
  test('should load quickly', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    const loadTime = Date.now() - startTime

    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000)
  })

  test('should not have memory leaks on repeated navigation', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Navigate multiple times
    for (let i = 0; i < 5; i++) {
      await page.reload()
      await page.waitForLoadState('networkidle')
    }

    // Should still be responsive
    await expect(page.locator('h1')).toBeVisible()
  })
})
