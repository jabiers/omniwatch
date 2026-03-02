# OmniWatch v4.16 Plan — Alert Operator Mapping + notify_channels Type Fix

## Goal

Fix two data format mismatches between the analytics frontend and the alert rules API:
1. Operator symbols (`>`, `<`, `>=`, `<=`) vs API enum values (`gt`, `lt`, `gte`, `lte`)
2. `notify_channels` sent as JSON string instead of native array

## Scope

- Add `operatorMap` in `handleAlertSubmit` to convert display symbols (`>`, `<`, `>=`, `<=`) to API enum values (`gt`, `lt`, `gte`, `lte`)
- Add `reverseOp` in `openEditForm` to convert API enum values back to display symbols for the form
- Change `notify_channels` from `JSON.stringify(channelsArray)` to `channelsArray` (pass native array)

## Files

- `apps/web/src/app/analytics/page.tsx` — Operator mapping (both directions) + notify_channels type fix

## Success Criteria

- Creating an alert rule with operator `>` sends `gt` to the API
- Editing an alert rule with operator `gt` displays `>` in the form
- `notify_channels` is sent as a JSON array, not a stringified string
- Build passes
- All 526 tests pass
