import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Brain, AlertTriangle, Lightbulb, CheckCircle2,
  ChevronDown, ChevronUp, Loader2, RefreshCw, PlusCircle, MessageSquare,
  BarChart2, Filter, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';

// ── helpers ────────────────────────────────────────────────────────────────
const getPageName = (content) => {
  const m = content.match(/\[Page Review: ([^\]]+)\]/);
  return m ? m[1] : 'Unknown';
};

const getPriority = (content) => {
  if (content.includes('🔴')) return 'critical';
  if (content.includes('🟡')) return 'improve';
  return 'solid';
};

const PRIORITY_META = {
  critical: { label: 'Critical', color: 'bg-red-700/30 text-red-300 border-red-600/40', dot: 'bg-red-400' },
  improve:  { label: 'Improve',  color: 'bg-yellow-700/30 text-yellow-300 border-yellow-600/40', dot: 'bg-yellow-400' },
  solid:    { label: 'Solid',    color: 'bg-green-700/30 text-green-300 border-green-600/40', dot: 'bg-green-400' },
};

// Extract bullet lists from a section header
const extractSection = (content, header) => {
  const regex = new RegExp(`## ${header}[\\s\\S]*?(?=## |$)`, 'i');
  const match = content.match(regex);
  if (!match) return [];
  return match[0]
    .split('\n')
    .filter(l => l.trim().match(/^[-*\d]/) || l.trim().match(/^\*\*/))
    .map(l => l.replace(/^[-*\d.]+\s*/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean)
    .slice(0, 3);
};

// ── Aggregated Insights ────────────────────────────────────────────────────
function InsightsPanel({ reviews }) {
  const themes = {};
  reviews.forEach(r => {
    const body = r.content.replace(/\[Page Review:[^\]]+\]\n\n/, '');
    [...extractSection(body, 'Top 3 UX Suggestions'), ...extractSection(body, 'Missing Features')].forEach(line => {
      const key = line.slice(0, 40);
      themes[key] = (themes[key] || 0) + 1;
    });
  });

  const sorted = Object.entries(themes).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const critical = reviews.filter(r => getPriority(r.content) === 'critical').length;
  const improve  = reviews.filter(r => getPriority(r.content) === 'improve').length;
  const solid    = reviews.filter(r => getPriority(r.content) === 'solid').length;

  return (
    <div className="space-y-4">
      {/* Priority breakdown */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Critical', count: critical, color: 'text-red-400', bg: 'bg-red-900/20 border-red-700/30' },
          { label: 'Improve',  count: improve,  color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-700/30' },
          { label: 'Solid',    count: solid,    color: 'text-green-400', bg: 'bg-green-900/20 border-green-700/30' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border ${s.bg} py-2 px-1`}>
            <div className={`text-xl font-bold ${s.color}`}>{s.count}</div>
            <div className="text-[10px] text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recurring themes */}
      {sorted.length > 0 && (
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <BarChart2 className="w-3 h-3" /> Recurring Themes
          </p>
          <div className="space-y-1.5">
            {sorted.map(([theme, count]) => (
              <div key={theme} className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${Math.min(100, count * 25)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 w-4 text-right">{count}x</span>
                <span className="text-[10px] text-slate-300 flex-[3] truncate">{theme}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Task Creator ───────────────────────────────────────────────────────────
function TaskCreator({ pageName, suggestion, projectId = '69b80d6ca7163666574a5259', onCreated }) {
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    await base44.entities.ProjectTask.create({
      project_id: projectId,
      title: `[${pageName}] ${suggestion.slice(0, 80)}`,
      description: suggestion,
      status: 'todo',
      priority: 'medium',
      task_type: 'development',
      reward_drops: 25000,
    });
    setDone(true);
    setCreating(false);
    onCreated?.();
  };

  if (done) return <span className="text-[10px] text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Task created</span>;

  return (
    <button
      onClick={handleCreate}
      disabled={creating}
      className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
    >
      {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlusCircle className="w-3 h-3" />}
      Create task
    </button>
  );
}

// ── Review Card ────────────────────────────────────────────────────────────
function ReviewCard({ memory, onSendToAxi }) {
  const [expanded, setExpanded] = useState(false);
  const [taskRefresh, setTaskRefresh] = useState(0);
  const pageName = getPageName(memory.content);
  const priority = getPriority(memory.content);
  const meta = PRIORITY_META[priority];
  const body = memory.content.replace(/\[Page Review:[^\]]+\]\n\n/, '');
  const suggestions = extractSection(body, 'Top 3 UX Suggestions');
  const missing = extractSection(body, 'Missing Features');

  return (
    <div className={`rounded-xl border ${priority === 'critical' ? 'border-red-700/40 bg-red-900/5' : 'border-slate-700/40'} transition-all`}>
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
        <span className="text-xs font-medium text-slate-200 flex-1">{pageName}</span>
        <Badge className={`text-[10px] border ${meta.color}`}>{meta.label}</Badge>
        <span className="text-[10px] text-slate-500">
          {new Date(memory.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
        {expanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-700/40 space-y-3 mt-1">
          {/* UX Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> UX Suggestions
              </p>
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-start justify-between gap-2 py-0.5">
                  <span className="text-[11px] text-slate-300 flex-1">{s}</span>
                  <TaskCreator pageName={pageName} suggestion={s} onCreated={() => setTaskRefresh(t => t + 1)} />
                </div>
              ))}
            </div>
          )}

          {/* Missing Features */}
          {missing.length > 0 && (
            <div>
              <p className="text-[10px] text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Missing Features
              </p>
              {missing.map((m, i) => (
                <div key={i} className="flex items-start justify-between gap-2 py-0.5">
                  <span className="text-[11px] text-slate-300 flex-1">{m}</span>
                  <TaskCreator pageName={pageName} suggestion={m} onCreated={() => setTaskRefresh(t => t + 1)} />
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1 border-t border-slate-700/30">
            <Button
              size="sm"
              onClick={() => onSendToAxi(memory, pageName, body)}
              className="text-[10px] h-6 bg-violet-700 hover:bg-violet-800 text-white border-0 px-2"
            >
              <MessageSquare className="w-3 h-3 mr-1" />Discuss with Axi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────
export default function AxiReviewCoordinationPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all'); // all | critical | improve | solid
  const [search, setSearch] = useState('');
  const [sendingId, setSendingId] = useState(null);
  const [activeTab, setActiveTab] = useState('reviews'); // reviews | insights

  const { data: memories = [], isFetching, refetch } = useQuery({
    queryKey: ['coordination-review-memories'],
    queryFn: () => base44.entities.Memory.filter({ type: 'observation', agent_id: '6993271e7dc0fa2ab78762bf' }, '-created_date', 200),
    staleTime: 0,
    refetchOnMount: true,
  });

  const reviews = memories.filter(m =>
    m.keywords?.includes('page_review') &&
    (search === '' || getPageName(m.content).toLowerCase().includes(search.toLowerCase())) &&
    (filter === 'all' || getPriority(m.content) === filter)
  );

  const handleSendToAxi = async (memory, pageName, body) => {
    setSendingId(memory.id);
    try {
      const conversations = await base44.agents.listConversations({ agent_name: 'axi' });
      const unified = conversations.find(c => c.metadata?.unified_axi_chat === true);
      let convo = unified
        ? await base44.agents.getConversation(unified.id)
        : await base44.agents.createConversation({
            agent_name: 'axi',
            metadata: { name: 'Unified Conversation with Axi - Mother Boss', unified_axi_chat: true }
          });
      await base44.agents.addMessage(convo, {
        role: 'user',
        content: `Please review and give me your thoughts and action priorities for **${pageName}**:\n\n${body}`
      });
      navigate('/Axi');
    } finally {
      setSendingId(null);
    }
  };

  const tabs = [
    { id: 'reviews', label: 'Reviews', icon: ClipboardList },
    { id: 'insights', label: 'Insights', icon: BarChart2 },
  ];

  const filters = [
    { id: 'all',      label: 'All' },
    { id: 'critical', label: '🔴 Critical' },
    { id: 'improve',  label: '🟡 Improve' },
    { id: 'solid',    label: '🟢 Solid' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-white">Axi Review Coordination</h3>
        <span className="text-xs text-slate-500 ml-1">{reviews.length} reviews</span>
        <button onClick={() => refetch()} className="ml-auto text-slate-500 hover:text-slate-300 transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md transition-colors ${
              activeTab === t.id ? 'bg-violet-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <t.icon className="w-3 h-3" />{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'insights' ? (
        <InsightsPanel reviews={memories.filter(m => m.keywords?.includes('page_review'))} />
      ) : (
        <>
          {/* Search + filter */}
          <div className="flex gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search page..."
              className="flex-1 bg-slate-800/60 border border-slate-600/50 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {filters.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                  filter === f.id
                    ? 'bg-violet-700 border-violet-600 text-white'
                    : 'border-slate-600/50 text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Review list */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {reviews.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                <ClipboardList className="w-6 h-6 mx-auto mb-2 opacity-40" />
                No reviews match your filter. Run a batch review first.
              </div>
            ) : (
              reviews.map(m => (
                <ReviewCard
                  key={m.id}
                  memory={m}
                  onSendToAxi={handleSendToAxi}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}