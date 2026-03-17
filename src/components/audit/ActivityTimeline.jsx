import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Filter, Download, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Info, Zap, Shield, User, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';

/**
 * ActivityTimeline — Reusable audit trail / activity log component.
 *
 * Usage:
 *   import ActivityTimeline from '@/components/audit/ActivityTimeline';
 *
 *   <ActivityTimeline
 *     events={[
 *       { id: '1', type: 'governance', title: 'Vote Cast', description: 'Agent voted FOR proposal #42', actor: 'Maya', timestamp: '2026-03-17T10:00:00Z' },
 *       { id: '2', type: 'transaction', title: 'XRP Sent', description: '50 XRP sent to rXXXX', actor: 'Axi', timestamp: '2026-03-17T09:00:00Z' },
 *     ]}
 *     title="Activity Log"
 *   />
 *
 * Event types: 'governance' | 'transaction' | 'reputation' | 'system' | 'task' | 'agent' | 'error' | 'info'
 */

const TYPE_CONFIG = {
  governance: { icon: Shield, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', badge: 'bg-amber-900/40 text-amber-300' },
  transaction: { icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', badge: 'bg-emerald-900/40 text-emerald-300' },
  reputation: { icon: User, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', badge: 'bg-blue-900/40 text-blue-300' },
  system: { icon: Zap, color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/20', badge: 'bg-violet-900/40 text-violet-300' },
  task: { icon: CheckCircle2, color: 'text-teal-400', bg: 'bg-teal-400/10 border-teal-400/20', badge: 'bg-teal-900/40 text-teal-300' },
  agent: { icon: User, color: 'text-pink-400', bg: 'bg-pink-400/10 border-pink-400/20', badge: 'bg-pink-900/40 text-pink-300' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', badge: 'bg-red-900/40 text-red-300' },
  info: { icon: Info, color: 'text-slate-400', bg: 'bg-slate-400/10 border-slate-400/20', badge: 'bg-slate-800 text-slate-400' },
};

function EventRow({ event, expanded, onToggle }) {
  const cfg = TYPE_CONFIG[event.type] || TYPE_CONFIG.info;
  const Icon = cfg.icon;
  const ts = (() => {
    try { return format(parseISO(event.timestamp), 'MMM d, HH:mm'); } catch { return event.timestamp || ''; }
  })();

  return (
    <div className={`border rounded-xl p-3 transition-all ${expanded ? cfg.bg : 'bg-slate-900/40 border-slate-700/40 hover:border-slate-600/60'}`}>
      <div className="flex items-start gap-3 cursor-pointer" onClick={onToggle}>
        <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${expanded ? cfg.bg : 'bg-slate-800'} border ${expanded ? cfg.bg : 'border-slate-700'}`}>
          <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-200">{event.title}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${cfg.badge}`}>{event.type}</span>
            {event.actor && <span className="text-xs text-slate-500">by {event.actor}</span>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{event.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-600 flex items-center gap-1">
            <Clock className="w-3 h-3" />{ts}
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
        </div>
      </div>

      {expanded && event.details && (
        <div className="mt-3 ml-10 p-3 bg-slate-900/60 rounded-lg border border-slate-700/40">
          {typeof event.details === 'string'
            ? <p className="text-xs text-slate-400">{event.details}</p>
            : <pre className="text-xs text-slate-400 whitespace-pre-wrap">{JSON.stringify(event.details, null, 2)}</pre>
          }
        </div>
      )}
    </div>
  );
}

export default function ActivityTimeline({
  events = [],
  title = 'Activity Log',
  loading = false,
  maxHeight = '500px',
  showExport = true,
  showFilters = true,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState('');
  const [showFilterBar, setShowFilterBar] = useState(false);

  const eventTypes = ['all', ...Array.from(new Set(events.map(e => e.type)))];

  const filtered = events.filter(e => {
    if (typeFilter !== 'all' && e.type !== typeFilter) return false;
    if (actorFilter && !String(e.actor || '').toLowerCase().includes(actorFilter.toLowerCase())) return false;
    return true;
  });

  const handleExport = () => {
    const csv = [
      'timestamp,type,title,actor,description',
      ...filtered.map(e => [e.timestamp, e.type, `"${e.title}"`, e.actor || '', `"${e.description || ''}"`].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `activity-log-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-xs">{filtered.length}</Badge>
        </div>
        <div className="flex gap-1.5">
          {showFilters && (
            <Button size="sm" variant="outline" onClick={() => setShowFilterBar(f => !f)}
              className={`h-7 px-2.5 text-xs border-slate-600 ${showFilterBar ? 'text-amber-400 border-amber-600' : 'text-slate-400 hover:text-white'}`}>
              <Filter className="w-3 h-3 mr-1" />Filter
            </Button>
          )}
          {showExport && (
            <Button size="sm" variant="outline" onClick={handleExport}
              className="h-7 px-2.5 text-xs border-slate-600 text-slate-400 hover:text-white">
              <Download className="w-3 h-3 mr-1" />Export
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      {showFilterBar && (
        <div className="flex gap-2 mb-3 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            {eventTypes.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-colors capitalize ${typeFilter === t ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}>
                {t}
              </button>
            ))}
          </div>
          <input
            value={actorFilter}
            onChange={e => setActorFilter(e.target.value)}
            placeholder="Filter by actor…"
            className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-slate-500 text-sm">
          <div className="w-4 h-4 border-2 border-slate-600 border-t-amber-400 rounded-full animate-spin mr-2" />Loading events…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-500 text-sm">No activity events found.</div>
      ) : (
        <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight }}>
          {filtered.map(event => (
            <EventRow
              key={event.id}
              event={event}
              expanded={expandedId === event.id}
              onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}