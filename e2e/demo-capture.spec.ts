// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Demo asset capture — regenerates the screenshots (and a walkthrough video)
 * in demo/ from the live app. This is NOT part of the normal e2e suite; run it
 * explicitly with `npm run demo:capture` while the full stack is running
 * (`npm run dev:all` — frontend + backend + PetStore + BookStore).
 *
 * Screenshots are written straight into demo/ with the filenames referenced by
 * demo/README.md. The walkthrough is recorded as a .webm; convert it to
 * demo/grpc-studio-light-mode.gif with ffmpeg (see scripts/demo-gif.mjs).
 *
 * Selectors favor visible text / roles so they survive styling changes. If a
 * flow's labels change, update the corresponding step below.
 */

import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DEMO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'demo')
const shot = (name: string) => path.join(DEMO_DIR, name)

// A wide, stable viewport so captures are consistent run to run.
// Record video at the full viewport resolution — Playwright's default video
// size downscales (~800px wide), which then upscales blurry into the GIF/MP4.
// Setting an explicit size matching the viewport keeps the recording crisp.
// Grant clipboard access so the Share ("Copy shareable link") flow works.
test.use({
  viewport: { width: 1920, height: 1080 },
  video: { mode: 'on', size: { width: 1920, height: 1080 } },
  permissions: ['clipboard-read', 'clipboard-write'],
})

/**
 * Show a full-screen title card ("page break") between feature sections so the
 * walkthrough GIF reads as labeled chapters. Injects a styled overlay, holds it,
 * then removes it. No-op'able — purely cosmetic for the recording.
 */
async function chapter(page: Page, title: string, subtitle = '') {
  await page.evaluate(
    ({ title, subtitle }) => {
      const existing = document.getElementById('demo-chapter')
      if (existing) existing.remove()
      const el = document.createElement('div')
      el.id = 'demo-chapter'
      el.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:99999',
        'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center',
        'gap:12px', 'background:linear-gradient(135deg,#4f46e5,#7c3aed)', 'color:#fff',
        'font-family:ui-sans-serif,system-ui,sans-serif', 'text-align:center',
        'opacity:0', 'transition:opacity 250ms ease',
      ].join(';')
      const h = document.createElement('div')
      h.textContent = title
      h.style.cssText = 'font-size:44px;font-weight:700;letter-spacing:-0.02em'
      const p = document.createElement('div')
      p.textContent = subtitle
      p.style.cssText = 'font-size:20px;opacity:0.9;max-width:640px;padding:0 24px'
      el.appendChild(h)
      if (subtitle) el.appendChild(p)
      document.body.appendChild(el)
      requestAnimationFrame(() => { el.style.opacity = '1' })
    },
    { title, subtitle },
  )
  await page.waitForTimeout(1700)
  await page.evaluate(() => {
    const el = document.getElementById('demo-chapter')
    if (!el) return
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 300)
  })
  await page.waitForTimeout(400)
}

// Each capture is independent — don't use serial mode, or one failed shot
// skips the rest. --workers=1 (in the npm script) still keeps them ordered.
test.describe.configure({ timeout: 60_000 })

async function waitForApp(page: Page) {
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('gRPC Studio')
  // Wait for discovery to render at least one service. Avoid networkidle — the
  // app holds long-lived streaming/websocket connections, so the network never
  // goes fully idle.
  await page.getByText(/Service/i).first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {})
  await page.waitForTimeout(800)
}

/** Open a service group (by text) and click a method within it. */
async function openMethod(page: Page, service: RegExp | string, method: RegExp | string) {
  const m = page.getByText(method, { exact: false }).first()
  // Expand the service only if the target method isn't already visible — clicking
  // an already-expanded service collapses it.
  if (!(await m.isVisible().catch(() => false))) {
    const svc = page.getByText(service, { exact: false }).first()
    if (await svc.count()) {
      await svc.click({ timeout: 8_000 }).catch(() => {})
      await page.waitForTimeout(500)
    }
  }
  await m.click({ timeout: 8_000 }).catch(() => {})
  await page.waitForTimeout(800)
}

/** Switch the request/response input view (Form / JSON / Schema). */
async function selectView(page: Page, label: 'Form' | 'JSON' | 'Schema') {
  const tab = page.getByRole('button', { name: label, exact: true }).first()
  if (await tab.count()) {
    await tab.click()
    await page.waitForTimeout(150)
  }
}

