/** OAuth routes — session-based auth with API key login + GitHub/Google OAuth */
import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { getDb } from '@omniwatch/db';
import { hashApiKey, getErrorMessage, SESSION_TTL_MS } from '@omniwatch/shared';
import type { UserRole } from '@omniwatch/shared';
import { nanoid } from 'nanoid';

/** Generate an ISO expiry timestamp N ms from now */
function expiresAt(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

/** Hash a session token with SHA-256 for storage (never store raw tokens) */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Create a session for a user, returns the raw token (stored as hash) */
function createSession(userId: string): string {
  const db = getDb();
  const id = nanoid(12);
  const token = nanoid(48);
  const tokenHash = hashToken(token);
  db.prepare('INSERT INTO oauth_sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)').run(
    id,
    userId,
    tokenHash,
    expiresAt(SESSION_TTL_MS),
  );
  return token;
}

/** Clean up expired sessions (best-effort) */
function purgeExpired(): void {
  try {
    const db = getDb();
    db.prepare("DELETE FROM oauth_sessions WHERE expires_at < datetime('now')").run();
  } catch {
    // Non-critical — ignore
  }
}

const loginSchema = z.object({
  apiKey: z.string().min(1, 'apiKey is required'),
});

/** Schema: OAuth callback query params */
const oauthCallbackSchema = z.object({
  state: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
});

export const oauthRoutes = new Hono();

// ─── POST /auth/login — API key login ────────────────────────────────

oauthRoutes.post('/auth/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { apiKey } = c.req.valid('json');
    const db = getDb();
    const keyHash = hashApiKey(apiKey);

    const user = db
      .prepare(
        'SELECT id, tenant_id, email, role, display_name, avatar_url, provider FROM users WHERE api_key_hash = ?',
      )
      .get(keyHash) as {
      id: string;
      tenant_id: string;
      email: string;
      role: UserRole;
      display_name: string | null;
      avatar_url: string | null;
      provider: string;
    } | null;

    if (!user) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    purgeExpired();
    const token = createSession(user.id);

    return c.json({
      token,
      user: {
        id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        role: user.role,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        provider: user.provider,
      },
    });
  } catch (err) {
    return c.json({ error: getErrorMessage(err) }, 500);
  }
});

// ─── POST /auth/logout — invalidate session ──────────────────────────

oauthRoutes.post('/auth/logout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'No session token provided' }, 400);
    }

    const token = authHeader.slice(7);
    const db = getDb();
    db.prepare('DELETE FROM oauth_sessions WHERE token = ?').run(hashToken(token));
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: getErrorMessage(err) }, 500);
  }
});

// ─── GET /auth/me — current user info ────────────────────────────────

oauthRoutes.get('/auth/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'No session token provided' }, 401);
    }

    const token = authHeader.slice(7);
    const db = getDb();
    const row = db
      .prepare(
        `
      SELECT u.id, u.tenant_id, u.email, u.role, u.display_name, u.avatar_url, u.provider,
             s.expires_at
      FROM oauth_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `,
      )
      .get(hashToken(token)) as {
      id: string;
      tenant_id: string;
      email: string;
      role: UserRole;
      display_name: string | null;
      avatar_url: string | null;
      provider: string;
      expires_at: string;
    } | null;

    if (!row) {
      return c.json({ error: 'Invalid or expired session' }, 401);
    }

    return c.json({
      id: row.id,
      tenant_id: row.tenant_id,
      email: row.email,
      role: row.role,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      provider: row.provider,
    });
  } catch (err) {
    return c.json({ error: getErrorMessage(err) }, 500);
  }
});

// ─── GitHub OAuth ────────────────────────────────────────────────────

oauthRoutes.get('/auth/github', (c) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return c.json({ error: 'GitHub OAuth is not configured (GITHUB_CLIENT_ID missing)' }, 501);
  }

  const redirectUri =
    process.env.GITHUB_REDIRECT_URI ?? `${new URL(c.req.url).origin}/auth/github/callback`;
  const scope = 'read:user user:email';
  const state = nanoid(32);

  // Set CSRF state cookie for validation in callback
  setCookie(c, 'oauth_state', state, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 600,
  });

  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', state);

  return c.redirect(url.toString());
});

