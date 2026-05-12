import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

export default function PublicSearchBar({ search, onSearchChange, veracityFilter, onVeracityChange, decisionFilter, onDecisionChange }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search reports by question…"
          className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
        />
      </div>
      <Select value={veracityFilter} onValueChange={onVeracityChange}>
        <SelectTrigger className="w-full sm:w-36 bg-white/5 border-white/10 text-white text-sm">
          <SelectValue placeholder="Veracity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Scores</SelectItem>
          <SelectItem value="high">High (≥80%)</SelectItem>
          <SelectItem value="medium">Medium (50–80%)</SelectItem>
          <SelectItem value="low">Low (&lt;50%)</SelectItem>
        </SelectContent>
      </Select>
      <Select value={decisionFilter} onValueChange={onDecisionChange}>
        <SelectTrigger className="w-full sm:w-36 bg-white/5 border-white/10 text-white text-sm">
          <SelectValue placeholder="Decision" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Decisions</SelectItem>
          <SelectItem value="allow">Allow</SelectItem>
          <SelectItem value="flag">Flag</SelectItem>
          <SelectItem value="block">Block</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}