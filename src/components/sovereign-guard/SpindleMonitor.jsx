import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import SpindleTrendsPanel from './spindle/SpindleTrendsPanel';
import SpindleDecisionFeed from './spindle/SpindleDecisionFeed';

export default function SpindleMonitor() {
  const [trends, setTrends] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    const [trendsRes, decisionsRes] = await Promise.all([
      base44.functions.invoke('spindleGate', { action: 'trends' }),
      base44.functions.invoke('spindleGate', { action: 'query_recent' }),
    ]);
    setTrends(trendsRes.data);
    setDecisions(decisionsRes.data.recent_decisions || []);
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white">Spindle Gate Monitor</h2>
          <Badge className="text-[9px] bg-purple-500/15 text-purple-300 border-purple-500/30">Phase 7</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-white/40 hover:text-white hover:bg-white/10 h-7 text-xs"
        >
          {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
          Refresh
        </Button>
      </div>

      {/* Doctrine */}
      <div className="rounded-lg border border-purple-500/10 bg-purple-500/[0.03] p-3">
        <p className="text-[10px] text-purple-300/50 leading-relaxed">
          <span className="text-purple-400/70 font-semibold">Spindle Doctrine:</span> Every agent action passes through three gates —
          the Monkey Layer (ground truth), the Regressive Trace (sincerity from memory), and the 8-Node Consortium (consensus).
          Only actions that survive all three gates reach the Empathy Layer. The Spindle does not guess. It traces.
        </p>
      </div>

      {/* Trends */}
      <SpindleTrendsPanel trends={trends} loading={loading} />

      {/* Decision Feed */}
      <SpindleDecisionFeed decisions={decisions} loading={loading} />
    </div>
  );
}