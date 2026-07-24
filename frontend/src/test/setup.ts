// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import '@testing-library/jest-dom'

// jsdom doesn't implement ResizeObserver — stub it so components that observe
// element size (e.g. persisted drag-resize) can mount in tests.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}
