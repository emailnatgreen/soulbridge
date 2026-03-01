import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, CheckCircle2, X, Zap } from 'lucide-react';

const ALERT_CONFIG = {
  revocation_detected: { color: 'text-red-400', bg: 'bg-red-900/20 border-red-500/20', icon: AlertTriangle },
  permission_removed: { color: 'text-red-400', bg: 'bg-red-900/20 border-red-500/20', icon: AlertTriangle },
  agent_unlinked: { color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-500/20', icon: AlertCircle },
  version_anomaly: { color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-500/20', icon: AlertCircle },
};

function AlertRow({ alert, onAcknowledge }) {
  const isAcknowledged = alert.status === 'acknowledged';
  const config = ALERT_CONFIG[alert.alert_type] || { color: 'text-white/60', bg: 'bg-slate-800/20' };
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 border rounded-lg px-4 py-3 text-xs transition-all ${config.bg} ${isAcknowledged ? 'opacity-50' : ''}`}>
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-semibold ${config.color}`}>{alert.title}</span>
          <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
            {alert.severity.toUpperCase()}
          </Badge>
          {isAcknowledged && <span className="text-green-400 text-xs">✓ Acknowledged</span>}
        </div>
        <p className="text-white/40 mt-1">{alert.description}</p>
        {alert.notified_agent_ids?.length > 0 && (
          <p className="text-white/25 text-xs mt-1">{alert.notified_agent_ids.length} agent(s) notified</p>
        )}
      </div>
      {!isAcknowledged && (
        <Button size="sm" variant="ghost" onClick={() => onAcknowledge(alert.id)}
          className="h-6 px-2 text-green-400 hover:bg-green-900/30 shrink-0">
          <CheckCircle2 className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

export default function DidHealthAlertsPanel() {
  const [filterStatus, setFilterStatus] = useState('active');
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['didHealthAlerts', filterStatus],
    queryFn: () => base44.entities.DidHealthAlert.filter(
      { status: filterStatus },
      '-created_date',
      50
    ),
    refetchInterval: 20000,
  });

  // Real-time subscription for new alerts
  useEffect(() => {
    const unsub = base44.entities.DidHealthAlert.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        queryClient.invalidateQueries({ queryKey: ['didHealthAlerts'] });
      }
    });
    return unsub;
  }, [queryClient]);

  const acknowledgeMutation = useMutation({
    mutationFn: (alertId) => base44.entities.DidHealthAlert.update(alertId, { status: 'acknowledged' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['didHealthAlerts'] }),
  });

  const stats = useMemo(() => {
    const allAlerts = alerts;
    return {
      critical: allAlerts.filter(a => a.severity === 'critical').length,
      high: allAlerts.filter(a => a.severity === 'high').length,
      medium: allAlerts.filter(a => a.severity === 'medium').length,
    };
  }, [alerts]);

  const displayAlerts = alerts.filter(a => filterStatus === 'all' || a.status === filterStatus);

  return (
    <div className="bg-slate-800/40 border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-sm text-white/80">DID Health Alerts</span>
          {stats.critical > 0 && (
            <Badge className="bg-red-600 text-white border-0 text-xs">{stats.critical} critical</Badge>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex gap-2 px-5 py-2 border-b border-white/5 text-xs">
        <button onClick={() => setFilterStatus('active')}
          className={`px-3 py-1 rounded-full border transition-colors ${filterStatus === 'active' ? 'bg-red-600/30 border-red-500 text-red-300' : 'border-white/10 text-white/50 hover:text-white'}`}>
          Active ({alerts.filter(a => a.status === 'active').length})
        </button>
        <button onClick={() => setFilterStatus('acknowledged')}
          className={`px-3 py-1 rounded-full border transition-colors ${filterStatus === 'acknowledged' ? 'bg-green-600/30 border-green-500 text-green-300' : 'border-white/10 text-white/50 hover:text-white'}`}>
          Acknowledged ({alerts.filter(a => a.status === 'acknowledged').length})
        </button>
      </div>

      {/* Alert list */}
      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-white/20 text-sm">Loading alerts…</div>
        ) : displayAlerts.length === 0 ? (
          <div className="text-center py-8 text-white/20 text-sm">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30 text-green-400" />
            {filterStatus === 'active' ? 'All systems healthy' : 'No acknowledged alerts'}
          </div>
        ) : (
          displayAlerts.map(alert => (
            <AlertRow key={alert.id} alert={alert} onAcknowledge={() => acknowledgeMutation.mutate(alert.id)} />
          ))
        )}
      </div>
    </div>
  );
}