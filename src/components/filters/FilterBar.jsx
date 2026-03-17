import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Filter, X, ChevronDown, Search } from 'lucide-react';

/**
 * FilterBar — Universal reusable filter + search bar.
 *
 * Usage:
 *   import FilterBar from '@/components/filters/FilterBar';
 *
 *   const filters = [
 *     { key: 'status', label: 'Status', type: 'select', options: ['active','inactive','all'] },
 *     { key: 'role',   label: 'Role',   type: 'select', options: ['guardian','creator','trader'] },
 *     { key: 'honor',  label: 'Min Honor', type: 'range', min: 0, max: 100 },
 *     { key: 'date',   label: 'Date',   type: 'daterange' },
 *   ];
 *
 *   <FilterBar
 *     filters={filters}
 *     values={filterValues}
 *     onChange={setFilterValues}
 *     searchKey="search"
 *     searchPlaceholder="Search agents..."
 *     sortOptions={[{ value: 'honor_score', label: 'Honor Score' }, { value: 'name', label: 'Name' }]}
 *     sortValue={sortBy}
 *     onSortChange={setSortBy}
 *     resultCount={12}
 *   />
 *
 * filter types: 'select' | 'multiselect' | 'range' | 'daterange' | 'text'
 */

export default function FilterBar({
  filters = [],
  values = {},
  onChange,
  searchKey = 'search',
  searchPlaceholder = 'Search…',
  sortOptions = [],
  sortValue = '',
  onSortChange,
  resultCount,
  className = '',
}) {
  const [expanded, setExpanded] = useState(false);

  const update = (key, val) => onChange({ ...values, [key]: val });

  const activeCount = Object.entries(values).filter(([k, v]) => {
    if (k === searchKey) return !!v;
    return v && v !== 'all' && v !== '' && !(Array.isArray(v) && v.length === 0);
  }).length;

  const clearAll = () => {
    const cleared = {};
    filters.forEach(f => { cleared[f.key] = f.type === 'multiselect' ? [] : ''; });
    cleared[searchKey] = '';
    onChange(cleared);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Search + toggle row */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            value={values[searchKey] || ''}
            onChange={e => update(searchKey, e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9 h-9 text-sm bg-slate-800/60 border-slate-600/50 text-slate-200 placeholder:text-slate-500 focus:border-amber-500/50"
          />
        </div>

        {filters.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => setExpanded(e => !e)}
            className={`h-9 px-3 text-xs border-slate-600 ${expanded || activeCount > 0 ? 'text-amber-400 border-amber-600' : 'text-slate-400 hover:text-white'}`}>
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            Filters
            {activeCount > 0 && (
              <span className="ml-1.5 bg-amber-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{activeCount}</span>
            )}
            <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </Button>
        )}

        {sortOptions.length > 0 && (
          <select
            value={sortValue}
            onChange={e => onSortChange?.(e.target.value)}
            className="h-9 px-3 text-xs bg-slate-800 border border-slate-600/50 text-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">Sort by…</option>
            {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}

        {activeCount > 0 && (
          <Button size="sm" variant="ghost" onClick={clearAll}
            className="h-9 px-2 text-xs text-slate-500 hover:text-red-400">
            <X className="w-3.5 h-3.5 mr-1" />Clear
          </Button>
        )}

        {resultCount !== undefined && (
          <span className="self-center text-xs text-slate-500 ml-1">{resultCount} result{resultCount !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Expanded filter panel */}
      {expanded && filters.length > 0 && (
        <div className="flex flex-wrap gap-3 p-3 bg-slate-900/60 border border-slate-700/40 rounded-xl">
          {filters.map(f => (
            <FilterField key={f.key} filter={f} value={values[f.key]} onChange={v => update(f.key, v)} />
          ))}
        </div>
      )}

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filters.map(f => {
            const v = values[f.key];
            if (!v || v === 'all' || v === '' || (Array.isArray(v) && v.length === 0)) return null;
            const displayVal = Array.isArray(v) ? v.join(', ') : String(v);
            return (
              <Badge key={f.key} className="bg-amber-900/30 text-amber-300 border border-amber-700/40 text-xs pr-1 gap-1">
                {f.label}: {displayVal}
                <button onClick={() => update(f.key, Array.isArray(v) ? [] : '')} className="hover:text-white ml-0.5">
                  <X className="w-2.5 h-2.5" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterField({ filter, value, onChange }) {
  const base = "text-xs bg-slate-800 border border-slate-600/50 text-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 h-8 px-2";

  if (filter.type === 'select') {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">{filter.label}</label>
        <select value={value || 'all'} onChange={e => onChange(e.target.value)} className={base}>
          <option value="all">All</option>
          {filter.options.map(o => (
            <option key={typeof o === 'object' ? o.value : o} value={typeof o === 'object' ? o.value : o}>
              {typeof o === 'object' ? o.label : o}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (filter.type === 'multiselect') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">{filter.label}</label>
        <div className="flex flex-wrap gap-1">
          {filter.options.map(o => {
            const val = typeof o === 'object' ? o.value : o;
            const label = typeof o === 'object' ? o.label : o;
            const active = selected.includes(val);
            return (
              <button key={val} onClick={() => onChange(active ? selected.filter(s => s !== val) : [...selected, val])}
                className={`text-xs px-2 py-1 rounded-md border transition-colors ${active ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-white'}`}>
                {label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (filter.type === 'range') {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">{filter.label}</label>
        <div className="flex items-center gap-2">
          <input type="number" min={filter.min ?? 0} max={filter.max ?? 100}
            value={value?.min ?? filter.min ?? 0}
            onChange={e => onChange({ ...value, min: Number(e.target.value) })}
            className={`${base} w-20`} placeholder="Min" />
          <span className="text-slate-500 text-xs">–</span>
          <input type="number" min={filter.min ?? 0} max={filter.max ?? 100}
            value={value?.max ?? filter.max ?? 100}
            onChange={e => onChange({ ...value, max: Number(e.target.value) })}
            className={`${base} w-20`} placeholder="Max" />
        </div>
      </div>
    );
  }

  if (filter.type === 'daterange') {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">{filter.label}</label>
        <div className="flex items-center gap-2">
          <input type="date" value={value?.from || ''}
            onChange={e => onChange({ ...value, from: e.target.value })}
            className={`${base} w-36`} />
          <span className="text-slate-500 text-xs">→</span>
          <input type="date" value={value?.to || ''}
            onChange={e => onChange({ ...value, to: e.target.value })}
            className={`${base} w-36`} />
        </div>
      </div>
    );
  }

  // text
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-500">{filter.label}</label>
      <Input value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder={filter.placeholder || filter.label}
        className={`${base} w-40`} />
    </div>
  );
}