/**
 * Fill a scalar field in the Form view. Scalar inputs render with a
 * `placeholder="Enter <field>"`, so we target by that. Types slowly so the
 * keystrokes are visible in the recording.
 */
async function fillFormField(page: Page, field: string, value: string) {
  await selectView(page, 'Form')
  const input = page.getByPlaceholder(new RegExp(`Enter ${field}`, 'i')).first()
  if (!(await input.count())) return
  await input.click({ timeout: 5_000 }).catch(() => {})
  await input.fill('')
  for (const ch of value) {
    await page.keyboard.type(ch)
    await page.waitForTimeout(70)
  }
  await page.waitForTimeout(600)
}

async function execute(page: Page) {
  const run = page.getByRole('button', { name: /Execute Method/i }).first()
  await run.click()
  // Let the response render.
  await page.waitForTimeout(1200)
}

/** Open the request Metadata tab (custom gRPC headers editor). */
async function openMetadataTab(page: Page) {
  const tab = page.getByRole('button', { name: /^Metadata$/i }).first()
  if (await tab.count()) {
    await tab.click({ timeout: 5_000 }).catch(() => {})
    await page.waitForTimeout(300)
  }
}

/**
 * Add one metadata header row and fill it. Rows share placeholders
 * (`header-name` / `value`), so the freshly added row is targeted via `.last()`.
 * Types slowly so the keystrokes read in the recording.
 */
async function addMetadata(page: Page, key: string, value: string) {
  const add = page.getByRole('button', { name: /^Add$/i }).first()
  if (!(await add.count())) return
  await add.click({ timeout: 5_000 }).catch(() => {})
  await page.waitForTimeout(300)

  const typeSlow = async (input: ReturnType<Page['getByPlaceholder']>, text: string) => {
    if (!(await input.count())) return
    await input.click({ timeout: 5_000 }).catch(() => {})
    for (const ch of text) {
      await page.keyboard.type(ch)
      await page.waitForTimeout(55)
    }
  }

  await typeSlow(page.getByPlaceholder(/header-name/i).last(), key)
  await page.waitForTimeout(200)
  await typeSlow(page.getByPlaceholder(/^value$/i).last(), value)
  await page.waitForTimeout(500)
}

test('demo: server selector (PetStore + BookStore)', async ({ page }) => {
  await waitForApp(page)
  // Open the server selector so both example targets are visible.
  const trigger = page
    .getByRole('button', { name: /server|target|select/i })
    .first()
  if (await trigger.count()) {
    await trigger.click().catch(() => {})
    await page.waitForTimeout(300)
  }
  await page.screenshot({ path: shot('00-server-selector.png') })
})

test('demo: service discovery + RPC mode badges', async ({ page }) => {
  await waitForApp(page)
  await page.screenshot({ path: shot('01-service-and-rpc-modes.png') })
})

test('demo: unary request — form / json / schema', async ({ page }) => {
  await waitForApp(page)
  await openMethod(page, /PetStoreService/i, /GetPet/i)

  await selectView(page, 'Form')
  await page.screenshot({ path: shot('02-unary-request-form.png') })

  await selectView(page, 'JSON')
  await page.screenshot({ path: shot('03-unary-request-json.png') })

  await selectView(page, 'Schema')
  await page.screenshot({ path: shot('04-unary-request-schema.png') })
})

test('demo: unary response — form / json / schema', async ({ page }) => {
  await waitForApp(page)
  await openMethod(page, /PetStoreService/i, /GetPet/i)

  // Provide an id and run so the response has content.
  await typeJson(page, '{"id": "pet-001"}')
  await execute(page)

  await selectView(page, 'Form')
  await page.screenshot({ path: shot('05-unary-response-form.png') })

  await selectView(page, 'JSON')
  await page.screenshot({ path: shot('06-unary-response-json.png') })

  await selectView(page, 'Schema')
  await page.screenshot({ path: shot('07-unary-response-schema.png') })
})

test('demo: share action copied', async ({ page }) => {
  await waitForApp(page)
  await openMethod(page, /PetStoreService/i, /GetPet/i)
  const share = page.getByRole('button', { name: /share|copy/i }).first()
  if (await share.count()) {
    await share.click().catch(() => {})
    await page.waitForTimeout(300)
  }
  await page.screenshot({ path: shot('08-share-action-copied.png') })
})

