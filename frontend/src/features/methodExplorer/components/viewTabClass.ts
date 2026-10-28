// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/** Class names for the container of a ViewTabs-style segmented control. */
export const segmentedControlClass = 'flex items-center rounded-lg bg-muted p-0.5'

/** Class names for one segment of a ViewTabs-style segmented control. */
export const viewTabClass = (active: boolean) =>
  `flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
    active
      ? 'bg-white dark:bg-gray-700 text-foreground shadow-sm'
      : 'text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
  }`
