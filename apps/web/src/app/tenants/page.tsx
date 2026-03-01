"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Users,
  Plus,
  Trash2,
  Key,
  Shield,
  Loader2,
  X,
  Copy,
  CheckCircle,
} from "lucide-react";
import { apiFetch } from "../../lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Tenant {
  id: string;
  name: string;
  plan: string;
  max_agents: number;
  created_at: string;
}

interface User {
  id: string;
  tenant_id: string;
  email: string;
  role: "admin" | "operator" | "viewer";
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const roleBadge: Record<string, string> = {
  admin: "bg-red-500/10 text-red-400",
  operator: "bg-amber-500/10 text-amber-400",
  viewer: "bg-emerald-500/10 text-emerald-400",
};

const planBadge: Record<string, string> = {
  free: "bg-gray-500/10 text-gray-400",
  pro: "bg-blue-500/10 text-blue-400",
  enterprise: "bg-purple-500/10 text-purple-400",
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function TenantsPage() {
  // Data
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");

  // Loading
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);

  // Create tenant modal
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    name: "",
    plan: "free",
    max_agents: 10,
  });
  const [tenantCreating, setTenantCreating] = useState(false);

  // Create user modal
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [userForm, setUserForm] = useState({
    tenant_id: "",
    email: "",
    role: "viewer" as "admin" | "operator" | "viewer",
  });
  const [userCreating, setUserCreating] = useState(false);

  // API key reveal modal
  const [revealedApiKey, setRevealedApiKey] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);

  // Delete confirm
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<string | null>(
    null
  );

  // Error / toast
  const [error, setError] = useState<string | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Data loading                                                     */
  /* ---------------------------------------------------------------- */

  const loadTenants = useCallback(async () => {
    try {
      const res = await apiFetch("/api/tenants");
      if (res.ok) {
        const data = (await res.json()) as Tenant[] | { tenants?: Tenant[] };
        const list: Tenant[] = Array.isArray(data)
          ? data
          : data.tenants ?? [];
        setTenants(list);
        // Auto-select first tenant if none selected
        if (!selectedTenantId && list.length > 0) {
          setSelectedTenantId(list[0].id);
        }
      }
    } catch (_) {
      setError("Failed to load tenants. API may be unavailable.");
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId]);

  const loadUsers = useCallback(async (tenantId: string) => {
    if (!tenantId) return;
    setUsersLoading(true);
    try {
      const res = await apiFetch(`/api/users?tenant_id=${tenantId}`);
      if (res.ok) {
        const data = (await res.json()) as User[] | { users?: User[] };
        setUsers(Array.isArray(data) ? data : data.users ?? []);
      }
    } catch (_) {
      // API not available
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  useEffect(() => {
    if (selectedTenantId) {
      loadUsers(selectedTenantId);
    } else {
      setUsers([]);
    }
  }, [selectedTenantId, loadUsers]);

  /* ---------------------------------------------------------------- */
  /*  Actions                                                          */
  /* ---------------------------------------------------------------- */

  /** Create a new tenant */
  async function handleCreateTenant() {
    setTenantCreating(true);
    setError(null);
    try {
      const res = await apiFetch("/api/tenants", {
        method: "POST",
        body: JSON.stringify(tenantForm),
      });
      if (res.ok) {
        setShowCreateTenant(false);
        setTenantForm({ name: "", plan: "free", max_agents: 10 });
        await loadTenants();
      } else {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message ?? `Failed to create tenant (${res.status})`);
      }
    } catch (_) {
      setError("Failed to create tenant. API may be unavailable.");
    } finally {
      setTenantCreating(false);
    }
  }

  /** Create a new user and reveal the API key */
  async function handleCreateUser() {
    setUserCreating(true);
    setError(null);
    try {
      const res = await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify(userForm),
      });
      if (res.ok) {
        const data = (await res.json()) as { apiKey?: string };
        setShowCreateUser(false);
        setUserForm({ tenant_id: "", email: "", role: "viewer" });
        // Show API key in modal
        if (data.apiKey) {
          setRevealedApiKey(data.apiKey);
          setKeyCopied(false);
        }
        await loadUsers(selectedTenantId);
      } else {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message ?? `Failed to create user (${res.status})`);
      }
    } catch (_) {
      setError("Failed to create user. API may be unavailable.");
    } finally {
      setUserCreating(false);
    }
  }

  /** Delete a user */
  async function handleDeleteUser(userId: string) {
    try {
      const res = await apiFetch(`/api/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message ?? `Failed to delete user (${res.status})`);
      }
    } catch (_) {
      setError("Failed to delete user. API may be unavailable.");
    } finally {
      setConfirmDeleteUser(null);
    }
  }

  /** Copy API key to clipboard */
  async function copyApiKey() {
    if (!revealedApiKey) return;
    try {
      await navigator.clipboard.writeText(revealedApiKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    } catch (_) {
      // Fallback: select text
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading tenants...
      </div>
    );
  }

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <Shield className="w-6 h-6 text-emerald-400" />
            Tenant &amp; User Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage tenants, users, and API key provisioning
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-3 hover:text-red-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/*  TENANTS SECTION                                              */}
      {/* ============================================================ */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            Tenants
            <span className="text-xs text-gray-500 font-normal">
              ({tenants.length})
            </span>
          </h2>
          <button
            onClick={() => setShowCreateTenant(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
          >
            <Plus className="w-3 h-3" />
            New Tenant
          </button>
        </div>

        {tenants.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            No tenants found. Create one to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                    Name
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                    ID
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                    Plan
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">
                    Max Agents
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => {
                  const isActive = tenant.id === selectedTenantId;
                  return (
                    <tr
                      key={tenant.id}
                      onClick={() => setSelectedTenantId(tenant.id)}
                      className={`border-b border-white/[0.04] cursor-pointer transition-colors ${
                        isActive
                          ? "bg-emerald-500/5"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-medium">
                        {tenant.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                        {tenant.id.length > 12
                          ? `${tenant.id.slice(0, 12)}...`
                          : tenant.id}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs capitalize ${
                            planBadge[tenant.plan] ?? planBadge.free
                          }`}
                        >
                          {tenant.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-400 font-mono">
                        {tenant.max_agents}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  USERS SECTION                                                */}
      {/* ============================================================ */}
      <div className="glass-card !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            Users
            {selectedTenant && (
              <span className="text-xs text-gray-500 font-normal">
                &mdash; {selectedTenant.name}
              </span>
            )}
          </h2>
          <button
            onClick={() => {
              setUserForm({
                tenant_id: selectedTenantId,
                email: "",
                role: "viewer",
              });
              setShowCreateUser(true);
            }}
            disabled={!selectedTenantId}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-3 h-3" />
            New User
          </button>
        </div>

        {!selectedTenantId ? (
          <p className="text-sm text-gray-500 text-center py-6">
            Select a tenant above to view its users.
          </p>
        ) : usersLoading ? (
          <div className="flex items-center justify-center py-6 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            No users in this tenant. Create one to provision an API key.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                    Email
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                    Role
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                    User ID
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                    Created
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 text-sm">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs capitalize ${
                          roleBadge[user.role] ?? roleBadge.viewer
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                      {user.id.length > 12
                        ? `${user.id.slice(0, 12)}...`
                        : user.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        {confirmDeleteUser === user.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteUser(null)}
                              className="px-2 py-1 rounded text-xs bg-white/[0.05] text-gray-400 hover:bg-white/[0.1] transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteUser(user.id)}
                            className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  CREATE TENANT MODAL                                          */}
      {/* ============================================================ */}
      {showCreateTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowCreateTenant(false)}
          />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-gray-900 border border-gray-700 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                Create Tenant
              </h3>
              <button
                onClick={() => setShowCreateTenant(false)}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Tenant Name
                </label>
                <input
                  type="text"
                  value={tenantForm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setTenantForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Acme Corp"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50 placeholder:text-gray-600"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Plan
                </label>
                <select
                  value={tenantForm.plan}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setTenantForm((f) => ({ ...f, plan: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Max Agents
                </label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={tenantForm.max_agents}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setTenantForm((f) => ({
                      ...f,
                      max_agents: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreateTenant(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTenant}
                disabled={!tenantForm.name.trim() || tenantCreating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {tenantCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  CREATE USER MODAL                                            */}
      {/* ============================================================ */}
      {showCreateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowCreateUser(false)}
          />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-gray-900 border border-gray-700 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Create User
              </h3>
              <button
                onClick={() => setShowCreateUser(false)}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Tenant
                </label>
                <select
                  value={userForm.tenant_id}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setUserForm((f) => ({ ...f, tenant_id: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="">Select tenant...</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Email
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setUserForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50 placeholder:text-gray-600"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Role
                </label>
                <select
                  value={userForm.role}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setUserForm((f) => ({
                      ...f,
                      role: e.target.value as "admin" | "operator" | "viewer",
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="viewer">Viewer</option>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  Admin: full access &middot; Operator: manage agents &middot;
                  Viewer: read-only
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreateUser(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={
                  !userForm.tenant_id || !userForm.email.trim() || userCreating
                }
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {userCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create &amp; Generate Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  API KEY REVEAL MODAL                                         */}
      {/* ============================================================ */}
      {revealedApiKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-gray-900 border border-gray-700 p-6 space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Key className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium">API Key Generated</h3>
                <p className="text-xs text-gray-500">
                  Copy this key now. It will not be shown again.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-black/40 border border-amber-500/20">
              <code className="flex-1 text-sm font-mono text-amber-400 break-all select-all">
                {revealedApiKey}
              </code>
              <button
                onClick={copyApiKey}
                className="shrink-0 p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
                title="Copy to clipboard"
              >
                {keyCopied ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>

            <div className="px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-xs text-amber-400/80">
              Store this API key securely. It grants access to the OmniWatch API
              based on the user&apos;s assigned role. You will not be able to
              retrieve this key after closing this dialog.
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setRevealedApiKey(null)}
                className="px-4 py-2 rounded-lg text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              >
                I&apos;ve Saved the Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
