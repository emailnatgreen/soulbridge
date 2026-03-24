import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Shield, X } from 'lucide-react';

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'planning', label: 'Planning' },
  { value: 'recruiting', label: 'Recruiting' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const priorityOptions = [
  { value: 'all', label: 'All Priority' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export default function ProjectFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  ownerFilter,
  onOwnerChange,
  agents = [],
  viewMode,
  onViewModeChange,
}) {
  const uniqueOwners = [...new Set(agents.map(a => a.id))]
    .map(id => agents.find(a => a.id === id))
    .filter(Boolean);

  const selectedOwnerAgent = agents.find(a => a.id === ownerFilter);

  const hasActiveFilters = statusFilter !== 'all' || 
    priorityFilter !== 'all' || 
    ownerFilter !== 'all' || 
    searchQuery !== '';

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-xs relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search projects by title or description..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/50"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400/50 appearance-none cursor-pointer"
        >
          {statusOptions.map(s => (
            <option key={s.value} value={s.value} className="bg-slate-900">
              {s.label}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => onPriorityChange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400/50 appearance-none cursor-pointer"
        >
          {priorityOptions.map(p => (
            <option key={p.value} value={p.value} className="bg-slate-900">
              {p.label}
            </option>
          ))}
        </select>

        {/* Owner Filter with DID Signal */}
        <div className="relative">
          <select
            value={ownerFilter}
            onChange={(e) => onOwnerChange(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400/50 appearance-none cursor-pointer"
          >
            <option value="all" className="bg-slate-900">All Owners</option>
            {uniqueOwners.map(owner => (
              <option key={owner.id} value={owner.id} className="bg-slate-900">
                {owner.name} {owner.wallet_id ? '✓' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange('list')}
            className={`px-3 py-1.5 text-sm rounded transition ${
              viewMode === 'list' ? 'bg-blue-500/30 text-blue-300' : 'text-white/40 hover:text-white'
            }`}
            title="List view"
          >
            List
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            className={`px-3 py-1.5 text-sm rounded transition ${
              viewMode === 'grid' ? 'bg-blue-500/30 text-blue-300' : 'text-white/40 hover:text-white'
            }`}
            title="Grid view"
          >
            Grid
          </button>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-white/60 bg-white/5 rounded-lg p-3 border border-white/10">
          <Filter className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="font-medium">Filters:</span>

          {statusFilter !== 'all' && (
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
              {statusOptions.find(s => s.value === statusFilter)?.label}
            </Badge>
          )}

          {priorityFilter !== 'all' && (
            <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
              {priorityOptions.find(p => p.value === priorityFilter)?.label}
            </Badge>
          )}

          {ownerFilter !== 'all' && selectedOwnerAgent && (
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 flex items-center gap-1">
              {selectedOwnerAgent.avatar_url ? (
                <img
                  src={selectedOwnerAgent.avatar_url}
                  alt={selectedOwnerAgent.name}
                  className="w-3 h-3 rounded-full object-cover"
                />
              ) : (
                <div className="w-3 h-3 rounded-full bg-purple-400/30" />
              )}
              {selectedOwnerAgent.name}
              {selectedOwnerAgent.wallet_id && (
                <Shield className="w-2.5 h-2.5 text-green-400 flex-shrink-0" title="DID Published" />
              )}
            </Badge>
          )}

          {searchQuery && (
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
              "{searchQuery}"
            </Badge>
          )}

          {hasActiveFilters && (
            <button
              onClick={() => {
                onSearchChange('');
                onStatusChange('all');
                onPriorityChange('all');
                onOwnerChange('all');
              }}
              className="ml-auto text-white/40 hover:text-white transition flex items-center gap-1"
              title="Clear all filters"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}