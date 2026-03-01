# OmniWatch v3.0.0 Completion Report

## Summary
API 서버와 Web 서버를 Next.js 단일 프로세스로 통합 완료.
3456 + 3457 이중 포트에서 3457 단일 포트로 아키텍처 간소화.

## Changes

### New Files
| File | Description |
|------|-------------|
| `apps/web/src/instrumentation.ts` | Next.js 서버 시작 시 daemon engine 초기화 |
| `apps/web/src/app/health/route.ts` | /health 엔드포인트 (Hono 위임) |
| `apps/web/server.custom.mjs` | Production 서버 (Next.js + WebSocket) |

### Modified Files
| File | Description |
|------|-------------|
| `apps/web/next.config.ts` | API rewrites 제거, instrumentation 활성화 |
| `apps/web/package.json` | @omniwatch/daemon 의존성 추가 |
| `apps/api/tsup.config.ts` | ws.ts entry 추가 |
| `apps/api/package.json` | ./ws export 추가 |
| `apps/api/src/app.ts` | CORS origins 업데이트 |
| `Dockerfile` | Unified production target |
| `docker-compose.yml` | Single service (omniwatch:3457) |
| `package.json` | dev script 간소화, version 3.0.0 |
| `README.md` / `README.ko.md` | Architecture description 업데이트 |

## Architecture (Before → After)

### Before (v2.x)
```
[CLI] --HTTP--> [API Server :3456 (Hono + Engine)]
[Browser] --> [Next.js :3457] --proxy--> [API :3456]
Docker: 2 services (api + web)
```

### After (v3.0)
```
[CLI] --HTTP--> [Next.js :3457 (Dashboard + API + Engine + WS)]
[Browser] --> [Next.js :3457]
Docker: 1 service (omniwatch)
```

## Metrics
- Build: 6/6 packages ✅
- Web tests: 46 passed (12 files) ✅
- Root tests: 344/349 (5 pre-existing failures)
- Match Rate: 95%

## PDCA Status: Completed ✅
