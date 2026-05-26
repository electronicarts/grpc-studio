# serviceExplorer

`serviceExplorer` renders the discovered service/method tree and owns service selection state.

Services come from `schemaCache.getServices()`, which is populated by `POST /api/grpc/discover`.

## Public API

```ts
import { ServiceExplorer, useServiceSelection } from '@/features/serviceExplorer'
```

`useServiceSelection()` returns:

```ts
{
  services,
  selectedService,
  selectedMethod,
  sharedRequestBody,
  selectService,
  selectMethod,
  clearSelection,
}
```

## Behavior

- uses `fullName` as the stable service identity
- displays `name` when present, otherwise the short name from `fullName`
- sorts services and methods alphabetically
- restores shared links after discovery finishes
- exposes selected service/method to `MethodExplorer`

## Files

```
components/ServiceExplorer.tsx   service list and expansion state
components/ServiceItem.tsx       service row
components/MethodItem.tsx        method row
components/StreamingBadge.tsx    unary/streaming label
hooks/useServiceDiscovery.ts     selection state hook
hooks/useShareableLink.ts        URL fragment restore
utils/streamingType.ts           method kind label
```
