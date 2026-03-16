import React from 'react';
import { X, ExternalLink, Tag, Clock, AlertTriangle, CheckCircle2, Calendar, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const CATEGORY_META = {
  automation: { label: 'Automation', color: 'bg-cyan-700/40 text-cyan-300 border-cyan-600/40', icon: Zap },
  project:    { label: 'Project',    color: 'bg-violet-700/40 text-violet-300 border-violet-600/40', icon: Calendar },
  governance: { label: 'Governance', color: 'bg-amber-700/40 text-amber-300 border-amber-600/40', icon: Tag },
  news:       { label: 'News',       color: 'bg-sky-700/40 text-sky-300 border-sky-600/40', icon: ExternalLink },
  milestone:  { label: 'Milestone',  color: 'bg-pink-700/40 text-pink-300 border-pink-600/40', icon: CheckCircle2 },
  custom:     { label: 'Custom',     color: 'bg-slate-600/40 text-slate-300 border-slate-500/40', icon: Calendar },
};

const PRIORITY_COLORS = {
  critical: 'bg-red-700/30 text-red-300 border-red-600/40',
  high:     'bg-orange-700/30 text-orange-300 border-orange-600/40',
  normal:   'bg-slate-600/30 text-slate-300 border-slate-500/40',
  low:      'bg-green-700/30 text-green-300 border-green-600/40',
};

const STATUS_ICONS = {
  completed: <CheckCircle2 className="w-4 h-4 text-green-400" />,
  failed:    <AlertTriangle className="w-4 h-4 text-red-400" />,
  active:    <Zap className="w-4 h-4 text-amber-400" />,
  upcoming:  <Clock className="w-4 h-4 text-slate-400" />,
  expired:   <X className="w-4 h-4 text-slate-500" />,
};

export default function CalendarEventModal({ event, onClose }) {
  if (!event) return null;
  const cat = CATEGORY_META[event.category] || CATEGORY_META.custom;
  const CatIcon = cat.icon;

  const fmt = (d) => {
    if (!d) return null;
    try { return format(new Date(d), 'dd MMM yyyy, HH:mm'); } catch { return d; }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <div className="mt-0.5">
              <CatIcon className="w-4 h-4 text-slate-400" />
            </div>
            <h2 className="text-sm font-semibold text-white leading-snug">{event.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge className={`text-[10px] border ${cat.color}`}>{cat.label}</Badge>
          <Badge className={`text-[10px] border ${PRIORITY_COLORS[event.priority] || PRIORITY_COLORS.normal}`}>
            {event.priority}
          </Badge>
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            {STATUS_ICONS[event.status]}
            {event.status}
          </span>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-xs text-slate-300 leading-relaxed">{event.description}</p>
        )}

        {/* Dates */}
        <div className="space-y-1 text-xs text-slate-400">
          {event.start_date && (
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span>Start: {fmt(event.start_date)}</span>
            </div>
          )}
          {event.end_date && event.end_date !== event.start_date && (
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span>End: {fmt(event.end_date)}</span>
            </div>
          )}
        </div>

        {/* Source */}
        {event.source_entity_type && (
          <p className="text-[10px] text-slate-500">
            Source: {event.source_entity_type} {event.source_entity_id ? `· ${event.source_entity_id.slice(-8)}` : ''}
          </p>
        )}

        {/* External link */}
        {event.external_url && (
          <a
            href={event.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Open source link
          </a>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={onClose}
          className="w-full border-slate-700 text-slate-400 hover:text-white text-xs"
        >
          Close
        </Button>
      </div>
    </div>
  );
}