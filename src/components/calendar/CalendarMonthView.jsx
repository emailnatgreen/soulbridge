import React from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, format
} from 'date-fns';

const CATEGORY_COLORS = {
  automation: 'bg-cyan-600',
  project:    'bg-violet-600',
  governance: 'bg-amber-600',
  news:       'bg-sky-600',
  milestone:  'bg-pink-600',
  custom:     'bg-slate-500',
};

const PRIORITY_RING = {
  critical: 'ring-1 ring-red-500',
  high:     'ring-1 ring-orange-500',
  normal:   '',
  low:      '',
};

export default function CalendarMonthView({ currentDate, events, onEventClick, onDayClick }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getEventsForDay = (day) =>
    events.filter(e => {
      try {
        return isSameDay(new Date(e.start_date), day);
      } catch { return false; }
    });

  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="flex flex-col h-full">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map(d => (
          <div key={d} className="text-center text-[10px] text-slate-500 uppercase py-1">{d}</div>
        ))}
      </div>

      {/* Weeks */}
      <div className="grid grid-cols-7 flex-1 gap-px bg-slate-700/30 rounded-xl overflow-hidden">
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick?.(day)}
              className={`min-h-[80px] p-1 cursor-pointer transition-colors ${
                inMonth ? 'bg-slate-900' : 'bg-slate-950/60'
              } hover:bg-slate-800/80`}
            >
              <div className={`w-6 h-6 flex items-center justify-center text-xs rounded-full mb-1 mx-auto font-medium ${
                today
                  ? 'bg-violet-600 text-white'
                  : inMonth ? 'text-slate-300' : 'text-slate-600'
              }`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(ev => (
                  <div
                    key={ev.id}
                    onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                    title={ev.title}
                    className={`text-[9px] px-1 py-0.5 rounded truncate text-white cursor-pointer hover:opacity-80 transition-opacity ${
                      CATEGORY_COLORS[ev.category] || 'bg-slate-500'
                    } ${PRIORITY_RING[ev.priority] || ''}`}
                  >
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[9px] text-slate-500 pl-1">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}