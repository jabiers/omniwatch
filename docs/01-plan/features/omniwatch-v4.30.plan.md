# OmniWatch v4.30 Plan — Security & Error Handling Hardening

## Scope
5 security and error handling fixes addressing command injection risk, orphaned data, and missing error boundaries.

## Tasks

| # | ID | Category | File | Description | Priority |
|---|-----|----------|------|-------------|----------|
| 1 | SEC-1 | Security | `agents.ts:465` | Exec command injection: pipes/semicolons split but only first token validated. `ls | rm -rf /` passes because `ls` is in allowlist. Reject commands containing `\|;&<>\`` entirely | Critical |
| 2 | SEC-2 | Security | `tenants.ts:182` | Email uniqueness check is global (`SELECT id FROM users WHERE email = ?`). Cross-tenant admin can enumerate emails via 409 response. Scope to tenant_id | Medium |
| 3 | ERR-1 | Error Handling | `tenants.ts:212-226` | DELETE /users/:id lacks try-catch. DB errors propagate as unhandled exceptions | Medium |
| 4 | ERR-2 | Error Handling | `marketplace.ts:228-239` | DELETE /marketplace/:id lacks try-catch | Medium |
| 5 | DATA-1 | Data Integrity | `chat.ts:67-69` | User message saved before AI call. If AI fails (line 72→catch), orphaned user message remains in history without response. Move insert into transaction with AI response | Medium |

## Files to Change
- `apps/api/src/routes/agents.ts` — reject pipe/redirect/semicolon in exec command
- `apps/api/src/routes/tenants.ts` — scope email check to tenant, add try-catch to DELETE
- `apps/api/src/routes/marketplace.ts` — add try-catch to DELETE
- `apps/api/src/routes/chat.ts` — defer user message save or use transaction

## Risk Assessment
- SEC-1 is highest priority: command injection vector in exec endpoint
- All changes are backward-compatible, no API contract changes
