'use client';

import { useEffect, useState, useCallback } from 'react';
import { Network, Radio, ArrowRight, RefreshCw } from 'lucide-react';
import { Pagination } from '../../components/pagination';
import { apiFetch } from '../../lib/api';

interface MeshEvent {
  id: number;
  publisher_id: string;
  topic: string;
  payload: string;
  created_at: string;
}

interface Subscription {
  agent_id: string;
  agent_name: string;
  topic: string;
}

const PAGE_LIMIT = 20;

export default function MeshPage() {
  const [events, setEvents] = useState<MeshEvent[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [topicFilter, setTopicFilter] = useState('');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const offset = (page - 1) * PAGE_LIMIT;
      const [evRes, subRes] = await Promise.allSettled([
        apiFetch(`/api/mesh/events?limit=${PAGE_LIMIT}&offset=${offset}`),
        apiFetch('/api/mesh/subscriptions'),
      ]);

      if (evRes.status === 'fulfilled' && evRes.value.ok) {
        const data = (await evRes.value.json()) as { events?: MeshEvent[] };
        const list = data.events ?? [];
        setEvents(list);
        setHasNextPage(list.length === PAGE_LIMIT);
      }
      if (subRes.status === 'fulfilled' && subRes.value.ok) {
        const data = (await subRes.value.json()) as { subscriptions?: Subscription[] };
        setSubscriptions(data.subscriptions ?? []);
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Unique topics from subscriptions
  const topics = [...new Set(subscriptions.map((s) => s.topic))];

  // Filtered events
  const filteredEvents = topicFilter ? events.filter((e) => e.topic === topicFilter) : events;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading mesh data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <Network className="w-6 h-6 text-emerald-400" />
            Agent Mesh
          </h1>
          <p className="text-sm text-gray-500 mt-1">Inter-agent pub/sub event bus</p>
        </div>
        <button
          onClick={loadData}
          aria-label="Refresh mesh data"
          className="p-2 rounded-lg bg-white/[0.05] text-gray-400 hover:bg-white/[0.1] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Topology Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card text-center">
          <p className="text-xs text-gray-500 mb-1">Active Topics</p>
          <p className="text-2xl font-bold">{topics.length}</p>
        </div>
        <div className="glass-card text-center">
          <p className="text-xs text-gray-500 mb-1">Subscriptions</p>
          <p className="text-2xl font-bold">{subscriptions.length}</p>
        </div>
        <div className="glass-card text-center">
          <p className="text-xs text-gray-500 mb-1">Events (24h)</p>
          <p className="text-2xl font-bold">{events.length}</p>
        </div>
      </div>

      {/* Subscriptions */}
      <div className="glass-card !p-0">
        <div className="px-4 py-3 border-b border-white/[0.08]">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            Active Subscriptions
          </h2>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {subscriptions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No active subscriptions.</p>
          ) : (
            subscriptions.map((sub, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="text-gray-400 font-mono">{sub.agent_name || sub.agent_id}</span>
                <ArrowRight className="w-3 h-3 text-gray-600" />
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-mono">
                  {sub.topic}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Event Stream */}
      <div className="glass-card !p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
          <h2 className="text-sm font-medium">Event Stream</h2>
          <div className="flex items-center gap-2">
            <label htmlFor="mesh-topic-filter" className="sr-only">
              Filter by topic
            </label>
            <select
              id="mesh-topic-filter"
              value={topicFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTopicFilter(e.target.value)}
              className="px-2 py-1 rounded text-xs bg-white/[0.05] border border-white/[0.08] text-gray-400 focus:outline-none"
            >
              <option value="">All topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          {filteredEvents.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No events yet.</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {filteredEvents.map((event) => (
                <div key={event.id} className="px-4 py-3 space-y-1">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-600">
                      {new Date(event.created_at).toLocaleTimeString()}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">
                      {event.topic}
                    </span>
                    <span className="text-gray-600">
                      from <span className="text-gray-400">{event.publisher_id}</span>
                    </span>
                  </div>
                  <pre className="text-xs text-gray-400 font-mono truncate max-w-full">
                    {typeof event.payload === 'string'
                      ? event.payload.slice(0, 200)
                      : JSON.stringify(event.payload).slice(0, 200)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {!loading && events.length > 0 && (
        <Pagination
          page={page}
          totalPages={hasNextPage ? page + 1 : page}
          onPageChange={(p) => {
            setPage(p);
            setTopicFilter('');
          }}
        />
      )}
    </div>
  );
}
