import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Trash2, ChevronDown, ChevronUp, Download, Sparkles } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import FilterBar from '@/components/filters/FilterBar';
import { toast } from 'sonner';

const TYPE_COLORS = {
  conversation_snippet: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  user_preference:      'bg-green-900/40 text-green-300 border-green-700/40',
  village_detail:       'bg-amber-900/40 text-amber-300 border-amber-700/40',
  observation:          'bg-violet-900/40 text-violet-300 border-violet-700/40',
  fact:                 'bg-teal-900/40 text-teal-300 border-teal-700/40',
  relationship:         'bg-pink-900/40 text-pink-300 border-pink-700/40',
  emotion:              'bg-rose-900/40 text-rose-300 border-rose-700/40',
};

const MEMORY_FILTERS = [
  { key: 'type', label: 'Type', type: 'select', options: ['conversation_snippet','user_preference','village_detail','observation','fact','relationship','emotion'] },
  { key: 'importance', label: 'Min Importance', type: 'range', min: 1, max: 10 },
  { key: 'keyword', label: 'Keyword', type: 'text', placeholder: 'e.g. page_review' },
  { key: 'agentId', label: 'Agent', type: 'text', placeholder: 'Agent ID' },
];

const SORT_OPTIONS = [
  { value: '-importance', label: 'Importance (High)' },
  { value: '-created_date', label: 'Newest First' },
  { value: 'created_date', label: 'Oldest First' },
];

export default function MemoryBrowser() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filterValues, setFilterValues] = useState({ search: '', type: 'all', importance: { min: 1, max: 10 }, keyword: '', agentId: '' });

  const sendToAxi = (memory) => {
    const msg = `Memory ID: ${memory.id}\nType: ${memory.type}\nImportance: ${memory.importance ?? 5}/10\nContent: ${memory.content}${memory.context ? `\nContext: ${memory.context}` : ''}${memory.keywords?.length ? `\nKeywords: ${memory.keywords.join(', ')}` : ''}`;
    sessionStorage.setItem('axi_pending_message', msg);
    toast.success('Opening Axi…');
    navigate('/Axi');
  };
  const [sortBy, setSortBy] = useState('-importance');
  const [expandedId, setExpandedId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const { data: memories = [], isLoading } = useQuery({
    queryKey: ['memories-browser'],
    queryFn: () => base44.entities.Memory.list('-importance', 500),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Memory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories-browser'] });
      setConfirmDeleteId(null);
      toast.success('Memory deleted');
    },
  });

  const filtered = memories.filter(m => {
    const q = filterValues.search?.toLowerCase();
    if (q && !`${m.content} ${(m.keywords || []).join(' ')} ${m.context}`.toLowerCase().includes(q)) return false;
    if (filterValues.type !== 'all' && m.type !== filterValues.type) return false;
    if (filterValues.importance?.min > 1 && (m.importance ?? 5) < filterValues.importance.min) return false;
    if (filterValues.importance?.max < 10 && (m.importance ?? 5) > filterValues.importance.max) return false;
    if (filterValues.keyword && !(m.keywords || []).join(' ').toLowerCase().includes(filterValues.keyword.toLowerCase())) return false;
    if (filterValues.agentId && !m.agent_id?.includes(filterValues.agentId)) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === '-importance') return (b.importance ?? 5) - (a.importance ?? 5);
    if (sortBy === '-created_date') return new Date(b.created_date) - new Date(a.created_date);
    if (sortBy === 'created_date') return new Date(a.created_date) - new Date(b.created_date);
    return 0;
  });

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'memories.json'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
              <Brain className="w-6 h-6 text-violet-400" />Memory Browser
            </h1>
            <p className="text-slate-400 text-sm mt-1">{memories.length} memories stored</p>
          </div>
          <Button onClick={exportJSON} variant="outline" className="border-slate-600 text-slate-300 hover:text-white">
            <Download className="w-4 h-4 mr-2" />Export JSON
          </Button>
        </div>

        {/* Type breakdown */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterValues(v => ({ ...v, type: 'all' }))}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${filterValues.type === 'all' ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
            All ({memories.length})
          </button>
          {Object.entries(TYPE_COLORS).map(([type, cls]) => {
            const count = memories.filter(m => m.type === type).length;
            if (count === 0) return null;
            return (
              <button key={type} onClick={() => setFilterValues(v => ({ ...v, type }))}
                className={`text-xs px-2.5 py-1 rounded-lg border ${filterValues.type === type ? cls : 'bg-slate-800 text-slate-400 border-slate-700'} transition-colors`}>
                {type.replace(/_/g, ' ')} ({count})
              </button>
            );
          })}
        </div>

        <FilterBar
          filters={MEMORY_FILTERS}
          values={filterValues}
          onChange={setFilterValues}
          searchKey="search"
          searchPlaceholder="Search memory content, keywords…"
          sortOptions={SORT_OPTIONS}
          sortValue={sortBy}
          onSortChange={setSortBy}
          resultCount={filtered.length}
        />

        {isLoading ? (
          <div className="text-center py-16 text-slate-500">Loading memories…</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(memory => {
              const isExpanded = expandedId === memory.id;
              const typeClass = TYPE_COLORS[memory.type] || 'bg-slate-800 text-slate-400 border-slate-700';
              return (
                <Card key={memory.id} className="bg-slate-900/60 border-slate-700/40 hover:border-slate-600 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : memory.id)}>
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <Badge className={`text-xs border ${typeClass}`}>{memory.type?.replace(/_/g, ' ')}</Badge>
                          <span className="text-xs text-amber-400">Importance: {memory.importance ?? 5}/10</span>
                          {memory.created_date && (
                            <span className="text-xs text-slate-500">{format(parseISO(memory.created_date), 'MMM d, yyyy')}</span>
                          )}
                        </div>
                        <p className={`text-slate-300 text-sm ${isExpanded ? '' : 'line-clamp-2'}`}>{memory.content}</p>
                        {memory.keywords?.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {memory.keywords.map(k => (
                              <span key={k} className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">{k}</span>
                            ))}
                          </div>
                        )}
                        {isExpanded && memory.context && (
                          <p className="text-xs text-slate-500 mt-2 italic">Context: {memory.context}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => sendToAxi(memory)} title="Send to Axi page" className="text-slate-600 hover:text-violet-400 transition-colors">
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setExpandedId(isExpanded ? null : memory.id)} className="text-slate-600 hover:text-slate-300">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {confirmDeleteId === memory.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => deleteMutation.mutate(memory.id)} className="text-xs text-red-400 hover:text-red-300">Yes</button>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-slate-500 hover:text-white">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(memory.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}