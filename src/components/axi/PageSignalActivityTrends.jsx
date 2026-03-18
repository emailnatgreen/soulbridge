import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Loader2, TrendingUp } from 'lucide-react';

export default function PageSignalActivityTrends() {
  const { data: memories = [], isLoading } = useQuery({
    queryKey: ['page-signal-memories'],
    queryFn: async () => {
      return await base44.entities.Memory.filter({
        related_entity_type: 'page_view',
        type: 'observation'
      }, '-created_date', 200);
    },
    refetchInterval: 60000,
  });

  const chartData = useMemo(() => {
    if (!memories.length) return [];

    const pageVisits = {};
    memories.forEach((mem) => {
      const pageMatch = mem.content?.match(/viewed page: (\w+)/i);
      if (pageMatch) {
        const page = pageMatch[1];
        pageVisits[page] = (pageVisits[page] || 0) + 1;
      }
    });

    return Object.entries(pageVisits)
      .map(([page, count]) => ({ page, visits: count }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10);
  }, [memories]);

  const timelineData = useMemo(() => {
    if (!memories.length) return [];

    const hourly = {};
    memories.forEach((mem) => {
      const date = new Date(mem.created_date);
      const hour = date.getHours();
      const key = `${hour}:00`;
      hourly[key] = (hourly[key] || 0) + 1;
    });

    return Array.from({ length: 24 }, (_, i) => ({
      time: `${i}:00`,
      activity: hourly[`${i}:00`] || 0
    }));
  }, [memories]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Analyzing page signals...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Top Visited Pages
        </h4>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
              <XAxis dataKey="page" tick={{ fontSize: 12 }} stroke="rgba(148,163,184,0.6)" />
              <YAxis tick={{ fontSize: 12 }} stroke="rgba(148,163,184,0.6)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(30,41,59,0.95)',
                  border: '1px solid rgba(100,116,139,0.5)',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: 'rgba(226,232,240,1)' }}
              />
              <Bar dataKey="visits" fill="#a78bfa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">No page signal data yet.</div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-white mb-4">Activity Over 24h</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="rgba(148,163,184,0.6)" />
            <YAxis tick={{ fontSize: 12 }} stroke="rgba(148,163,184,0.6)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(30,41,59,0.95)',
                border: '1px solid rgba(100,116,139,0.5)',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: 'rgba(226,232,240,1)' }}
            />
            <Line type="monotone" dataKey="activity" stroke="#06b6d4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-slate-700/30 rounded-lg p-3">
          <p className="text-slate-400 text-xs">Total Signals</p>
          <p className="text-white text-lg font-semibold mt-1">{memories.length}</p>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-3">
          <p className="text-slate-400 text-xs">Unique Pages</p>
          <p className="text-white text-lg font-semibold mt-1">{chartData.length}</p>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-3">
          <p className="text-slate-400 text-xs">Peak Activity</p>
          <p className="text-white text-lg font-semibold mt-1">
            {Math.max(...timelineData.map(d => d.activity), 0)} events
          </p>
        </div>
      </div>
    </div>
  );
}