'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Filter, Play, Square, RotateCcw, Trash2, CheckSquare, XSquare } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { Pagination } from '../../components/pagination';
import { useToastStore } from '../../lib/toast-store';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  lastRun?: string;
  createdAt?: string;
}

const statusConfig: Record<string, { dot: string; text: string }> = {
  running: { dot: 'bg-emerald-500', text: 'text-emerald-400' },
  stopped: { dot: 'bg-gray-500', text: 'text-gray-400' },
  error: { dot: 'bg-red-500', text: 'text-red-400' },
  healing: { dot: 'bg-yellow-500', text: 'text-yellow-400' },
};

const statusOptions = ['all', 'running', 'stopped', 'error', 'healing'];
const PAGE_LIMIT = 20;

export default function AgentsPage() {
  const { addToast } = useToastStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const loadAgents = useCallback(async () => {
    try {
      const offset = (page - 1) * PAGE_LIMIT;
      const res = await apiFetch(`/api/agents?limit=${PAGE_LIMIT}&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.agents ?? []);
        setAgents(list);
        // If we got exactly PAGE_LIMIT results, there may be more pages
        setHasNextPage(list.length === PAGE_LIMIT);
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }, [page]);

  // Initial load + auto-refresh every 5s
  useEffect(() => {
    loadAgents();
    const interval = setInterval(loadAgents, 5000);
    return () => clearInterval(interval);
  }, [loadAgents]);

  const filtered = filter === 'all' ? agents : agents.filter((a) => a.status === filter);

  // Calculate total pages — if hasNextPage, allow at least one more page
  const totalPages = hasNextPage ? page + 1 : page;

  /** Send an action to a single agent */
  async function sendAction(agentId: string, action: string) {
    setActionLoading(`${agentId}-${action}`);
    try {
      if (action === 'destroy') {
        const res = await apiFetch(`/api/agents/${agentId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setAgents((prev) => prev.filter((a) => a.id !== agentId));
          setSelected((prev) => {
            const next = new Set(prev);
            next.delete(agentId);
            return next;
          });
          addToast('Agent destroyed', 'success');
        }
      } else {
        const res = await apiFetch(`/api/agents/${agentId}/${action}`, { method: 'POST' });
        if (res.ok) {
          const label =
            action === 'start' ? 'started' : action === 'stop' ? 'stopped' : 'restarted';
          addToast(`Agent ${label}`, 'success');
        }
        await loadAgents();
      }
    } catch {
      // Errors handled by apiFetch toast
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  }

  /** Bulk action on all selected agents */
  async function handleBulkAction(action: string) {
    setBulkAction(true);
    const ids = Array.from(selected);
    try {
      if (action === 'destroy') {
        await Promise.allSettled(
          ids.map((id) => apiFetch(`/api/agents/${id}`, { method: 'DELETE' })),
        );
        setAgents((prev) => prev.filter((a) => !selected.has(a.id)));
        setSelected(new Set());
      } else {
        await Promise.allSettled(
          ids.map((id) => apiFetch(`/api/agents/${id}/${action}`, { method: 'POST' })),
        );
        await loadAgents();
      }
    } catch {
      // Errors handled by apiFetch toast
    } finally {
      setBulkAction(false);
    }
  }

  /** Toggle selection for one agent */
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  /** Select/deselect all visible agents */
  function toggleSelectAll() {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((a) => a.id)));
    }
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Agents</h1>
        <Link
          href="/agents/new"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Agent
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <div className="flex gap-1">
          {statusOptions.map((s) => {
            const count = s === 'all' ? agents.length : agents.filter((a) => a.status === s).length;
            return (
              <button
                key={s}
                onClick={() => {
                  setFilter(s);
                  setSelected(new Set());
                }}
                className={`px-3 py-1 rounded-md text-xs capitalize transition-colors ${
                  filter === s
                    ? 'bg-white/[0.1] text-white'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]'
                }`}
              >
                {s}
                {count > 0 && <span className="ml-1 text-gray-600">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08]">
          <span className="text-sm text-gray-400">{selected.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => handleBulkAction('start')}
              disabled={bulkAction}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 transition-colors"
            >
              <Play className="w-3 h-3" />
              Start All
            </button>
            <button
              onClick={() => handleBulkAction('stop')}
              disabled={bulkAction}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-white/[0.05] text-gray-400 hover:bg-white/[0.1] disabled:opacity-30 transition-colors"
            >
              <Square className="w-3 h-3" />
              Stop All
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Destroy ${selected.size} agent(s)? This cannot be undone.`)) {
                  handleBulkAction('destroy');
                }
              }}
              disabled={bulkAction}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-30 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Destroy
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-card !p-0 overflow-hidden">
        <table className="w-full" aria-label="Agent list">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th scope="col" className="text-left px-4 py-3 w-10">
                <button
                  onClick={toggleSelectAll}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label={allSelected ? 'Deselect all agents' : 'Select all agents'}
                  title={allSelected ? 'Deselect all' : 'Select all'}
                >
                  {allSelected ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XSquare className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                Name
              </th>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                Type
              </th>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                Status
              </th>
              <th scope="col" className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                Last Run
              </th>
              <th scope="col" className="text-right text-xs font-medium text-gray-500 px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center text-sm text-gray-500 py-8">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-sm text-gray-500 py-8">
                  No agents found.
                </td>
              </tr>
            ) : (
              filtered.map((agent) => {
                const sc = statusConfig[agent.status] ?? statusConfig.stopped;
                const isSelected = selected.has(agent.id);
                return (
                  <tr
                    key={agent.id}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
                      isSelected ? 'bg-white/[0.03]' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(agent.id)}
                        aria-label={`Select agent ${agent.name}`}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 accent-emerald-500 cursor-pointer"
                      />
                    </td>
                    {/* Name */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/agents/${agent.id}`}
                        className="text-sm hover:text-emerald-400 transition-colors"
                      >
                        {agent.name}
                      </Link>
                    </td>
                    {/* Type */}
                    <td className="px-4 py-3 text-sm text-gray-400 capitalize">{agent.type}</td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                        <span className={`text-sm capitalize ${sc.text}`}>{agent.status}</span>
                      </span>
                    </td>
                    {/* Last Run */}
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {agent.lastRun ? new Date(agent.lastRun).toLocaleString() : '\u2014'}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => sendAction(agent.id, 'start')}
                          disabled={
                            actionLoading === `${agent.id}-start` || agent.status === 'running'
                          }
                          aria-label={`Start agent ${agent.name}`}
                          className="p-1.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Start"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => sendAction(agent.id, 'stop')}
                          disabled={
                            actionLoading === `${agent.id}-stop` || agent.status === 'stopped'
                          }
                          aria-label={`Stop agent ${agent.name}`}
                          className="p-1.5 rounded bg-white/[0.05] text-gray-400 hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Stop"
                        >
                          <Square className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => sendAction(agent.id, 'restart')}
                          disabled={!!actionLoading}
                          aria-label={`Restart agent ${agent.name}`}
                          className="p-1.5 rounded bg-white/[0.05] text-gray-400 hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Restart"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        {/* Destroy with confirm */}
                        {confirmDelete === agent.id ? (
                          <div className="flex items-center gap-1 ml-1">
                            <button
                              onClick={() => sendAction(agent.id, 'destroy')}
                              disabled={actionLoading === `${agent.id}-destroy`}
                              className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-30 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-2 py-1 rounded text-xs bg-white/[0.05] text-gray-400 hover:bg-white/[0.1] transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(agent.id)}
                            disabled={!!actionLoading}
                            aria-label={`Destroy agent ${agent.name}`}
                            className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Destroy"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && agents.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={(p) => {
            setPage(p);
            setSelected(new Set());
            setLoading(true);
          }}
        />
      )}
    </div>
  );
}
