import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import EmpathyTopBar from './empathy/EmpathyTopBar';
import EmpathyTrendsPanel from './empathy/EmpathyTrendsPanel';
import EmpathyScorePanel from './empathy/EmpathyScorePanel';
import EmpathyConsensusGrid from './empathy/EmpathyConsensusGrid';
import EmpathyDecisionFeed from './empathy/EmpathyDecisionFeed';
import EmpathyRelationalArc from './empathy/EmpathyRelationalArc';

export default function EmpathyMonitor() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    const res = await base44.functions.invoke('empathyGate', { action: 'monitor' });
    setData(res.data);
  };

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-pink-400" />
      </div>
    );
  }

  const decisions = data?.recent_decisions || [];
  const traces = data?.traces || [];
  const trends = data?.trends || null;
  const lastDecision = decisions.length > 0 ? decisions[0] : null;

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <EmpathyTopBar lastDecision={lastDecision} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-white/40 hover:text-white hover:bg-white/10 h-7 text-xs shrink-0"
        >
          {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
          Refresh
        </Button>
      </div>

      {/* Doctrine */}
      <div className="rounded-lg border border-pink-500/10 bg-pink-500/[0.03] p-3">
        <p className="text-[10px] text-pink-300/50 leading-relaxed">
          <span className="text-pink-400/70 font-semibold">Empathy Doctrine:</span> The Empathy Layer is the sap of the Village — the living current that turns structural integrity into relational wisdom.
          Behaviour is not just filtered — it is <em>felt</em>. Sincerity matters, not just compliance.
          Repair is a first-class output — guided correction, not punishment. Shadows reveal patterns — the Village learns.
          The system is lawful <em>and</em> warm.
        </p>
      </div>

      {/* Trends KPIs */}
      <EmpathyTrendsPanel trends={trends} loading={false} />

      {/* Relational Arc — Mycelial Memory */}
      <EmpathyRelationalArc traces={traces} loading={false} />

      {/* Empathy Score — Harmonic Mean */}
      <EmpathyScorePanel decisions={decisions} />

      {/* Empathy Consensus — Council of Eight */}
      <EmpathyConsensusGrid lastDecision={lastDecision} />

      {/* Decision Feed with block reasons + repair suggestions */}
      <EmpathyDecisionFeed decisions={decisions} loading={false} />
    </div>
  );
}