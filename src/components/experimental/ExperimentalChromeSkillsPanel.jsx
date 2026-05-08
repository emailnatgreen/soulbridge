import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, Play, Loader2, Zap, Code2, AlertTriangle } from 'lucide-react';

export default function ExperimentalChromeSkillsPanel() {
  const [simulating, setSimulating] = useState(false);
  const [results, setResults] = useState(null);

  const { data: widgets = [] } = useQuery({
    queryKey: ['exp-chrome-widgets'],
    queryFn: () => base44.entities.Widget.filter({ widget_type: 'service' }, '-created_date', 10),
  });

  const handleSimulate = async () => {
    setSimulating(true);
    await new Promise(r => setTimeout(r, 600));

    const skills = (widgets.length > 0 ? widgets : [
      { name: 'Research Assistant', cost_per_stream_interval: 0.001, stream_interval_unit: 'minute' },
      { name: 'Code Reviewer', cost_per_stream_interval: 0.005, stream_interval_unit: 'minute' },
      { name: 'Compliance Check', cost_per_stream_interval: 0.01, stream_interval_unit: 'hour' },
    ]).slice(0, 6).map((w, i) => {
      const uses = Math.floor(Math.random() * 200 + 10);
      const revenue = (uses * (w.cost_per_stream_interval || 0.001)).toFixed(4);
      return {
        name: w.name,
        uses,
        revenue,
        costPerUse: w.cost_per_stream_interval || 0.001,
        interval: w.stream_interval_unit || 'minute',
        status: Math.random() > 0.2 ? 'active' : 'idle',
      };
    });

    setResults({
      skills,
      totalRevenue: skills.reduce((s, sk) => s + Number(sk.revenue), 0).toFixed(4),
      totalUses: skills.reduce((s, sk) => s + sk.uses, 0),
      timestamp: new Date().toISOString(),
    });
    setSimulating(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-4 h-4 text-indigo-400" />
          <span className="text-indigo-300 text-xs font-semibold">Chrome Skills Micro-Transactions</span>
          <Badge className="text-[8px] bg-orange-500/15 text-orange-300 border-orange-500/30">EXPERIMENTAL</Badge>
        </div>
        <p className="text-white/40 text-[10px] leading-relaxed">
          Simulate browser-based micro-transactions for WebMCP Chrome Skills.
          Each skill invocation costs a tiny RLUSD amount, streamed in real-time to the widget creator.
        </p>
      </div>

      <Button
        onClick={handleSimulate}
        disabled={simulating}
        className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 text-sm"
      >
        {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        {simulating ? 'Simulating…' : 'Simulate Chrome Skill Economics'}
      </Button>

      {results && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-semibold">Skill Economics Simulation</span>
            <div className="flex items-center gap-2">
              <Badge className="text-[9px] bg-green-500/15 text-green-300 border-green-500/30">
                {results.totalRevenue} RLUSD total
              </Badge>
              <Badge className="text-[9px] bg-blue-500/15 text-blue-300 border-blue-500/30">
                {results.totalUses} uses
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5">
            {results.skills.map((sk, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                <Code2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span className="text-white/60 text-xs flex-1 truncate">{sk.name}</span>
                <Badge className={`text-[8px] ${sk.status === 'active' ? 'bg-green-500/15 text-green-300 border-green-500/30' : 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}>
                  {sk.status}
                </Badge>
                <span className="text-white/30 text-[9px]">{sk.uses} uses</span>
                <span className="text-amber-300 text-xs font-bold">{sk.revenue} RLUSD</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-white/40 text-[10px]">
          Simulated economics only. Real Chrome Skill payments require minted Widget NFTs + active trustlines.
        </p>
      </div>
    </div>
  );
}