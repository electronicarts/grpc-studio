// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'

const SchemaLoadingScreen: React.FC = () => {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex h-96 items-center justify-center">
        <div className="w-full max-w-md px-8 text-center">
          <img src="/logo.svg" alt="gRPC Studio" className="mx-auto mb-6 size-16 animate-pulse rounded-2xl" />
          <h3 className="mb-3 text-2xl font-semibold text-foreground">Connecting to gRPC Servers</h3>
          <p className="mx-auto mb-6 text-lg text-muted-foreground">
            Discovering services from configured servers...
          </p>

          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-2 w-1/3 animate-[indeterminate_1.5s_ease-in-out_infinite] rounded-full bg-info" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SchemaLoadingScreen