oauthRoutes.get('/auth/github/callback', zValidator('query', oauthCallbackSchema), async (c) => {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return c.json({ error: 'GitHub OAuth is not configured' }, 501);
    }

    const { state: queryState, code } = c.req.valid('query');

    // CSRF state validation
    const cookieState = getCookie(c, 'oauth_state');
    deleteCookie(c, 'oauth_state', { path: '/' });
    if (!cookieState || !queryState || cookieState !== queryState) {
      return c.json({ error: 'CSRF validation failed' }, 403);
    }

    if (!code) {
      return c.json({ error: 'Missing code parameter' }, 400);
    }

    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      return c.json({ error: 'GitHub token exchange failed', details: tokenData.error }, 400);
    }

    // Fetch user profile
    const profileRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' },
    });
    const profile = (await profileRes.json()) as {
      id: number;
      login: string;
      name?: string;
      avatar_url?: string;
      email?: string;
    };

    // Fetch primary email if not public
    let email = profile.email;
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' },
      });
      const emails = (await emailsRes.json()) as {
        email: string;
        primary: boolean;
        verified: boolean;
      }[];
      const primary = emails.find((e) => e.primary && e.verified);
      email = primary?.email ?? emails[0]?.email ?? `${profile.login}@github.local`;
    }

    const providerId = String(profile.id);
    const displayName = profile.name ?? profile.login;
    const avatarUrl = profile.avatar_url ?? null;

    const user = upsertOAuthUser('github', providerId, email, displayName, avatarUrl);
    purgeExpired();
    const token = createSession(user.id);

    // Return JSON with token (frontend can store it)
    return c.json({
      token,
      user: {
        id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        role: user.role,
        display_name: displayName,
        avatar_url: avatarUrl,
        provider: 'github',
      },
    });
  } catch (err) {
    return c.json({ error: getErrorMessage(err) }, 500);
  }
});

// ─── Google OAuth ────────────────────────────────────────────────────

oauthRoutes.get('/auth/google', (c) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return c.json({ error: 'Google OAuth is not configured (GOOGLE_CLIENT_ID missing)' }, 501);
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ?? `${new URL(c.req.url).origin}/auth/google/callback`;
  const scope = 'openid email profile';
  const state = nanoid(32);

  // Set CSRF state cookie for validation in callback
  setCookie(c, 'oauth_state', state, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 600,
  });

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scope);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'offline');

  return c.redirect(url.toString());
});

oauthRoutes.get('/auth/google/callback', zValidator('query', oauthCallbackSchema), async (c) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return c.json({ error: 'Google OAuth is not configured' }, 501);
    }

    const { state: queryState, code } = c.req.valid('query');

    // CSRF state validation
    const cookieState = getCookie(c, 'oauth_state');
    deleteCookie(c, 'oauth_state', { path: '/' });
    if (!cookieState || !queryState || cookieState !== queryState) {
      return c.json({ error: 'CSRF validation failed' }, 403);
    }

    if (!code) {
      return c.json({ error: 'Missing code parameter' }, 400);
    }

    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ?? `${new URL(c.req.url).origin}/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      return c.json({ error: 'Google token exchange failed', details: tokenData.error }, 400);
    }

    // Fetch user info
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await profileRes.json()) as {
      id: string;
      email: string;
      name?: string;
      picture?: string;
    };

    const user = upsertOAuthUser(
      'google',
      profile.id,
      profile.email,
      profile.name ?? profile.email,
      profile.picture ?? null,
    );
    purgeExpired();
    const token = createSession(user.id);

    return c.json({
      token,
      user: {
        id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        role: user.role,
        display_name: profile.name ?? profile.email,
        avatar_url: profile.picture ?? null,
        provider: 'google',
      },
    });
  } catch (err) {
    return c.json({ error: getErrorMessage(err) }, 500);
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────

/** Find or create a user from an OAuth provider */
function upsertOAuthUser(
  provider: string,
  providerId: string,
  email: string,
  displayName: string,
  avatarUrl: string | null,
): { id: string; tenant_id: string; email: string; role: UserRole } {
  const db = getDb();

  // Check if user already exists with this provider + provider_id
  const existing = db
    .prepare('SELECT id, tenant_id, email, role FROM users WHERE provider = ? AND provider_id = ?')
    .get(provider, providerId) as {
    id: string;
    tenant_id: string;
    email: string;
    role: UserRole;
  } | null;

  if (existing) {
    // Update display name and avatar
    db.prepare('UPDATE users SET display_name = ?, avatar_url = ?, email = ? WHERE id = ?').run(
      displayName,
      avatarUrl,
      email,
      existing.id,
    );
    return existing;
  }

  // Check if user exists by email (link accounts)
  const byEmail = db
    .prepare('SELECT id, tenant_id, email, role FROM users WHERE email = ?')
    .get(email) as { id: string; tenant_id: string; email: string; role: UserRole } | null;

  if (byEmail) {
    // Link provider to existing account
    db.prepare(
      'UPDATE users SET provider = ?, provider_id = ?, display_name = ?, avatar_url = ? WHERE id = ?',
    ).run(provider, providerId, displayName, avatarUrl, byEmail.id);
    return byEmail;
  }

  // Create new user in default tenant with viewer role
  const id = nanoid(8);
  db.prepare(
    `
    INSERT INTO users (id, tenant_id, email, role, api_key_hash, provider, provider_id, display_name, avatar_url)
    VALUES (?, 'default', ?, 'viewer', '', ?, ?, ?, ?)
  `,
  ).run(id, email, provider, providerId, displayName, avatarUrl);

  return { id, tenant_id: 'default', email, role: 'viewer' };
}
