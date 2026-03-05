import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, BarChart3, Activity } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';

// Simulated performance data pending real trade data from backend
const PERF_DATA = {
  netReturn: { value: null, target: 10, unit: '%/mo', label: 'Net Return' },
  maxDrawdown: { value: null, target: -15, unit: '%', label: 'Max Drawdown' },
  consistency: { value: null, target: 70, unit: '% win rate', label: 'Consistency' },
  profitFactor: { value: null, target: 1.5, unit: 'x', label: 'Profit Factor' },
  volatilityRobustness: { value: null, target: 80, unit: '/100', label: 'Volatility Robustness' },
};

const RADAR_DATA = [
  { metric: 'Net Return', score: 0, target: 100 },
  { metric: 'Drawdown Ctrl', score: 0, target: 100 },
  { metric: 'Consistency', score: 0, target: 100 },
  { metric: 'Profit Factor', score: 0, target: 100 },
  { metric: 'Vol. Robustness', score: 0, target: 100 },
];

export default function PerformanceStandardsPanel() {
  return (
    <div className="space-y-4">
      {/* CR-01/2026 Notice */}
      <div className="flex items-center gap-3 p-3 bg-indigo-900/20 border border-indigo-700/40 rounded-lg">
        <Activity className="h-5 w-5 text-indigo-400 flex-shrink-0" />
        <div>
          <div className="text-indigo-300 font-medium text-sm">CR-01/2026 — Core Performance Standards</div>
          <div className="text-gray-400 text-xs">Forward testing in progress. Metrics will populate once validated trade data is available from the backend.</div>
        </div>
        <Badge className="ml-auto bg-amber-800/40 text-amber-300 border-amber-700/50 text-xs shrink-0">Pending Data</Badge>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(PERF_DATA).map(([key, m]) => (
          <Card key={key} className="bg-gray-900/60 border-gray-700/50">
            <CardContent className="pt-4 pb-3">
              <div className="text-gray-400 text-xs mb-1">{m.label}</div>
              <div className="text-2xl font-bold text-gray-500">—</div>
              <div className="text-xs text-gray-600 mt-1">Target: {m.target}{m.unit}</div>
              <Progress value={0} className="h-1 mt-2 bg-gray-700" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Radar Chart */}
      <Card className="bg-gray-900/60 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-400" />
            Performance Radar — CR-01/2026 Standards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500 flex-col gap-3">
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={RADAR_DATA}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} />
                <Radar name="Target" dataKey="target" stroke="#374151" fill="transparent" strokeDasharray="4 4" />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 6, fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-600">Radar will populate once 6-week forward test data is available</p>
          </div>
        </CardContent>
      </Card>

      {/* Standards Reference Table */}
      <Card className="bg-gray-900/60 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white text-sm">CR-01/2026 — Required Performance Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { standard: 'Net Monthly Return', requirement: '≥ 10% net of all fees', status: 'pending' },
              { standard: 'Max Drawdown', requirement: '≤ 15% at any point', status: 'pending' },
              { standard: 'Win Rate / Consistency', requirement: '≥ 70% profitable trades', status: 'pending' },
              { standard: 'Profit Distribution', requirement: 'Majority from ≥ 5 independent trades', status: 'pending' },
              { standard: 'Volatility Robustness', requirement: 'Profitable across 3+ market regimes', status: 'pending' },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
                <div>
                  <div className="text-white text-sm font-medium">{row.standard}</div>
                  <div className="text-gray-400 text-xs">{row.requirement}</div>
                </div>
                <Badge className="bg-gray-700/40 text-gray-400 border-gray-600/50 text-xs">Pending</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}