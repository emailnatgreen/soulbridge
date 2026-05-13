import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';

export default function InvestigationFilters({ filters, onFilterChange }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Filter className="w-3.5 h-3.5 text-slate-400" />
      <Select value={filters.target_type || 'all'} onValueChange={(v) => onFilterChange({ ...filters, target_type: v })}>
        <SelectTrigger className="w-28 h-7 bg-slate-800 border-slate-600 text-slate-300 text-[10px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="node">Node</SelectItem>
          <SelectItem value="agent">Agent</SelectItem>
          <SelectItem value="feature">Feature</SelectItem>
          <SelectItem value="general">General</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.risk_level || 'all'} onValueChange={(v) => onFilterChange({ ...filters, risk_level: v })}>
        <SelectTrigger className="w-28 h-7 bg-slate-800 border-slate-600 text-slate-300 text-[10px]">
          <SelectValue placeholder="Risk" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Risk</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.status || 'all'} onValueChange={(v) => onFilterChange({ ...filters, status: v })}>
        <SelectTrigger className="w-28 h-7 bg-slate-800 border-slate-600 text-slate-300 text-[10px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="complete">Complete</SelectItem>
          <SelectItem value="processing">Processing</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.visibility || 'all'} onValueChange={(v) => onFilterChange({ ...filters, visibility: v })}>
        <SelectTrigger className="w-28 h-7 bg-slate-800 border-slate-600 text-slate-300 text-[10px]">
          <SelectValue placeholder="Visibility" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="private">Private</SelectItem>
          <SelectItem value="public">Public</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}