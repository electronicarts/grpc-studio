# schemaRenderer

`schemaRenderer` renders protobuf messages from `@bufbuild/protobuf` descriptor objects. Its input schema is a `DescMessage`, not a custom schema JSON model.

## Component

```tsx
import ProtoMessageRenderer from '@/features/schemaRenderer'

<ProtoMessageRenderer
  schema={descMessage}
  data={formData}
  onChange={setFormData}
/>
```

Props:

| Prop | Type | Purpose |
| --- | --- | --- |
| `schema` | `DescMessage \| null` | Message descriptor to render |
| `data` | `Record<string, unknown>` | Current message data |
| `onChange` | `(data) => void` | Receives updated message data |
| `readOnly` | `boolean` | Disables editing |
| `defaultCollapsed` | `boolean` | Starts nested sections collapsed |
| `showControls` | `boolean` | Shows search and expand/collapse controls |
| `hideEmptyFields` | `boolean` | Hides empty fields in read-only response views |

## Supported Field Shapes

- scalar fields via `ScalarField`
- enums via `EnumField`
- nested messages via `NestedMessageField`
- repeated fields via `RepeatedField`
- protobuf maps via `MapField`
- oneof groups via `OneOfField`
- `google.protobuf.Timestamp` via `TimestampField`
- wrapper messages via `NestedMessageField`

## Internal Shape

```
components/SchemaRenderer.tsx    provider + controls
components/MessageRenderer.tsx   field iteration
components/FieldRenderer.tsx     descriptor kind router
hooks/useFormState.ts            form state, search, oneof selections
hooks/useAutoExpand.ts           nested expansion state
utils/                           field lookup, mutation, filtering, value parsing
stores/schemaRendererContext.tsx shared renderer context
```

The renderer stays descriptor-native. Schema fetching happens outside this feature through `schemaLoader`.
