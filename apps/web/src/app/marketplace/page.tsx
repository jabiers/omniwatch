"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Store,
  Download,
  Star,
  Search,
  Tag,
  Plus,
  Loader2,
  CheckCircle,
  X,
} from "lucide-react";
import { Pagination } from "../../components/pagination";
import { apiFetch } from "../../lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MarketplaceRecipe {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  category: string;
  author: string;
  version: string;
  downloads: number;
  rating: number;
  tags: string[];
  created_at: string;
}

interface PublishForm {
  name: string;
  description: string;
  prompt: string;
  category: string;
  tags: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  { key: "", label: "All" },
  { key: "general", label: "General" },
  { key: "monitoring", label: "Monitoring" },
  { key: "security", label: "Security" },
  { key: "performance", label: "Performance" },
  { key: "data", label: "Data" },
  { key: "automation", label: "Automation" },
];

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-gray-500/10 text-gray-400",
  monitoring: "bg-blue-500/10 text-blue-400",
  security: "bg-red-500/10 text-red-400",
  performance: "bg-amber-500/10 text-amber-400",
  data: "bg-cyan-500/10 text-cyan-400",
  automation: "bg-purple-500/10 text-purple-400",
};

const SORT_OPTIONS = [
  { key: "downloads", label: "Most Downloaded" },
  { key: "rating", label: "Top Rated" },
  { key: "newest", label: "Newest" },
] as const;

const PAGE_LIMIT = 20;

