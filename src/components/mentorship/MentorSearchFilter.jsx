import React from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';

const STYLE_OPTIONS = ['hands_on', 'coaching', 'advisory', 'collaborative', 'socratic', 'directive'];

export default function MentorSearchFilter({ search, setSearch, styleFilter, setStyleFilter }) {
  return (
    <div className="space-y-3 mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, specialization, or expertise…"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm pl-9 h-9"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-3.5 h-3.5 text-white/40 hover:text-white/70" />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {STYLE_OPTIONS.map(style => (
          <Badge
            key={style}
            onClick={() => setStyleFilter(styleFilter === style ? null : style)}
            className={`cursor-pointer text-[10px] capitalize transition ${
              styleFilter === style
                ? 'bg-purple-500/30 text-purple-200 border-purple-400/40'
                : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
            }`}
          >
            {style.replace('_', ' ')}
          </Badge>
        ))}
      </div>
    </div>
  );
}