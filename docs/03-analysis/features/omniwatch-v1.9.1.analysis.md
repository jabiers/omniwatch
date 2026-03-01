# OmniWatch v1.9.1 Gap Analysis — Stats Sync & Accuracy

## Summary

| Item               | Before        | After         | Status |
| ------------------ | ------------- | ------------- | ------ |
| README tests       | 380+, 41 files | 376+, 40 files | Fixed  |
| README.ko tests    | 380+, 41 files | 376+, 40 files | Fixed  |
| README endpoints   | 62+           | 65+           | Fixed  |
| README.ko endpoints| 62+           | 65+           | Fixed  |
| Promo endpoints    | 62            | 65            | Fixed  |
| Promo releases     | 16            | 15            | Fixed  |
| CLI version        | hardcoded 0.4.0 | APP_VERSION  | Fixed  |

## Verification

| Check              | Result |
| ------------------ | ------ |
| `pnpm build`       | 6/6 packages passed |
| `npx vitest run`   | 352 tests, 34 files passed |
| Promo build        | dist/ generated (231 KB JS) |
| Release tag count  | 15 (matches promo STATS) |

## Match Rate

**100%** — All planned items implemented and verified.

## Files Changed

- `README.md` — tests 376+/40 files, endpoints 65+
- `README.ko.md` — tests 376+/40 files, endpoints 65+
- `promo/src/lib/constants.ts` — endpoints 65, releases 15
- `apps/cli/src/index.ts` — import APP_VERSION from @omniwatch/shared