const DEFAULT_FORM: PublishForm = {
  name: "",
  description: "",
  prompt: "",
  category: "general",
  tags: "",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Render 0-5 stars */
function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} className="w-3 h-3 fill-amber-400 text-amber-400" />
      ))}
      {half && (
        <Star className="w-3 h-3 text-amber-400" style={{ clipPath: "inset(0 50% 0 0)" }} />
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e${i}`} className="w-3 h-3 text-gray-600" />
      ))}
      <span className="ml-1 text-xs text-gray-500">{rating.toFixed(1)}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function MarketplacePage() {
  const [recipes, setRecipes] = useState<MarketplaceRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<string>("downloads");
  const [installing, setInstalling] = useState<string | null>(null);
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Publish modal state
  const [showPublish, setShowPublish] = useState(false);
  const [publishForm, setPublishForm] = useState<PublishForm>(DEFAULT_FORM);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Data Loading                                                     */
  /* ---------------------------------------------------------------- */

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    const offset = (page - 1) * PAGE_LIMIT;
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_LIMIT));
    params.set("offset", String(offset));
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (sort) params.set("sort", sort);

    try {
      const res = await apiFetch(`/api/marketplace?${params}`);
      if (res.ok) {
        const data = (await res.json()) as { recipes?: MarketplaceRecipe[] };
        const list = data.recipes || [];
        setRecipes(list);
        setHasNextPage(list.length === PAGE_LIMIT);
      } else {
        setRecipes([]);
        setHasNextPage(false);
      }
    } catch (_) {
      setRecipes([]);
      setHasNextPage(false);
    } finally {
      setLoading(false);
    }
  }, [search, category, sort, page]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  /* ---------------------------------------------------------------- */
  /*  Install                                                          */
  /* ---------------------------------------------------------------- */

  async function handleInstall(id: string) {
    setInstalling(id);
    try {
      const res = await apiFetch(`/api/marketplace/${id}/install`, { method: "POST" });
      if (res.ok) {
        setInstalled((prev) => new Set([...prev, id]));
        // Update download count locally
        setRecipes((prev) =>
          prev.map((r) => (r.id === id ? { ...r, downloads: r.downloads + 1 } : r))
        );
      }
    } catch (_) {
      // API error — silently fail
    } finally {
      setInstalling(null);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Publish                                                          */
  /* ---------------------------------------------------------------- */

  function openPublish() {
    setPublishForm(DEFAULT_FORM);
    setPublishError(null);
    setShowPublish(true);
  }

  function closePublish() {
    setShowPublish(false);
    setPublishForm(DEFAULT_FORM);
    setPublishError(null);
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setPublishing(true);
    setPublishError(null);

    const tagsArray = publishForm.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await apiFetch("/api/marketplace", {
        method: "POST",
        body: JSON.stringify({
          name: publishForm.name,
          description: publishForm.description || undefined,
          prompt: publishForm.prompt,
          category: publishForm.category,
          tags: tagsArray,
        }),
      });

      if (res.ok) {
        closePublish();
        await loadRecipes();
      } else {
        const data = (await res.json().catch(() => ({ error: "Failed to publish recipe" }))) as { error?: string };
        setPublishError(data.error || "Failed to publish recipe");
      }
    } catch (_) {
      setPublishError("Network error. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <Store className="w-6 h-6 text-emerald-400" />
            Agent Marketplace
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Discover, publish, and install community agent recipes.
          </p>
        </div>
        <button
          onClick={openPublish}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Publish Recipe
        </button>
      </div>

      {/* Search + Category Filter + Sort */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search marketplace..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50 placeholder:text-gray-600"
            />
          </div>

          {/* Sort dropdown */}
          <select
            value={sort}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setSort(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-gray-300 focus:outline-none focus:border-emerald-500/50 transition-colors"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category filter pills */}
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => { setCategory(c.key); setPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                category === c.key
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-gray-500 hover:bg-white/[0.05]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recipe Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading marketplace...
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center text-gray-500 py-16">
          <Store className="w-10 h-10 mx-auto mb-3 text-gray-600" />
          <p>No recipes found.</p>
          <p className="text-xs mt-1 text-gray-600">
            Try a different search or category filter.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => {
            const isInstalled = installed.has(recipe.id);
            const isInstalling = installing === recipe.id;
            const catColor =
              CATEGORY_COLORS[recipe.category] || "bg-gray-500/10 text-gray-400";

            return (
              <div
                key={recipe.id}
                className="glass-card flex flex-col"
              >
                {/* Header: category badge + version */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${catColor}`}
                  >
                    {recipe.category}
                  </span>
                  <span className="text-[10px] text-gray-600 font-mono">
                    v{recipe.version}
                  </span>
                </div>

                {/* Name + Description */}
                <h3 className="font-medium text-sm mb-1 truncate">
                  {recipe.name}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3 min-h-[2rem]">
                  {recipe.description || "No description provided."}
                </p>

                {/* Tags */}
                {recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {recipe.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded bg-white/[0.05] text-gray-500"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {tag}
                      </span>
                    ))}
                    {recipe.tags.length > 4 && (
                      <span className="px-1.5 py-0.5 text-[10px] text-gray-600">
                        +{recipe.tags.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Stats: downloads + rating */}
                <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    {recipe.downloads.toLocaleString()}
                  </span>
                  <StarRating rating={recipe.rating} />
                </div>

                {/* Install button */}
                <div className="mt-auto">
                  <button
                    onClick={() => handleInstall(recipe.id)}
                    disabled={isInstalling || isInstalled}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors ${
                      isInstalled
                        ? "bg-emerald-500/10 text-emerald-400 cursor-default"
                        : "bg-white/[0.05] hover:bg-emerald-500/20 hover:text-emerald-400 disabled:opacity-40"
                    }`}
                  >
                    {isInstalling ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Installing...
                      </>
                    ) : isInstalled ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        Installed
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        Install
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && recipes.length > 0 && (
        <Pagination
          page={page}
          totalPages={hasNextPage ? page + 1 : page}
          onPageChange={(p) => {
            setPage(p);
            setLoading(true);
          }}
        />
      )}

      {/* ============================================================ */}
      {/*  Publish Modal                                                */}
      {/* ============================================================ */}
      {showPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closePublish}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg mx-4 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Publish Recipe
              </h2>
              <button
                onClick={closePublish}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.05] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handlePublish} className="px-6 py-5 space-y-4">
              {/* Error banner */}
              {publishError && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  {publishError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Recipe Name *
                </label>
                <input
                  type="text"
                  required
                  value={publishForm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPublishForm({ ...publishForm, name: e.target.value })
                  }
                  placeholder="e.g. CPU Monitor Agent"
                  className="w-full px-3 py-2 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Description
                </label>
                <textarea
                  value={publishForm.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setPublishForm({ ...publishForm, description: e.target.value })
                  }
                  rows={2}
                  placeholder="Brief description of what this agent does..."
                  className="w-full px-3 py-2 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                />
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Agent Prompt *
                </label>
                <textarea
                  required
                  value={publishForm.prompt}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setPublishForm({ ...publishForm, prompt: e.target.value })
                  }
                  rows={4}
                  placeholder="The system prompt that defines this agent's behavior..."
                  className="w-full px-3 py-2 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none font-mono"
                />
              </div>

              {/* Category + Tags row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Category */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={publishForm.category}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setPublishForm({ ...publishForm, category: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-gray-300 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  >
                    {CATEGORIES.filter((c) => c.key !== "").map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={publishForm.tags}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPublishForm({ ...publishForm, tags: e.target.value })
                    }
                    placeholder="cpu, linux, alert"
                    className="w-full px-3 py-2 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closePublish}
                  className="px-4 py-2 rounded-lg text-sm text-gray-400 bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                >
                  {publishing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
