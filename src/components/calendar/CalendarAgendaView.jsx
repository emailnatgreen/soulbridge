import React from 'react';
import { format, isToday, isTomorrow, isPast, startOfDay, addDays } from 'date-fns';
import { Clock, AlertTriangle, CheckCircle2, Zap, Calendar, ExternalLink, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const CATEGORY_META = {
  automation: { color: 'text-cyan-400',   bg: 'bg-cyan-900/20 border-cyan-700/30',   label: 'Automation', icon: Zap },
  project:    { color: 'text-violet-400', bg: 'bg-violet-900/20 border-violet-700/30', label: 'Project', icon: Calendar },
  governance: { color: 'text-amber-400',  bg: 'bg-amber-900/20 border-amber-700/30',  label: 'Governance', icon: Tag },
  news:       { color: 'text-sky-400',    bg: 'bg-sky-900/20 border-sky-700/30',       label: 'News', icon: ExternalLink },
  milestone:  { color: 'text-pink-400',   bg: 'bg-pink-900/20 border-pink-700/30',     label: 'Milestone', icon: CheckCircle2 },
  custom:     { color: 'text-slate-400',  bg: 'bg-slate-800/40 border-slate-600/30',   label: 'Custom', icon: Calendar },
};

const PRIORITY_DOT = { critical: 'bg-red-500', high: 'bg-orange-400', normal: 'bg-slate-500', low: 'bg-green-500' };

function dayLabel(date) {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE, d MMMM yyyy');
}

export default function CalendarAgendaView({ events, onEventClick }) {
  // Group by day, show next 60 days
  const today = startOfDay(new Date());
  const days = Array.from({ length: 60 }, (_, i) => addDays(today, i - 7));

  const grouped = days.map(day => ({
    day,
    events: events.filter(e => {
      try { return format(new Date(e.start_date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'); }
      catch { return false; }
    }),
  })).filter(g => g.events.length > 0);

  if (grouped.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-2">
        <Calendar className="w-8 h-8 opacity-30" />
        <p className="text-sm">No events in agenda range</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 overflow-y-auto max-h-[600px] pr-1">
      {grouped.map(({ day, events: dayEvents }) => {
        const past = isPast(day) && !isToday(day);
        return (
          <div key={day.toISOString()}>
            <div className={`text-xs font-semibold mb-2 ${isToday(day) ? 'text-violet-400' : past ? 'text-slate-600' : 'text-slate-400'}`}>
              {dayLabel(day)}
            </div>
            <div className="space-y-1.5">
              {dayEvents.map(ev => {
                const meta = CATEGORY_META[ev.category] || CATEGORY_META.custom;
                const Icon = meta.icon;
                return (
                  <div
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer hover:opacity-80 transition-opacity ${meta.bg} ${past ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${PRIORITY_DOT[ev.priority] || 'bg-slate-500'}`} />
                      <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-200 font-medium truncate">{ev.title}</p>
                      {ev.description && (
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{ev.description}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {!ev.all_day && (
                        <p className="text-[10px] text-slate-500">
                          {(() => { try { return format(new Date(ev.start_date), 'HH:mm'); } catch { return ''; } })()}
                        </p>
                      )}
                      <Badge className={`text-[9px] border ${meta.bg}`}>{meta.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}