# OmniWatch v0.9 Design — Code Quality & Consistency

## Group 1: TypeScript Strict Mode

### 1-1. Web 페이지 타입 수정
```ts
// 각 페이지에 API 응답 타입 인터페이스 정의
interface AgentResponse { id: string; name: string; status: string; ... }

// fetch 결과에 타입 적용
const data: AgentResponse[] = await res.json();

// 이벤트 핸들러에 올바른 타입
onChange={(e: React.ChangeEvent<HTMLInputElement>) => ...}
onSubmit={(e: React.FormEvent) => ...}

// window 접근 시 SSR 가드
const wsUrl = typeof window !== 'undefined' ? `ws://${window.location.host}/ws` : '';
```

### 1-2. Daemon/API 타입 수정
```ts
// agent-manager.ts: SecurityEventType 사용 또는 string 리터럴 수정
logSecurityEvent(id, 'agent_start' as any, ...); → logSecurityEvent(id, 'sandbox_violation', ...);

// api/index.ts: 서버 타입 캐스팅
const server = serve({ fetch: app.fetch, port }) as unknown as Server;
```

## Group 2: apiFetch 전환

### 2-1. 마이그레이션 패턴
```ts
// Before (raw fetch)
const res = await fetch('/api/agents');
if (!res.ok) { setError('Failed'); return; }
const data = await res.json();

// After (apiFetch)
import { apiFetch } from '../../lib/api';
const res = await apiFetch('/api/agents');
if (!res.ok) return; // toast already shown by apiFetch
const data = await res.json();
```
- import 경로: 페이지 깊이에 따라 `../../lib/api` 또는 `../../../lib/api`
- POST/PUT/DELETE: `apiFetch(url, { method: 'POST', body: JSON.stringify(data) })`
- login 페이지: apiFetch 사용하되 에러 토스트 대신 자체 에러 상태 유지 (로그인 실패는 토스트 부적절)

## Group 3: 페이지네이션 + WebSocket

### 3-1. Pagination 적용 패턴
```tsx
import { Pagination } from '../../components/pagination';

const PAGE_LIMIT = 20;
const [page, setPage] = useState(1);

// fetch에 limit/offset 추가
const res = await apiFetch(`/api/marketplace?limit=${PAGE_LIMIT}&offset=${(page - 1) * PAGE_LIMIT}`);

// 하단에 Pagination 렌더링
<Pagination page={page} totalPages={Math.ceil(total / PAGE_LIMIT)} onPageChange={setPage} />
```
- marketplace: 카테고리/검색 필터와 조합
- queue: dead letters 리스트
- mesh: events 리스트
- notifications: 기존 "load more" → 표준 페이지네이션

### 3-2. WebSocket broadcast
```ts
// apps/api/src/routes/agents.ts
import { broadcast } from '../ws.js';

// POST /api/agents (생성 후)
broadcast('agent:created', { id: agent.id, name: agent.name });

// POST /api/agents/:id/start
broadcast('agent:status', { id, status: 'running' });

// POST /api/agents/:id/stop
broadcast('agent:status', { id, status: 'stopped' });
```

## Group 4: 문서 + 마무리

### 4-1. README 구조
```
# OmniWatch
## Quick Start (Docker)
## Features
## Architecture
## API Documentation (/api/docs)
## Development
## Security
## License
```

### 4-2. 성공 토스트
```ts
import { useToastStore } from '../../lib/toast-store';
const { addToast } = useToastStore();

// 에이전트 생성 성공 시
addToast('Agent created successfully', 'success');
```
