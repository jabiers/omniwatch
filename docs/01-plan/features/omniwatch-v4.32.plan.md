# OmniWatch v4.32 Plan — README Sync & Test Coverage

## Scope
README stats synchronization and test coverage expansion for recently added endpoints.

## Tasks

| # | ID | Category | Description | Priority |
|---|-----|----------|-------------|----------|
| 1 | DOC-1 | Documentation | README.md stats sync: test count (554→current), page count (14→15 with /help), table count (18→19 with agent_chat_messages), endpoint count, migration count (6→7) | Medium |
| 2 | DOC-2 | Documentation | README-ko.md sync with same stats | Medium |
| 3 | TEST-1 | Testing | Add tests for chat endpoints (GET/DELETE/summarize chat history) | Medium |
| 4 | TEST-2 | Testing | Add tests for exec endpoint (allowed/blocked commands, tenant isolation) | Medium |
| 5 | TEST-3 | Testing | Add tests for marketplace seed and delete endpoints | Low |

## Files to Change
- `README.md` — stats update
- `README-ko.md` — stats update
- `tests/api-routes.test.ts` — new test cases

## Risk Assessment
- Documentation-only and test-only changes, zero production code risk
