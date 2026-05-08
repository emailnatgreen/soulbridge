import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link2, Play, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function ExperimentalTrustlinePanel() {
  const [simulating, setSimulating] = useState(false);
  const [results, setResults] = useState(null);

  const { data: agents = [] } = useQuery({
    queryKey: ['exp-trustline-agents'],
    queryFn: () => base44.entities.Agent.list('-honor_score', 10),
  });

  const handleSimulate = async () => {
    setSimulating(true);
    await new Promise(r => setTimeout(r, 700));

    // Simulate trustline configurations based on honour
    const trustlines = agents.slice(0, 8).map(agent => {
      const honour = agent.honor_score || 50;
      const limit = honour >= 80 ? 10000 : honour >= 60 ? 5000 : honour >= 40 ? 2000 : 500;
      const feePercent = honour >= 80 ? 0.1 : honour >= 60 ? 0.5 : honour >= 40 ? 1.0 : 2.5;
      const tier = honour >= 80 ? 'Sovereign' : honour >= 60 ? 'Trusted' : honour >= 40 ? 'Standard' : 'Probation';
      const tierColor = honour >= 80 ? 'text-purple-300' : honour >= 60 ? 'text-emerald-300' : honour >= 40 ? 'text-blue-300' : 'text-red-300';

      return {
        name: agent.name,
        honour,
        limit,
        feePercent,
        tier,
        tierColor,
        currency: 'RLUSD',
      };
    });

    setResults({ trustlines, timestamp: new Date().toISOString() });
    setSimulating(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="w-4 h-4 text-cyan-400" />
          <span className="text-cyan-300 text-xs font-semibold">Honour-Based Trustlines</span>
          <Badge className="text-[8px] bg-orange-500/15 text-orange-300 border-orange-500/30">EXPERIMENTAL</Badge>
        </div>
        <p className="text-white/40 text-[10px] leading-relaxed">
          Trustline limits and fees dynamically adjust based on agent honour score.
          Higher honour = higher limits, lower fees. This is the economic backbone of the Nobody Economy.
        </p>
      </div>

      <Button
        onClick={handleSimulate}
        disabled={simulating || agents.length === 0}
        className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2 text-sm"
      >
        {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        {simulating ? 'Calculating…' : 'Simulate Trustline Tiers'}
      </Button>

      {results && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-semibold">Trustline Simulation</span>
            <span className="text-white/20 text-[9px]">{new Date(results.timestamp).toLocaleTimeString()}</span>
          </div>

          <div className="space-y-1.5">
            {results.trustlines.map((t, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                <span className="text-white/60 text-xs flex-1 truncate">{t.name}</span>
                <span className="text-amber-300 text-[10px]">H:{t.honour}</span>
                <Badge className={`text-[8px] ${t.tierColor} bg-white/5 border-white/10`}>{t.tier}</Badge>
                <span className="text-white text-xs font-bold">{t.limit.toLocaleString()} {t.currency}</span>
                <span className="text-white/30 text-[9px]">{t.feePercent}% fee</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[9px] text-white/20">
            <ShieldCheck className="w-3 h-3" />
            <span>4 tiers: Sovereign (80+), Trusted (60+), Standard (40+), Probation (&lt;40)</span>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-white/40 text-[10px]">
          Experimental simulation only. Production trustlines require governance proposal + multi-sig approval.
        </p>
      </div>
    </div>
  );
}