import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { Search, X, Loader2, User, FolderKanban, Wallet, Shield, BookOpen, Zap } from 'lucide-react';

/**
 * GlobalSearchBar — Cross-entity intelligent search.
 *
 * Usage:
 *   import GlobalSearchBar from '@/components/search/GlobalSearchBar';
 *   <GlobalSearchBar />
 *
 * Opens with Cmd+K / Ctrl+K or clicking the search icon.
 * Searches Agents, AIProjects, Wallets, GovernanceProposals, Memory, AgentSkills.
 */

const ENTITY_CONFIGS = [
  { key: 'Agent', icon: User, color: 'text-blue-400', label: 'Agent', fields: ['name', 'purpose', 'role'], nav: (r) => `/agents/${r.id}` },
  { key: 'AIProject', icon: FolderKanban, color: 'text-violet-400', label: 'Project', fields: ['title', 'description', 'status'], nav: (r) => `/AIProjectHub?project=${r.id}` },
  { key: 'Wallet', icon: Wallet, color: 'text-emerald-400', label: 'Wallet', fields: ['name', 'classic_address'], nav: () => '/Wallets' },
  { key: 'GovernanceProposal', icon: Shield, color: 'text-amber-400', label: 'Proposal', fields: ['title', 'description'], nav: (r) => `/GovernanceHub?id=${r.id}` },
  { key: 'Memory', icon: BookOpen, color: 'text-pink-400', label: 'Memory', fields: ['content', 'keywords'], nav: () => '/MemoryBrowser' },
];

function highlight(text, query) {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, 80);
  const start = Math.max(0, idx - 20);
  const end = Math.min(text.length, idx + query.length + 40);
  const snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  return snippet;
}

export default function GlobalSearchBar({ className = '' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQuery(''); setResults([]); }
  }, [open]);

  const doSearch = useCallback(async (q) => {
    if (!q.trim() || q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const allResults = [];
      await Promise.all(ENTITY_CONFIGS.map(async (cfg) => {
        try {
          const items = await base44.entities[cfg.key].list('-updated_date', 100);
          const lower = q.toLowerCase();
          const matches = items.filter(item =>
            cfg.fields.some(f => {
              const val = item[f];
              if (Array.isArray(val)) return val.join(' ').toLowerCase().includes(lower);
              return String(val || '').toLowerCase().includes(lower);
            })
          ).slice(0, 4);
          matches.forEach(item => {
            const primaryField = cfg.fields[0];
            const secondaryField = cfg.fields[1];
            allResults.push({
              id: item.id,
              label: cfg.label,
              icon: cfg.icon,
              color: cfg.color,
              title: item[primaryField] || item.name || item.title || 'Untitled',
              subtitle: highlight(String(item[secondaryField] || ''), q),
              nav: cfg.nav(item),
            });
          });
        } catch { /* skip failed entity */ }
      }));
      setResults(allResults.slice(0, 12));
      setSelected(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && results[selected]) {
      window.location.href = results[selected].nav;
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all text-sm ${className}`}
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="hidden sm:inline text-xs bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 ml-1">⌘K</kbd>
      </button>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
          {loading ? <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" /> : <Search className="w-4 h-4 text-slate-400 shrink-0" />}
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search agents, projects, wallets, proposals…"
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
          />
          <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto py-2">
            {results.map((r, i) => {
              const Icon = r.icon;
              return (
                <li key={`${r.id}-${i}`}>
                  <a
                    href={r.nav}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${i === selected ? 'bg-slate-800' : 'hover:bg-slate-800/50'}`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${r.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-200 truncate">{r.title}</div>
                      {r.subtitle && <div className="text-xs text-slate-500 truncate">{r.subtitle}</div>}
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 ${r.color} shrink-0`}>{r.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}

        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="px-4 py-6 text-center text-slate-500 text-sm">No results found for "{query}"</div>
        )}

        {!query && (
          <div className="px-4 py-4 flex flex-wrap gap-2">
            {ENTITY_CONFIGS.map(cfg => {
              const Icon = cfg.icon;
              return (
                <button key={cfg.key} onClick={() => setQuery(cfg.label.toLowerCase())}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 ${cfg.color} hover:border-slate-500 transition-colors`}>
                  <Icon className="w-3 h-3" />{cfg.label}s
                </button>
              );
            })}
          </div>
        )}

        <div className="px-4 py-2 border-t border-slate-800 flex items-center gap-3 text-xs text-slate-600">
          <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
        </div>
      </div>
    </div>,
    document.body
  );
}