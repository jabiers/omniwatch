'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Download,
  Loader2,
  CheckCircle,
  Shield,
  Globe,
  TrendingUp,
  Server,
  Share2,
  Database,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface Recipe {
  id: string;
  name: string;
  description: string;
  category: string;
  prompt: string;
  tags: string[];
}

const categoryIcons: Record<string, typeof Globe> = {
  monitoring: Globe,
  finance: TrendingUp,
  devops: Server,
  social: Share2,
  data: Database,
  security: Shield,
};

const categoryColors: Record<string, string> = {
  monitoring: 'text-blue-400 bg-blue-500/10',
  finance: 'text-amber-400 bg-amber-500/10',
  devops: 'text-purple-400 bg-purple-500/10',
  social: 'text-pink-400 bg-pink-500/10',
  data: 'text-cyan-400 bg-cyan-500/10',
  security: 'text-red-400 bg-red-500/10',
};

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [installing, setInstalling] = useState<string | null>(null);
  const [installed, setInstalled] = useState<Set<string>>(new Set());

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (category) params.set('category', category);

    apiFetch(`/api/recipes?${params}`)
      .then((r) => r.json())
      .then((d) => setRecipes((d as { recipes?: Recipe[] }).recipes || []))
      .catch(() => setRecipes([]))
      .finally(() => setLoading(false));
  }, [search, category]);

  async function install(id: string) {
    setInstalling(id);
    try {
      const res = await apiFetch(`/api/recipes/${id}/install`, { method: 'POST' });
      if (res.ok) {
        setInstalled((prev) => new Set([...prev, id]));
      }
    } catch {
      // API error
    } finally {
      setInstalling(null);
    }
  }

  const categories = [
    { key: '', label: 'All' },
    { key: 'monitoring', label: 'Monitoring' },
    { key: 'finance', label: 'Finance' },
    { key: 'devops', label: 'DevOps' },
    { key: 'social', label: 'Social' },
    { key: 'data', label: 'Data' },
    { key: 'security', label: 'Security' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Agent Recipes</h1>
        <p className="text-sm text-gray-500 mt-1">
          One-click agent templates. Install and customize.
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Search recipes..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50 placeholder:text-gray-600"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                category === c.key
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-500 hover:bg-white/[0.05]'
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
          Loading recipes...
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center text-gray-500 py-16">No recipes found.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => {
            const Icon = categoryIcons[recipe.category] || Globe;
            const colorClass = categoryColors[recipe.category] || 'text-gray-400 bg-white/[0.05]';
            const isInstalled = installed.has(recipe.id);
            const isInstalling = installing === recipe.id;

            return (
              <div key={recipe.id} className="glass-card flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm truncate">{recipe.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {recipe.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {recipe.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 text-[10px] rounded bg-white/[0.05] text-gray-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-auto">
                  <button
                    onClick={() => install(recipe.id)}
                    disabled={isInstalling || isInstalled}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors ${
                      isInstalled
                        ? 'bg-emerald-500/10 text-emerald-400 cursor-default'
                        : 'bg-white/[0.05] hover:bg-emerald-500/20 hover:text-emerald-400 disabled:opacity-40'
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
    </div>
  );
}
