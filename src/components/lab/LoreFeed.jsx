import React, { useState } from 'react';
import { ScrollText, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import ReactMarkdown from 'react-markdown';

const NODE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Nodes' },
  { value: '69bbb7ccb7270b66835634c0', label: 'Code Node' },
  { value: '69bbb7ccb7270b66835634bf', label: 'Lore Node' },
  { value: 'axi', label: 'Axi' },
];

export default function LoreFeed({ entries }) {
  const [nodeFilter, setNodeFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);

  const filtered = entries.filter(e => {
    if (nodeFilter === 'all') return true;
    if (nodeFilter === 'axi') return e.agent_id?.includes('axi') || e.keywords?.includes('axi');
    return e.agent_id === nodeFilter;
  });

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-violet-400" /> Lore Feed
          <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/20 text-[10px]">
            {filtered.length} entries
          </Badge>
        </h2>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={nodeFilter}
            onChange={(e) => setNodeFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg text-xs text-white px-2 py-1 focus:outline-none focus:border-violet-500/40"
          >
            {NODE_FILTER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-slate-900">{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-6">No lore entries matching filter.</p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {filtered.map(entry => {
            const isOpen = expanded === entry.id;
            return (
              <div
                key={entry.id}
                onClick={() => setExpanded(isOpen ? null : entry.id)}
                className="rounded-xl bg-white/[0.03] border border-white/5 hover:border-violet-500/20 p-3 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-violet-300 font-medium">
                    {entry.context || 'Observation'}
                  </span>
                  {entry.created_date && (
                    <span className="text-[10px] text-slate-600">
                      {format(parseISO(entry.created_date), 'MMM d, HH:mm')}
                    </span>
                  )}
                </div>
                <div className={`text-white/70 text-xs ${isOpen ? '' : 'line-clamp-2'}`}>
                  <ReactMarkdown className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    {entry.content || ''}
                  </ReactMarkdown>
                </div>
                {entry.keywords?.length > 0 && isOpen && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {entry.keywords.map(k => (
                      <span key={k} className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/10">{k}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}