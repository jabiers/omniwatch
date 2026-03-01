# OmniWatch v2.1 Plan — Security & Quality Fixes

## Summary

v2.0 통합 후 발견된 보안 취약점 및 품질 이슈 수정.

## Tasks

| # | Task | Priority | Description |
|---|------|----------|-------------|
| 1 | Marketplace install RBAC | P1 | `/api/marketplace/:id/install`에 `requireRole('admin', 'operator')` 추가 |
| 2 | Usage NaN SQL fix | P1 | `days` 쿼리 파라미터 검증, NaN 방지 |
| 3 | .env.example fix | P2 | CALLBACK_URL → REDIRECT_URI 변수명 통일 |
| 4 | Remove `null as any` | P3 | v2.0 마이그레이션 기술부채 제거 (21개소) |
