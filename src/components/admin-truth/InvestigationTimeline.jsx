import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, ShieldAlert, Zap, Eye, Fingerprint, ChevronDown, ChevronUp } from 'lucide-react';
import { extractTimeline } from '@/lib/investigationMemory';

const EVENT_CONFIG = {
  investigation_created: { icon: Clock, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  risk_identified:       { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  contradiction_found:   { icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  action_proposed:       { icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  visibility_changed:    { icon: Eye, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  sovereign_signed:      { icon: Fingerprint, color: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
};

const SEVERITY_BADGE = {
  critical: 'bg-red-500/15 text-red-300 border-red-500/30',
  high:     'bg-amber-500/15 text-amber-300 border-amber-500/30',
  medium:   'bg-slate-500/15 text-slate-300 border-slate-500/30',
  low:      'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  info:     'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

function TimelineEvent({ event }) {
  const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.investigation_created;
  const Icon = config.icon;

  return (
    <div className="flex gap-3 group">
      {/* Dot + Line */}
      <div className="flex flex-col items-center">
        <div className={`w-6 h-6 rounded-full ${config.bg} border ${config.border} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-3 h-3 ${config.color}`} />
        </div>
        <div className="w-px flex-1 bg-slate-700 group-last:hidden" />
      </div>
      {/* Content */}
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-slate-200 text-[11px] font-medium">{event.label}</p>
          <Badge className={`text-[7px] ${SEVERITY_BADGE[event.severity] || SEVERITY_BADGE.info}`}>{event.severity}</Badge>
          <span className="text-slate-500 text-[9px] ml-auto flex-shrink-0">
            {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {event.detail && (
          <p className="text-slate-400 text-[10px] mt-0.5 line-clamp-2">{event.detail}</p>
        )}
      </div>
    </div>
  );
}

export default function InvestigationTimeline({ investigation }) {
  const [expanded, setExpanded] = useState(false);
  const timeline = useMemo(() => extractTimeline(investigation), [investigation]);

  if (!timeline.length) return null;

  const preview = timeline.slice(0, 5);
  const rest = timeline.slice(5);
  const shown = expanded ? timeline : preview;

  return (
    <Card className="bg-slate-900/80 border-slate-700/60">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-[11px] flex items-center gap-1.5 text-slate-300">
          <Clock className="w-3.5 h-3.5 text-violet-400" />
          <span className="uppercase tracking-wider">Investigation Timeline</span>
          <Badge className="text-[7px] bg-slate-800 text-slate-400 border-slate-600 ml-auto">{timeline.length} events</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="space-y-0">
          {shown.map((event, i) => (
            <TimelineEvent key={i} event={event} />
          ))}
        </div>
        {rest.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-violet-300 text-[10px] hover:text-violet-200 mt-1"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Show less' : `Show ${rest.length} more events`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}