# OmniWatch v0.2 Gap Analysis Report

> **Feature**: omniwatch-v0.2
> **Date**: 2026-02-27
> **Design Doc**: docs/02-design/features/omniwatch-v0.2.design.md
> **Match Rate**: 97%
> **Iteration**: 0 (initial check)

---

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| 1. Component Match | 95% | PASS |
| 2. IPC Protocol | 100% | PASS |
| 3. Notification System | 100% | PASS |
| 4. Config Schema | 100% | PASS |
| 5. AST Validator | 100% | PASS |
| 6. TUI Dashboard | 90% | PASS |
| 7. Chat System | 100% | PASS |
| 8. Agent Templates | 100% | PASS |
| 9. Watch Command | 100% | PASS |
| 10. Test Coverage | 75% | WARNING |
| 11. Build Config | 100% | PASS |
| 12. FR Completeness | 94% | PASS |
| **Overall (Weighted)** | **97%** | **PASS** |

---

## Gaps Found

### 1. Missing: `ChatInterface.tsx` (Low)

- **Design**: `src/cli/ui/ChatInterface.tsx` specified in project structure
- **Implementation**: Chat UI implemented via readline in `src/cli/commands/chat.ts`
- **Decision**: Readline approach is simpler and appropriate for v0.2

### 2. Partial: StatusBar Memory/Uptime (Low)

- **Design**: FR-05 specifies "system stats header (agent count, memory, uptime)"
- **Implementation**: StatusBar shows agent count, running count, error count only
- **Missing**: Memory usage and uptime display

### 3. Missing: `tests/watch-preview.test.ts` (Medium)

- **Design**: Integration test for `watch --preview` flow specified in test plan
- **Implementation**: Not created

---

## FR Completeness (17/18)

| FR | Requirement | Status |
|----|-------------|:------:|
| FR-01 | `omni dash` TUI dashboard | Done |
| FR-02 | Real-time agent status table | Done |
| FR-03 | Log viewer on agent selection | Done |
| FR-04 | Keyboard shortcuts q/r/s/x/d | Done |
| FR-05 | System stats header (memory, uptime) | Partial |
| FR-06 | Slack webhook notification | Done |
| FR-07 | Discord webhook (embed) | Done |
| FR-08 | Telegram Bot API notification | Done |
| FR-09 | Config set for notification channels | Done |
| FR-10 | Per-channel severity filtering | Done |
| FR-11 | Notification plugin system | Done |
| FR-12 | `omni chat <id>` interactive mode | Done |
| FR-13 | Natural language agent modification | Done |
| FR-14 | Natural language status/log query | Done |
| FR-15 | Code apply + restart after confirm | Done |
| FR-16 | AST-based code validation (acorn) | Done |
| FR-17 | `watch --preview` code preview | Done |
| FR-18 | Agent preset templates | Done |

---

## Improvements Over Design

| # | Enhancement | File |
|---|------------|------|
| 1 | `clearChannels()` utility for testing | notification-channels/registry.ts |
| 2 | Error handling in notifier (try/catch + failed status) | notifier.ts |
| 3 | Dashboard onAction (start/stop/destroy from TUI) | Dashboard.tsx |
| 4 | Agent code read fallback in chat-handler | chat-handler.ts |
| 5 | `listTemplates()` function | base-prompt.ts |
| 6 | Response error checking in all channels | slack/discord/telegram.ts |

---

## Verification Results

| Check | Result |
|-------|:------:|
| `tsc --noEmit` | Pass (0 errors) |
| `npm run build` (tsup) | Pass (3 entry points) |
| `npm test` (vitest) | Pass (67/67 tests, 11 files) |
| Match Rate >= 90% | Pass (97%) |

---

## Conclusion

Match rate 97%는 90% 기준을 초과합니다. 3개의 minor gap (ChatInterface.tsx → readline 대체, StatusBar 부분 구현, integration test 미작성)이 있으나 모두 Low~Medium severity로 핵심 기능에 영향 없음. Report 단계로 진행 가능합니다.
