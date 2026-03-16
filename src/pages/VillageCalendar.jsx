import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Calendar, ChevronLeft, ChevronRight, RefreshCw,
  Plus, Loader2, Home, Brain, Zap, Filter, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import CalendarMonthView from '@/components/calendar/CalendarMonthView';
import CalendarWeekView from '@/components/calendar/CalendarWeekView';
import CalendarAgendaView from '@/components/calendar/CalendarAgendaView';
import CalendarEventModal from '@/components/calendar/CalendarEventModal';
import CreateEventModal from '@/components/calendar/CreateEventModal';

const VIEWS = ['Month', 'Week', 'Agenda'];

const CATEGORY_META = {
  automation: { label: 'Automation', color: 'bg-cyan-600' },
  project:    { label: 'Project',    color: 'bg-violet-600' },
  governance: { label: 'Governance', color: 'bg-amber-600' },
  news:       { label: 'News',       color: 'bg-sky-600' },
  milestone:  { label: 'Milestone',  color: 'bg-pink-600' },
  custom:     { label: 'Custom',     color: 'bg-slate-500' },
};

const CATEGORIES = Object.keys(CATEGORY_META);
const PRIORITIES = ['critical', 'high', 'normal', 'low'];

export default function VillageCalendar() {
  const qc = useQueryClient();
  const [view, setView] = useState('Month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createDate, setCreateDate] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [filterCategories, setFilterCategories] = useState([]);
  const [filterPriorities, setFilterPriorities] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const { data: events = [], isFetching, refetch } = useQuery({
    queryKey: ['village-calendar-events'],
    queryFn: () => base44.entities.VillageCalendarEvent.list('-start_date', 500),
    staleTime: 30_000,
  });

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const catOk = filterCategories.length === 0 || filterCategories.includes(e.category);
      const priOk = filterPriorities.length === 0 || filterPriorities.includes(e.priority);
      return catOk && priOk;
    });
  }, [events, filterCategories, filterPriorities]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await base44.functions.invoke('syncCalendarEvents', { action: 'sync' });
      await refetch();
    } finally {
      setSyncing(false);
    }
  };

  const navigate = (dir) => {
    if (view === 'Month') setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
    else if (view === 'Week') setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
  };

  const toggleCategory = (cat) =>
    setFilterCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  const togglePriority = (p) =>
    setFilterPriorities(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const headerLabel = view === 'Month'
    ? format(currentDate, 'MMMM yyyy')
    : view === 'Week'
    ? `Week of ${format(currentDate, 'd MMM yyyy')}`
    : 'Agenda';

  const criticalCount = events.filter(e => e.priority === 'critical' && e.status !== 'completed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 md:p-6">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Village Operations Calendar</h1>
            <p className="text-xs text-slate-400">
              {events.length} events
              {criticalCount > 0 && (
                <span className="ml-2 text-red-400 font-medium">· {criticalCount} critical</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/AxiCommandDashboard">
            <Button variant="outline" size="sm" className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs">
              <Brain className="w-3.5 h-3.5 mr-1.5" />Command Centre
            </Button>
          </Link>
          <Link to="/Home">
            <Button variant="outline" size="sm" className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs">
              <Home className="w-3.5 h-3.5 mr-1.5" />Home
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => setShowFilters(f => !f)}
            variant="outline"
            className={`border-slate-700 text-xs ${showFilters ? 'bg-violet-900/30 border-violet-600 text-violet-300' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            <Filter className="w-3.5 h-3.5 mr-1.5" />Filters
            {(filterCategories.length + filterPriorities.length) > 0 && (
              <Badge className="ml-1.5 bg-violet-600 text-white text-[9px] px-1 py-0">
                {filterCategories.length + filterPriorities.length}
              </Badge>
            )}
          </Button>
          <Button
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            variant="outline"
            className="border-cyan-700/60 bg-cyan-900/20 text-cyan-300 hover:bg-cyan-800/30 text-xs"
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
            Sync Data
          </Button>
          <Button
            size="sm"
            onClick={() => { setCreateDate(new Date()); setShowCreate(true); }}
            className="bg-violet-700 hover:bg-violet-800 text-white text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />New Event
          </Button>
        </div>
      </div>

      {/* ── Filters Panel ── */}
      {showFilters && (
        <div className="mb-4 rounded-xl border border-slate-700/50 bg-slate-800/60 backdrop-blur p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-300">Filter Events</p>
            <button
              onClick={() => { setFilterCategories([]); setFilterPriorities([]); }}
              className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />Clear all
            </button>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider">Category</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border transition-colors ${
                    filterCategories.includes(cat)
                      ? 'bg-violet-700 border-violet-600 text-white'
                      : 'border-slate-600 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${CATEGORY_META[cat].color}`} />
                  {CATEGORY_META[cat].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider">Priority</p>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITIES.map(p => (
                <button
                  key={p}
                  onClick={() => togglePriority(p)}
                  className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                    filterPriorities.includes(p)
                      ? 'bg-violet-700 border-violet-600 text-white'
                      : 'border-slate-600 text-slate-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Calendar Toolbar ── */}
      <div className="flex items-center justify-between mb-4">
        {/* View switcher */}
        <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1">
          {VIEWS.map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                view === v ? 'bg-violet-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Navigation */}
        {view !== 'Agenda' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-slate-200 min-w-[150px] text-center">{headerLabel}</span>
            <button
              onClick={() => navigate(1)}
              className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="text-[10px] text-violet-400 hover:text-violet-300 border border-violet-700/50 px-2 py-1 rounded-md"
            >
              Today
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="hidden md:flex items-center gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <span key={cat} className="flex items-center gap-1 text-[10px] text-slate-500">
              <div className={`w-2 h-2 rounded-full ${CATEGORY_META[cat].color}`} />
              {CATEGORY_META[cat].label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Calendar Body ── */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 backdrop-blur p-4 min-h-[500px]">
        {isFetching && events.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        ) : (
          <>
            {view === 'Month' && (
              <CalendarMonthView
                currentDate={currentDate}
                events={filteredEvents}
                onEventClick={setSelectedEvent}
                onDayClick={(day) => { setCreateDate(day); setShowCreate(true); }}
              />
            )}
            {view === 'Week' && (
              <CalendarWeekView
                currentDate={currentDate}
                events={filteredEvents}
                onEventClick={setSelectedEvent}
              />
            )}
            {view === 'Agenda' && (
              <CalendarAgendaView
                events={filteredEvents}
                onEventClick={setSelectedEvent}
              />
            )}
          </>
        )}
      </div>

      {/* ── Upcoming Critical Banner ── */}
      {criticalCount > 0 && (
        <div className="mt-4 rounded-xl border border-red-700/40 bg-red-900/10 px-4 py-3 flex items-center gap-3">
          <Zap className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-300">
            <span className="font-semibold">{criticalCount} critical event{criticalCount > 1 ? 's' : ''}</span> require attention.
            Switch to Agenda view to review all upcoming items.
          </p>
        </div>
      )}

      {/* ── Modals ── */}
      {selectedEvent && (
        <CalendarEventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
      {showCreate && (
        <CreateEventModal
          defaultDate={createDate}
          onClose={() => setShowCreate(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ['village-calendar-events'] })}
        />
      )}
    </div>
  );
}