// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

export interface SchemaLoaderState {
  loading: boolean
  error: string | null
  reloadError: string | null
  targetServer: string
  lastFetchedAt: Date | null
  lastReloadSuccess: boolean | null
  reloading: boolean
  reload: () => void
}
