import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import SpindleTopBar from './spindle/SpindleTopBar';
import LiveSpindleStream from './spindle/LiveSpindleStream';
import RegressiveTracePanel from './spindle/RegressiveTracePanel';
import NodeConsensusMap from './spindle/NodeConsensusMap';
import BlockReasonsTrends from './spindle/BlockReasonsTrends';
import EventDetailDrawer from './spindle/EventDetailDrawer';

export default function SpindleMonitor() {
  const [trends, setTrends] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState(null);

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

  const lastDecision = decisions.length > 0 ? decisions[0] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <SpindleTopBar lastDecision={lastDecision} />
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
      <div className="rounded-lg border border-purple-500/10 bg-purple-500/[0.03] p-3">
        <p className="text-[10px] text-purple-300/50 leading-relaxed">
          <span className="text-purple-400/70 font-semibold">Spindle Doctrine:</span> Every agent action passes through three gates —
          the Monkey Layer (ground truth), the Regressive Trace (sincerity from memory), and the 8-Node Consortium (consensus).
          Only actions that survive all three gates reach the Empathy Layer. The Spindle does not guess. It traces.
        </p>
      </div>

      {/* Panel 1: Live Stream */}
      <LiveSpindleStream
        decisions={decisions}
        loading={false}
        onSelectDecision={setSelectedDecision}
      />

      {/* Panel 2: Regressive Trace */}
      <RegressiveTracePanel decisions={decisions} />

      {/* Panel 3: Node Consensus Map */}
      <NodeConsensusMap lastDecision={lastDecision} />

      {/* Panel 4: Block Reasons & Trends */}
      <BlockReasonsTrends trends={trends} loading={false} />

      {/* Panel 5: Event Detail Drawer */}
      {selectedDecision && (
        <EventDetailDrawer
          decision={selectedDecision}
          onClose={() => setSelectedDecision(null)}
        />
      )}
    </div>
  );
}