test('demo: request metadata (custom headers)', async ({ page }) => {
  await waitForApp(page)
  await openMethod(page, /PetStoreService/i, /GetPet/i)
  await openMetadataTab(page)
  await addMetadata(page, 'x-request-id', 'demo-123')
  await addMetadata(page, 'x-tenant', 'acme')
  await page.screenshot({ path: shot('13-request-metadata.png') })
})

test('demo: request history', async ({ page }) => {
  await waitForApp(page)
  await openMethod(page, /PetStoreService/i, /GetPet/i)

  // History only appears after at least one request, so run one first.
  await typeJson(page, '{"id": "pet-001"}')
  await execute(page)

  const history = page.getByRole('button', { name: /history/i }).first()
  if (await history.count()) {
    await history.click().catch(() => {})
    await page.waitForTimeout(400)
  }
  await page.screenshot({ path: shot('09-request-history.png') })
})

test('demo: server streaming (WatchPets)', async ({ page }) => {
  await waitForApp(page)
  await openMethod(page, /PetStoreService/i, /WatchPets/i)
  await execute(page)
  // Let a couple of streamed events arrive.
  await page.waitForTimeout(4500)
  await page.screenshot({ path: shot('10-server-streaming-watchpets.png') })
})

test('demo: client streaming (BulkCreatePets)', async ({ page }) => {
  await waitForApp(page)
  await openMethod(page, /PetStoreService/i, /BulkCreatePets/i)
  await page.screenshot({ path: shot('11-client-streaming-bulk-create.png') })
})

test('demo: bidi streaming (MonitorHealth)', async ({ page }) => {
  await waitForApp(page)
  await openMethod(page, /PetStoreService/i, /MonitorHealth/i)
  await page.screenshot({ path: shot('12-bidi-streaming-monitor-health.png') })
})

/** Type a query into the service search box, pause, then clear it. */
async function searchServices(page: Page, query: string) {
  const box = page.getByPlaceholder(/search/i).first()
  if (!(await box.count())) return
  // Short timeout so a blocked/covered input skips rather than hanging the whole run.
  try {
    await box.click({ timeout: 5_000 })
  } catch {
    return
  }
  for (const ch of query) {
    await page.keyboard.type(ch)
    await page.waitForTimeout(90)
  }
  await page.waitForTimeout(1200)
  await box.fill('')
  await page.waitForTimeout(600)
}

/**
 * Fill the JSON request editor with a payload, fully replacing any pre-filled
 * content. The editor may be a textarea or a CodeMirror surface, and it often
 * ships a default `{}` — so we select-all (both Ctrl+A and Meta+A for macOS)
 * and delete before typing, or the new text gets appended into invalid JSON.
 */
async function typeJson(page: Page, json: string) {
  await selectView(page, 'JSON')
  const editor = page.locator('textarea, .cm-content, [contenteditable="true"]').first()
  if (!(await editor.count())) return
  await editor.click().catch(() => {})
  await page.keyboard.press('ControlOrMeta+A').catch(() => {})
  await page.keyboard.press('Delete').catch(() => {})
  await page.keyboard.type(json).catch(() => {})
  await page.waitForTimeout(500)
}

/**
 * One continuous walkthrough recorded as a single video. Playwright writes one
 * .webm per test, so this MUST stay a single test to produce one clip.
 * `npm run demo:gif` converts the recording to demo/grpc-studio-light-mode.gif.
 *
 * A title card (chapter()) precedes each feature section so the GIF reads as
 * labeled chapters. Feature tour:
 *   1. Multi-server support — Target Servers dropdown
 *   2. Search — filter services & methods
 *   3. Tabs — open several methods, duplicate one
 *   4. Form / JSON / Schema — the three request views
 *   5. Custom metadata — attach gRPC headers to a request
 *   6. All streaming modes — server & bidirectional
 *   7. Request history
 *   8. Shareable URLs
 */
