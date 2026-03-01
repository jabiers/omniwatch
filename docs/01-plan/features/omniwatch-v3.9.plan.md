# OmniWatch v3.9.0 Plan — Security Hardening

## Overview
벌크 엔드포인트 테넌트 격리, 레시피 설치 보안, SSRF 방지,
웹훅 URL 마스킹을 통해 보안을 강화한다.

## Background
- Bulk endpoint: 에이전트 ID별 테넌트 소유권 검증 없이 일괄 작업 가능 (취약점)
- Bulk destroy: 관리자 전용 제한 미적용 (위험한 작업)
- Recipe install: 에이전트 생성 시 tenantId 누락 → 다른 테넌트 접근 가능
- Config: 외부 URL 설정 시 SSRF (Server-Side Request Forgery) 방어 없음
- Config GET: webhook URL이 평문 노출 (API key는 마스킹 적용 중)

## Goals
1. **Bulk Tenant Isolation**: 에이전트 ID별 소유권 확인, 타 테넌트 에이전트 접근 차단
2. **Bulk Destroy Admin-Only**: destroy 액션은 admin 역할만 허용
3. **Recipe Install TenantId**: 에이전트 생성 시 tenantId 전달
4. **SSRF Blocklist**: 프라이빗 IP, localhost, HTTP 차단 (Zod refinement)
5. **Webhook URL Masking**: Config GET 응답에서 webhook URL 마스킹

## Technical Approach

### Bulk Tenant Isolation
```typescript
// Each agent ID: verify tenant ownership before operation
for (const agentId of agentIds) {
  const agent = db.getAgent(agentId);
  if (agent.tenant_id !== tenantId) {
    return c.json({ error: 'Forbidden' }, 403);
  }
}
// destroy action: requireRole('admin')
```

### SSRF Prevention (Zod refinement)
```typescript
const configSchema = z.object({
  webhookUrl: z.string().url().refine((url) => {
    const hostname = new URL(url).hostname;
    // Block: 10.x, 172.16-31.x, 192.168.x, 127.x, localhost
    // Block: http:// (require https)
    return !isPrivateIP(hostname) && url.startsWith('https://');
  }),
});
```

### Webhook Masking
```typescript
// GET /api/config: mask webhook URLs like API keys
if (config.webhookUrl) {
  config.webhookUrl = config.webhookUrl.replace(/\/\/(.+)@/, '//***@')
    .replace(/(https:\/\/.{4})(.+)/, '$1****');
}
```

## Scope
- ✅ Bulk endpoint 테넌트 격리 (에이전트별 소유권 검증)
- ✅ Bulk destroy admin-only 제한
- ✅ Recipe install tenantId 전달
- ✅ SSRF blocklist (private IP + localhost + HTTP)
- ✅ Webhook URL 마스킹
- ✅ 보안 테스트 6개 추가

## Risk
- Bulk 작업 성능 저하 (에이전트별 DB 조회 추가)
- SSRF blocklist 우회 가능성 (IPv6, DNS rebinding)
- 기존 HTTP webhook 사용 중인 환경 호환성 이슈
