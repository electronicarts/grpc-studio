# gRPC Studio Demo

These light-mode captures use the bundled PetStore (`:50051`) and BookStore (`:50052`) example services with gRPC reflection enabled. Run `npm run dev:all` from the repo root to start both alongside the UI.

## Walkthrough

A single continuous tour, split into labeled chapters:

1. **Multi-server support** — connect to PetStore and BookStore at once
2. **Searchable services & methods** — filter the tree as you type
3. **Tabs** — open several methods side by side, duplicate one
4. **Form, JSON & Schema** — edit requests three ways, kept in sync
5. **Streaming** — server and bidirectional streaming, live
6. **Request history** — replay past calls per method
7. **Shareable URLs** — copy a deep link to any request

The MP4 is small enough to embed; the GIF is the fallback for renderers that don't play video.

<video src="grpc-studio-light-mode.mp4" controls width="900"></video>

![gRPC Studio light-mode walkthrough](grpc-studio-light-mode.gif)

## Regenerating these assets

The screenshots and the walkthrough video are captured programmatically from the live app:

```bash
npm run dev:all        # start frontend + backend + PetStore + BookStore
npm run demo:capture   # drive the UI, write screenshots + record the walkthrough
npm run demo:gif       # convert the recording to grpc-studio-light-mode.gif  (needs ffmpeg)
npm run demo:mp4       # convert the recording to grpc-studio-light-mode.mp4  (needs ffmpeg)
```

## Screenshot Gallery

| Flow | Capture |
| ---- | ------- |
| Server selection (PetStore + BookStore) | ![Server selection](00-server-selector.png) |
| Service discovery and all RPC mode badges | ![Service discovery and RPC modes](01-service-and-rpc-modes.png) |
| Unary request form input | ![Unary request form input](02-unary-request-form.png) |
| Unary request JSON input | ![Unary request JSON input](03-unary-request-json.png) |
| Unary request schema input | ![Unary request schema input](04-unary-request-schema.png) |
| Unary response form output | ![Unary response form output](05-unary-response-form.png) |
| Unary response JSON output | ![Unary response JSON output](06-unary-response-json.png) |
| Unary response schema output | ![Unary response schema output](07-unary-response-schema.png) |
| Share action copied state | ![Share action copied state](08-share-action-copied.png) |
| Per-method request history | ![Per-method request history](09-request-history.png) |
| Server streaming | ![Server streaming WatchPets](10-server-streaming-watchpets.png) |
| Client streaming | ![Client streaming BulkCreatePets](11-client-streaming-bulk-create.png) |
| Bidirectional streaming | ![Bidirectional streaming MonitorHealth](12-bidi-streaming-monitor-health.png) |
