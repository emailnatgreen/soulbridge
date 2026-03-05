import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Placeholder distribution data — will be replaced by real trade data
const PLACEHOLDER_DIST = [
  { range: '-3%+', count: 0 }, { range: '-2%', count: 0 }, { range: '-1%', count: 0 },
  { range: '0%', count: 0 }, { range: '+1%', count: 0 }, { range: '+2%', count: 0 }, { range: '+3%+', count: 0 },
];

export default function StatisticalValidationPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-blue-900/20 border border-blue-700/40 rounded-lg">
        <BarChart3 className="h-5 w-5 text-blue-400 flex-shrink-0" />
        <div>
          <div className="text-blue-300 font-medium text-sm">CR-01/2026 — Statistical Validation Standards</div>
          <div className="text-gray-400 text-xs">Trade count, variance stability, and outlier detection require minimum 100 trades from the live/simulation backend.</div>
        </div>
        <Badge className="ml-auto bg-amber-800/40 text-amber-300 border-amber-700/50 text-xs shrink-0">Pending Data</Badge>
      </div>

      {/* Key statistical metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Trades', value: '—', target: '≥ 100', color: 'text-blue-400' },
          { label: 'Variance Stability', value: '—', target: '< 2σ drift', color: 'text-green-400' },
          { label: 'Outliers Detected', value: '—', target: '< 5% of trades', color: 'text-yellow-400' },
          { label: 'Statistical Confidence', value: '—', target: '≥ 95%', color: 'text-indigo-400' },
        ].map((m, i) => (
          <Card key={i} className="bg-gray-900/60 border-gray-700/50">
            <CardContent className="pt-4 pb-3">
              <div className="text-gray-400 text-xs mb-1">{m.label}</div>
              <div className={`text-2xl font-bold ${m.color} opacity-40`}>—</div>
              <div className="text-xs text-gray-600 mt-1">Target: {m.target}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trade Return Distribution Chart */}
      <Card className="bg-gray-900/60 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-400" />
            Trade Return Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={PLACEHOLDER_DIST}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="range" stroke="#6b7280" tick={{ fontSize: 10 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 6, fontSize: 11 }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} opacity={0.4} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-600 text-center mt-2">Distribution chart will populate from live trade results</p>
        </CardContent>
      </Card>

      {/* Validation Checklist */}
      <Card className="bg-gray-900/60 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white text-sm">CR-01/2026 — Statistical Validation Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { check: 'Minimum 100 trades executed', desc: 'Required for statistical significance' },
              { check: 'Variance stability confirmed', desc: 'Return variance must not drift > 2σ across test periods' },
              { check: 'Outlier detection run', desc: 'Identify and flag trades > 3σ from mean return' },
              { check: 'Regime analysis complete', desc: 'Results validated across bull, bear, and sideways conditions' },
              { check: 'Independent sample periods tested', desc: 'No data-snooping — out-of-sample results required' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
                <AlertTriangle className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-gray-300 text-sm">{item.check}</div>
                  <div className="text-gray-500 text-xs">{item.desc}</div>
                </div>
                <Badge className="ml-auto bg-gray-700/40 text-gray-400 border-gray-600/50 text-xs">Not Yet</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}