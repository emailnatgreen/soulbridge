import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield, ShieldAlert, ShieldCheck, Scan, FlaskConical,
  CheckCircle2, AlertTriangle, XCircle, Eye, Loader2,
  ChevronDown, ChevronUp
} from 'lucide-react';
import TripwireEventCard from './TripwireEventCard';
import TripwireSimulator from './TripwireSimulator';

const STATUS_CONFIG = {
  SECURE: { label: 'Secure', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20', icon: ShieldCheck },
  WARNING: { label: 'Warning', color: 'bg-amber-500/15 text-amber-300 border-amber-500/20', icon: ShieldAlert },
  ALERT: { label: 'Alert', color: 'bg-red-500/15 text-red-300 border-red-500/20', icon: XCircle },
};

export default function TripwireDashboard() {
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tripwire-status'],
    queryFn: async () => {
      const res = await base44.functions.invoke('tripwireLockdown', { action: 'status' });
      return res.data;
    },
    refetchInterval: 15000,
  });

  const scanMutation = useMutation({
    mutationFn: () => base44.functions.invoke('tripwireLockdown', { action: 'scan' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tripwire-status'] }),
  });

  const summary = data?.summary || { total_events: 0, active_alerts: 0, critical_count: 0, high_count: 0, system_status: 'SECURE' };
  const events = data?.events || [];
  const activeEvents = events.filter(e => e.status === 'active' || e.status === 'escalated');
  const displayEvents = showAll ? events : activeEvents;

  const StatusIcon = STATUS_CONFIG[summary.system_status]?.icon || ShieldCheck;

  return (
    <div className="rounded-2xl border border-red-500/20 bg-slate-900/60 p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Shield className="w-5 h-5 text-red-400" />
        <h2 className="text-white font-semibold">Tripwire Lockdown</h2>
        <Badge className="text-[10px] bg-red-500/15 text-red-300 border-red-500/20 ml-1">
          Sprint 3
        </Badge>
        <Badge className={`text-[10px] ml-auto ${STATUS_CONFIG[summary.system_status]?.color || ''}`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {STATUS_CONFIG[summary.system_status]?.label || 'Unknown'}
        </Badge>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <StatBox label="Total Events" value={summary.total_events} color="text-slate-300" />
        <StatBox label="Active" value={summary.active_alerts} color="text-amber-300" />
        <StatBox label="Critical" value={summary.critical_count} color="text-red-400" />
        <StatBox label="High" value={summary.high_count} color="text-orange-400" />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Button
          size="sm"
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
          className="bg-red-600 hover:bg-red-500 text-xs"
        >
          {scanMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Scan className="w-3 h-3" />}
          Run Security Scan
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowSimulator(!showSimulator)}
          className="text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
        >
          <FlaskConical className="w-3 h-3" />
          {showSimulator ? 'Hide' : 'Simulate'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAll(!showAll)}
          className="text-xs border-white/10 text-slate-400 hover:bg-white/5"
        >
          {showAll ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {showAll ? 'Active Only' : 'Show All'}
        </Button>
      </div>

      {/* Scan result feedback */}
      {scanMutation.isSuccess && (
        <div className="mb-3 p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Scan complete — {scanMutation.data?.data?.alerts_generated || 0} alert(s) generated.
        </div>
      )}

      {/* Simulator */}
      {showSimulator && <TripwireSimulator />}

      {/* Events List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
        </div>
      ) : displayEvents.length === 0 ? (
        <div className="text-center py-6">
          <ShieldCheck className="w-8 h-8 text-emerald-400/40 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No {showAll ? '' : 'active '}alerts. System secure.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {displayEvents.map(event => (
            <TripwireEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/5 p-2 text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[9px] text-slate-500">{label}</p>
    </div>
  );
}