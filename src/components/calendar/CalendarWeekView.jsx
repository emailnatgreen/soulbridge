import React from 'react';
import {
  startOfWeek, endOfWeek, eachDayOfInterval,
  isSameDay, isToday, format, getHours, getMinutes
} from 'date-fns';

const CATEGORY_COLORS = {
  automation: 'bg-cyan-700/80 border-cyan-500',
  project:    'bg-violet-700/80 border-violet-500',
  governance: 'bg-amber-700/80 border-amber-500',
  news:       'bg-sky-700/80 border-sky-500',
  milestone:  'bg-pink-700/80 border-pink-500',
  custom:     'bg-slate-600/80 border-slate-400',
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function CalendarWeekView({ currentDate, events, onEventClick }) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getEventStyle = (event) => {
    try {
      const start = new Date(event.start_date);
      const h = getHours(start);
      const m = getMinutes(start);
      const top = ((h * 60 + m) / (24 * 60)) * 100;
      return { top: `${top}%`, minHeight: '24px' };
    } catch { return { top: '0%', minHeight: '24px' }; }
  };

  const getDayEvents = (day) =>
    events.filter(e => {
      try { return isSameDay(new Date(e.start_date), day); } catch { return false; }
    });

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="grid grid-cols-8 sticky top-0 bg-slate-900 z-10 border-b border-slate-700/50">
        <div className="w-12" />
        {days.map(day => (
          <div key={day.toISOString()} className={`text-center py-2 text-xs font-medium ${isToday(day) ? 'text-violet-400' : 'text-slate-400'}`}>
            <div className="text-[10px] text-slate-500 uppercase">{format(day, 'EEE')}</div>
            <div className={`w-7 h-7 rounded-full mx-auto flex items-center justify-center ${isToday(day) ? 'bg-violet-600 text-white' : ''}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: '560px' }}>
        <div className="relative grid grid-cols-8" style={{ minHeight: `${24 * 48}px` }}>
          {/* Hour labels */}
          <div className="col-span-1">
            {HOURS.map(h => (
              <div key={h} style={{ height: '48px' }} className="flex items-start justify-end pr-2 pt-0.5">
                <span className="text-[9px] text-slate-600">{String(h).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(day => {
            const dayEvents = getDayEvents(day);
            return (
              <div key={day.toISOString()} className="relative border-l border-slate-700/30">
                {HOURS.map(h => (
                  <div key={h} style={{ height: '48px' }} className="border-b border-slate-800/50" />
                ))}
                {dayEvents.map(ev => (
                  <div
                    key={ev.id}
                    style={getEventStyle(ev)}
                    onClick={() => onEventClick(ev)}
                    title={ev.title}
                    className={`absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-[9px] text-white border-l-2 cursor-pointer hover:opacity-80 overflow-hidden z-10 ${
                      CATEGORY_COLORS[ev.category] || 'bg-slate-600/80 border-slate-400'
                    }`}
                  >
                    {ev.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}