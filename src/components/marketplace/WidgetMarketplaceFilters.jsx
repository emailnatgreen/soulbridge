import React from 'react';
import { Search, Filter, ArrowUpDown, LayoutGrid, List } from 'lucide-react';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'wallet_management', label: 'Wallet Management' },
  { value: 'did_management', label: 'DID Management' },
  { value: 'governance', label: 'Governance' },
  { value: 'agent_creation', label: 'Agent Creation' },
  { value: 'skill', label: 'Skill' },
  { value: 'environment', label: 'Environment' },
  { value: 'training', label: 'Training' },
  { value: 'other', label: 'Other' },
];

const WIDGET_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'unlock', label: 'Unlock' },
  { value: 'service', label: 'Service' },
];

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'category', label: 'Category' },
  { value: 'type', label: 'Type' },
  { value: 'owned_first', label: 'Owned First' },
  { value: 'locked_first', label: 'Locked First' },
];

export default function WidgetMarketplaceFilters({
  search, onSearchChange,
  category, onCategoryChange,
  widgetType, onWidgetTypeChange,
  sort, onSortChange,
  viewMode, onViewModeChange,
}) {
  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          placeholder="Search widgets by name, description, or NFT ID…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-colors"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Category filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-white/30" />
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value} className="bg-slate-900 text-white">
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Type filter */}
        <select
          value={widgetType}
          onChange={(e) => onWidgetTypeChange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer"
        >
          {WIDGET_TYPES.map(t => (
            <option key={t.value} value={t.value} className="bg-slate-900 text-white">
              {t.label}
            </option>
          ))}
        </select>

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-white/30" />
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer"
          >
            {SORT_OPTIONS.map(s => (
              <option key={s.value} value={s.value} className="bg-slate-900 text-white">
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* View toggle */}
        <div className="ml-auto flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-purple-500/30 text-purple-300' : 'text-white/30 hover:text-white/50'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-purple-500/30 text-purple-300' : 'text-white/30 hover:text-white/50'}`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}