test('demo: walkthrough video', async ({ page }) => {
  test.setTimeout(220_000)
  await waitForApp(page)
  await page.waitForTimeout(1200)

  // 1. Multi-server support.
  await chapter(page, 'Multi-Server Support', 'Connect to several gRPC servers at once')
  const serverTrigger = page.getByRole('button', { name: /all servers|server|target|select/i }).first()
  if (await serverTrigger.count()) {
    await serverTrigger.click().catch(() => {})
    await page.waitForTimeout(1600)
    // Click the outside-click backdrop (top-left header) to dismiss the dropdown;
    // it renders a full-screen backdrop that would otherwise block later clicks.
    await page.mouse.click(200, 40)
    await page.waitForTimeout(600)
  }

  // 2. Search.
  await chapter(page, 'Searchable Services & Methods', 'Filter the tree as you type')
  await searchServices(page, 'Book')
  await searchServices(page, 'Pet')

  // 3. Tabs.
  await chapter(page, 'Tabs', 'Open many methods side by side')
  await openMethod(page, /PetStoreService/i, /GetPet/i)
  await page.waitForTimeout(700)
  await openMethod(page, /PetStoreService/i, /ListPets/i)
  await page.waitForTimeout(700)
  await openMethod(page, /PetStoreService/i, /SearchPets/i)
  await page.waitForTimeout(700)
  const duplicate = page.getByRole('button', { name: /duplicate tab/i }).first()
  if (await duplicate.count()) {
    await duplicate.click().catch(() => {})
    await page.waitForTimeout(1000)
  }

  // 4. Form / JSON / Schema. Fill the id in the FORM view, flip to JSON to show
  //    the form input transformed into the JSON request, then the Schema view.
  await chapter(page, 'Form, JSON & Schema', 'Edit requests three ways — they stay in sync')
  await openMethod(page, /PetStoreService/i, /GetPet/i)
  await fillFormField(page, 'id', 'pet-001')
  await selectView(page, 'JSON')       // shows the form value as JSON
  await page.waitForTimeout(1300)
  await selectView(page, 'Schema')     // shows the .proto definition
  await page.waitForTimeout(1300)
  await execute(page)
  for (const view of ['Form', 'JSON', 'Schema'] as const) {
    await selectView(page, view)
    await page.mouse.wheel(0, 350)
    await page.waitForTimeout(800)
    await page.mouse.wheel(0, -350)
  }

  // 5. Custom request metadata — add a couple of gRPC headers on the Metadata tab.
  await chapter(page, 'Custom Metadata', 'Attach gRPC headers to any request')
  await openMethod(page, /PetStoreService/i, /GetPet/i)
  await openMetadataTab(page)
  await addMetadata(page, 'x-request-id', 'demo-123')
  await addMetadata(page, 'x-tenant', 'acme')
  await page.waitForTimeout(1200)

  // 6. Streaming modes.
  await chapter(page, 'Streaming', 'Server & bidirectional streaming, live')
  // Server streaming — start, let events arrive, flip Form <-> JSON.
  await openMethod(page, /PetStoreService/i, /WatchPets/i)
  await execute(page)
  await page.waitForTimeout(4000)
  for (const view of ['Form', 'JSON', 'Form'] as const) {
    await selectView(page, view)
    await page.waitForTimeout(1300)
  }
  // Bidirectional — send via the form, then show Form/JSON of the exchange.
  await openMethod(page, /PetStoreService/i, /MonitorHealth/i)
  await fillFormField(page, 'pet_id', 'pet-001')
  await selectView(page, 'JSON')
  await page.waitForTimeout(1200)
  await execute(page)
  await page.waitForTimeout(2500)
  for (const view of ['Form', 'JSON'] as const) {
    await selectView(page, view)
    await page.waitForTimeout(1300)
  }

  // 7. Request history — run a couple of unary calls, then open the history panel.
  await chapter(page, 'Request History', 'Every call is saved per method — replay any of them')
  await openMethod(page, /PetStoreService/i, /GetPet/i)
  await typeJson(page, '{"id": "pet-001"}')
  await execute(page)
  await typeJson(page, '{"id": "pet-002"}')
  await execute(page)
  const history = page.getByRole('button', { name: /history/i }).first()
  if (await history.count()) {
    await history.click().catch(() => {})
    await page.waitForTimeout(2500)
    // Replay an entry from history.
    const entry = page.getByText(/pet-001|pet-002/i).first()
    if (await entry.count()) {
      await entry.click().catch(() => {})
      await page.waitForTimeout(1500)
    }
  }

  // 8. Shareable URLs — click Share, which copies a deep link to the clipboard.
  await chapter(page, 'Shareable URLs', 'Copy a deep link to any request')
  const share = page.getByRole('button', { name: /^share$/i }).first()
  if (await share.count()) {
    await share.click().catch(() => {})
    await page.waitForTimeout(2500) // lingers on the "Copied!" state
  }

  // Finish on the other server to reinforce multi-target.
  await openMethod(page, /BookStoreService/i, /GetBook/i)
  await fillFormField(page, 'id', 'book-001')
  await execute(page)
  await page.waitForTimeout(2000)
})
