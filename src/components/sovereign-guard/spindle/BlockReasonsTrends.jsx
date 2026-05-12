import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ShieldCheck, ShieldX, BarChart3, TrendingUp } from 'lucide-react';

const BLOCK_SOURCE_LABELS = {
  consensus_failure: 'Consensus Failure',
  low_sincerity: 'Low Sincerity',
  monkey_block: 'Monkey Block',
  monkey_quarantine: 'Monkey Quarantine',
};

const BAR_COLORS = {
  consensus_failure: '#f97316',
  low_sincerity: '#ef4444',
  monkey_block: '#f59e0b',
  monkey_quarantine: '#fb7185',
};

export default function BlockReasonsTrends({ trends, loading }) {
  if (loading) return <div className="text-white/30 text-xs text-center py-6">Loading trends…</div>;
  if (!trends) return null;

  const { total_evaluated, total_pass, total_block, pass_rate, block_reasons } = trends;

  const chartData = Object.entries(block_reasons || {}).map(([source, count]) => ({
    name: BLOCK_SOURCE_LABELS[source] || source,
    count,
    source,
  }));

  return (
    <Card className="bg-white/[0.02] border-white/10">
      <CardContent className="p-0">
        <div className="px-3 py-2 border-b border-white/5">
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">
            Panel 4 — Block Reasons & Trends
          </p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3">
          <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <p className="text-[9px] text-white/30">Evaluated</p>
              <p className="text-sm font-bold text-white">{total_evaluated}</p>
            </div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
            <div>
              <p className="text-[9px] text-white/30">Passed</p>
              <p className="text-sm font-bold text-green-300">{total_pass}</p>
            </div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5 flex items-center gap-2">
            <ShieldX className="w-4 h-4 text-red-400 shrink-0" />
            <div>
              <p className="text-[9px] text-white/30">Blocked</p>
              <p className="text-sm font-bold text-red-300">{total_block}</p>
            </div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <p className="text-[9px] text-white/30">Pass Rate</p>
              <p className="text-sm font-bold text-purple-300">{pass_rate}%</p>
            </div>
          </div>
        </div>

        {/* Block reasons chart */}
        {chartData.length > 0 && (
          <div className="px-3 pb-3">
            <p className="text-[9px] text-white/20 uppercase mb-2">Block Source Distribution</p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} width={110} />
                  <Tooltip
                    contentStyle={{ background: '#1e1b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 10 }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.source} fill={BAR_COLORS[entry.source] || '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Inline badges */}
        {chartData.length > 0 && (
          <div className="px-3 pb-3 flex flex-wrap gap-1.5">
            {chartData.map((d) => (
              <Badge key={d.source} className="text-[9px] border bg-white/[0.03] text-white/40 border-white/10">
                {d.name}: {d.count}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}