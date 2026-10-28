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
- nested messages via `MessageField`
- repeated fields via `ListField`
- protobuf maps via `MapField`
- oneof groups via `OneOfField`
- `google.protobuf.Timestamp`, `Duration`, `FieldMask` and `Any` via `components/wellKnown/`
- `google.protobuf.Struct`, `Value` and `ListValue` via `components/struct/`
- wrapper messages via `WrapperField`

## Editing Conventions

Every field kind follows the same rules, so new fields should reuse the shared pieces rather than add their own controls.

**Field presence.** When editing, every field has a checkbox: ticked means its key is in the request JSON, unticked means it is left out. `FieldRenderer` adds it to every field except oneof members, whose oneof selection decides instead; `PresenceCheckbox` renders it and `fieldDefaults.ts` gives the value a field takes when ticked with nothing entered.

| Field | Ticked by | Unticked by |
| --- | --- | --- |
| scalar, enum, Timestamp, Duration, wrappers, FieldMask, Any | entering a value, or the checkbox (sends the zero value) | emptying it, or the checkbox |
| message, Struct, list, map | the checkbox (sends `{}` / `[]`) | the checkbox, even after its contents are emptied |

A framed field (message, Struct, list, map) shows its contents only while ticked, so there are no chevrons when editing. Bools are a `true` / `false` select when editing, so the value never looks like the checkbox that decides whether it is sent.

The request's JSON tab keeps exactly the ticked fields (`canonicalizeProtoJson` emitting `'present'` fields), so the form and JSON always agree, key for key. Its **Wire** view shows what the server actually receives: protobuf drops plain proto3 fields (no `optional`) at their default value, so a ticked `false`, `0` or `""` on such a field is absent there.

**Adding and removing.** Collections add with `AddButton` (`+ Add <noun>`), which appends a row that is edited in place, and remove with `RemoveButton` (✕). There is never a separate input that has to be committed with its own button.

**Keyed collections.** Map entries, struct fields and FieldMask paths are edited through `useKeyedRows` and `KeyInput`. A new row stays local until its key is committed on blur or Enter; empty and duplicate keys show an inline error instead of being dropped, and existing keys can be renamed in place. Rows keep a stable identity across key changes, so focus is not lost.

**Read-only mode.** Controls are rendered `disabled`, and add, remove and presence controls are not rendered at all. Framed fields collapse and expand with chevrons, and the toolbar offers Expand all / Collapse all.

## Internal Shape

```
components/core/SchemaRenderer.tsx   provider + controls
components/core/MessageRenderer.tsx  field iteration
components/core/FieldRenderer.tsx    descriptor kind router, presence checkboxes
components/fields/                   scalar, enum, message, list, map, oneof fields
components/wellKnown/                google.protobuf well-known types
components/struct/                   google.protobuf.Struct editing
components/shared/                   frame, add/remove buttons, key input, presence checkbox
hooks/useFormState.ts                form state, search, oneof selections
hooks/useAutoExpand.ts               nested expansion state
hooks/useKeyedRows.ts                stable rows for map entries, struct fields, mask paths
utils/                               field lookup, mutation, filtering, value parsing
stores/schemaRendererContext.tsx     shared renderer context
```

The renderer stays descriptor-native. Schema fetching happens outside this feature through `schemaLoader`.
