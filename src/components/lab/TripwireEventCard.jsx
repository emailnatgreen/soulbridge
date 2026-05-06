import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle, ShieldAlert, XCircle, Eye, CheckCircle2,
  Loader2, ChevronRight
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const SEVERITY_STYLES = {
  low: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  medium: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  high: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
  critical: 'bg-red-500/10 text-red-300 border-red-500/20',
};

const STATUS_STYLES = {
  active: 'bg-red-500/15 text-red-300 border-red-500/20',
  acknowledged: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  resolved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  escalated: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  false_positive: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
};

const TYPE_ICONS = {
  anomaly_detected: AlertTriangle,
  threshold_breach: ShieldAlert,
  access_violation: XCircle,
  entropy_tampering: XCircle,
  node_offline: ShieldAlert,
  rate_limit_exceeded: AlertTriangle,
  multisig_alert: Eye,
  sentinel_flag: Eye,
  pattern_deviation: AlertTriangle,
};

export default function TripwireEventCard({ event }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const acknowledgeMutation = useMutation({
    mutationFn: () => base44.functions.invoke('tripwireLockdown', {
      action: 'acknowledge', event_id: event.id,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tripwire-status'] }),
  });

  const resolveMutation = useMutation({
    mutationFn: () => base44.functions.invoke('tripwireLockdown', {
      action: 'resolve', event_id: event.id, resolution_notes: 'Resolved via Lab dashboard.',
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tripwire-status'] }),
  });

  const Icon = TYPE_ICONS[event.event_type] || AlertTriangle;
  const isActive = event.status === 'active' || event.status === 'escalated';
  const isSimulation = event.details?.simulation === true;

  return (
    <div className={`rounded-xl border p-3 transition-all ${
      isActive ? 'bg-red-500/[0.03] border-red-500/15 hover:border-red-500/30' : 'bg-white/[0.02] border-white/5 hover:border-white/10'
    }`}>
      <div className="flex items-start gap-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
          event.severity === 'critical' ? 'text-red-400' :
          event.severity === 'high' ? 'text-orange-400' :
          event.severity === 'medium' ? 'text-amber-400' : 'text-slate-400'
        }`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <Badge className={`text-[9px] ${SEVERITY_STYLES[event.severity]}`}>{event.severity}</Badge>
            <Badge className={`text-[9px] ${STATUS_STYLES[event.status]}`}>{event.status}</Badge>
            {isSimulation && <Badge className="text-[9px] bg-purple-500/15 text-purple-300 border-purple-500/20">SIM</Badge>}
            {event.source_node && (
              <span className="text-[9px] text-slate-500">Node: {event.source_node}</span>
            )}
          </div>
          <p className="text-white text-xs leading-relaxed">{event.description}</p>
          {event.created_date && (
            <span className="text-[9px] text-slate-600 mt-1 block">
              {format(parseISO(event.created_date), 'MMM d, HH:mm:ss')}
            </span>
          )}
        </div>
        <ChevronRight className={`w-3 h-3 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </div>

      {expanded && (
        <div className="mt-3 pl-6 space-y-2">
          {event.sentinel_notes && (
            <div className="text-[10px] text-cyan-300 bg-cyan-500/5 rounded-lg p-2 border border-cyan-500/10">
              <strong>Sentinel:</strong> {event.sentinel_notes}
            </div>
          )}
          {event.details && (
            <pre className="text-[9px] text-slate-400 bg-black/20 rounded-lg p-2 overflow-auto max-h-24">
              {JSON.stringify(event.details, null, 2)}
            </pre>
          )}
          {event.notified_signers?.length > 0 && (
            <p className="text-[9px] text-slate-500">
              Notified: {event.notified_signers.join(', ')}
            </p>
          )}
          {event.resolution_notes && (
            <p className="text-[10px] text-emerald-300">
              Resolution: {event.resolution_notes}
            </p>
          )}
          {isActive && (
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); acknowledgeMutation.mutate(); }}
                disabled={acknowledgeMutation.isPending}
                className="text-[10px] h-6 px-2 border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
              >
                {acknowledgeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                Acknowledge
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); resolveMutation.mutate(); }}
                disabled={resolveMutation.isPending}
                className="text-[10px] h-6 px-2 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
              >
                {resolveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Resolve
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}