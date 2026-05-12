import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldX, BarChart3, TrendingUp } from 'lucide-react';

const BLOCK_SOURCE_LABELS = {
  consensus_failure: 'Consensus Failure',
  low_sincerity: 'Low Sincerity',
  monkey_block: 'Monkey Block',
  monkey_quarantine: 'Monkey Quarantine',
};

const BLOCK_SOURCE_COLORS = {
  consensus_failure: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  low_sincerity: 'bg-red-500/20 text-red-300 border-red-500/30',
  monkey_block: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  monkey_quarantine: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

export default function SpindleTrendsPanel({ trends, loading }) {
  if (loading) {
    return <div className="text-white/30 text-xs text-center py-6">Loading trends…</div>;
  }
  if (!trends) return null;

  const { total_evaluated, total_pass, total_block, pass_rate, block_reasons } = trends;

  return (
    <div className="space-y-3">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-white/[0.03] border-white/10">
          <CardContent className="p-3 flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <div>
              <p className="text-[10px] text-white/40">Total Evaluated</p>
              <p className="text-lg font-bold text-white">{total_evaluated}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/[0.03] border-white/10">
          <CardContent className="p-3 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-[10px] text-white/40">Passed</p>
              <p className="text-lg font-bold text-green-300">{total_pass}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/[0.03] border-white/10">
          <CardContent className="p-3 flex items-center gap-3">
            <ShieldX className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-[10px] text-white/40">Blocked</p>
              <p className="text-lg font-bold text-red-300">{total_block}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/[0.03] border-white/10">
          <CardContent className="p-3 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-[10px] text-white/40">Pass Rate</p>
              <p className="text-lg font-bold text-purple-300">{pass_rate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Block Reasons Breakdown */}
      {total_block > 0 && (
        <Card className="bg-white/[0.03] border-white/10">
          <CardContent className="p-3">
            <p className="text-[10px] text-white/40 mb-2 uppercase tracking-wider">Block Sources</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(block_reasons || {}).map(([source, count]) => (
                <Badge key={source} className={`text-[10px] border ${BLOCK_SOURCE_COLORS[source] || 'bg-white/10 text-white/60 border-white/20'}`}>
                  {BLOCK_SOURCE_LABELS[source] || source} × {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}