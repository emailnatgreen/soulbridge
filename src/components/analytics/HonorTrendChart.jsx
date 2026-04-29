import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';

export default function HonorTrendChart({ metrics, agent }) {
  // Build chart data from performance metrics periods
  const chartData = (metrics || [])
    .slice()
    .reverse()
    .map(m => ({
      period: m.period_start?.slice(0, 10) || '',
      honor: m.reputation_changes?.honor_end ?? agent?.honor_score ?? 100,
      performance: m.overall_score ?? 0,
    }));

  // If no metrics, show current honor as a single point
  if (chartData.length === 0) {
    chartData.push({ period: 'Now', honor: agent?.honor_score ?? 100, performance: 0 });
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          Honor & Performance Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length <= 1 ? (
          <div className="text-center py-10">
            <p className="text-white/30 text-sm">Not enough historical data yet.</p>
            <p className="text-white/20 text-xs mt-1">Performance metrics will populate this chart over time.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="period" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                itemStyle={{ color: '#fff' }}
              />
              <ReferenceLine y={50} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="honor" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} name="Honor" />
              <Line type="monotone" dataKey="performance" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6' }} name="Performance" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}