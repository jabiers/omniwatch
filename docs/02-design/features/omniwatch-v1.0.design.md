# OmniWatch v1.0 Design — Stable Release

## Group 1: TypeScript Zero Errors

### 1-1. 이벤트 타입
현재 `onChange={(e: React.ChangeEvent<HTMLInputElement>) => setX(e.target.value)}` 패턴이
TS에서 `.value` 접근 불가 오류 발생. 원인: tsconfig의 `lib`에 DOM이 있지만 Next.js의 타입 체크 방식 차이.

해결: 각 이벤트 핸들러에서 `(e.target as HTMLInputElement).value` 캐스팅 또는 인라인이 아닌 별도 함수로 분리.

### 1-2. window + DOM
- `typeof window !== 'undefined'` 가드는 있지만 `window` 자체가 타입 스코프에 없음
- 해결: `apps/web/tsconfig.json`의 compilerOptions.lib에 `"dom"` 추가 확인
- scrollIntoView: DOM lib 포함 시 자동 해결

### 1-3. daemon + API
- agent-manager.ts: void 표현식 truthiness 체크 → 별도 변수로 분리
- route.ts: `declare module '@omniwatch/api/app'` 선언 파일 추가

## Group 2: Lint & Format

### ESLint flat config
```js
// eslint.config.js
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
export default [{ files: ['**/*.ts', '**/*.tsx'], languageOptions: { parser: tsParser }, plugins: { '@typescript-eslint': tsPlugin } }];
```

### Prettier
```json
// .prettierrc
{ "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }
```

## Group 3: Docker

### Dockerfile 수정
- web 빌드 스테이지 추가 (Next.js standalone output)
- 또는 단일 컨테이너에서 API + static export

### docker-compose
```yaml
services:
  api:
    build: { context: ., target: api }
    ports: ["3456:3456"]
    volumes: [omniwatch-data:/data]
  web:
    build: { context: ., target: web }
    ports: ["3457:3000"]
    depends_on: [api]
```

## Group 4: Release Workflow
```yaml
# .github/workflows/release.yml
on: push: tags: ['v*']
jobs:
  release:
    steps: checkout → gh release create
```
