// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

export const HOME_NAVIGATION_EVENT = 'grpc-studio:navigate-home'

export function requestHomeNavigation(): void {
  window.dispatchEvent(new Event(HOME_NAVIGATION_EVENT))
}
