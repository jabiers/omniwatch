import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3457';

test.describe('Vigil Smoke Tests', () => {
  test('login page loads', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.locator('h1')).toContainText('Vigil');
    await expect(page.locator('input[type="password"], input[placeholder*="API"]')).toBeVisible();
  });

  test('unauthenticated redirect to login', async ({ page }) => {
    await page.goto(BASE);
    // Should redirect to /login since no auth
    await page.waitForURL('**/login', { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('health endpoint responds', async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('API agents endpoint responds', async ({ request }) => {
    const res = await request.get(`${BASE}/api/agents`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('API system status responds', async ({ request }) => {
    const res = await request.get(`${BASE}/api/system/status`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('uptime');
  });
});
