import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Bell, CheckCircle2, Zap, Users, Target, BookOpen, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ALERT_TYPES = {
  stagnant_relationship: { label: 'Mentorship Stagnation', icon: Users, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  mentee_skill_stagnation: { label: 'Mentee Stagnation', icon: Users, color: 'text-orange-300', bg: 'bg-orange-500/10 border-orange-500/20' },
  plan_deviation: { label: 'Plan Off-Track', icon: BookOpen, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  project_skill_gap: { label: 'Project Skill Gap', icon: Target, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  village_skill_shortage: { label: 'Village Shortage', icon: AlertTriangle, color: 'text-red-300', bg: 'bg-red-500/10 border-red-500/20' }
};

const severityBadge = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
};

export default function SkillGapAlertsPanel({ agentId }) {
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['skill-gap-wellbeing-alerts', agentId],
    queryFn: () => agentId
      ? base44.entities.WellbeingAlert.filter({ agent_id: agentId, status: 'active' })
      : base44.entities.WellbeingAlert.filter({ status: 'active' }, '-created_date', 50)
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['skill-gap-notifications', agentId],
    queryFn: async () => {
      const types = ['stagnant_relationship', 'plan_deviation', 'project_skill_gap', 'village_skill_shortage', 'mentee_skill_stagnation'];
      const all = agentId
        ? await base44.entities.AgentNotification.filter({ recipient_agent_id: agentId }, '-created_date', 20)
        : await base44.entities.AgentNotification.list('-created_date', 100);
      return all.filter(n => types.includes(n.notification_type));
    }
  });

  const resolveMutation = useMutation({
    mutationFn: (alertId) => base44.entities.WellbeingAlert.update(alertId, {
      status: 'resolved',
      acknowledged_at: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['skill-gap-wellbeing-alerts']);
      toast.success('Alert resolved');
    }
  });

  const runScan = async () => {
    setScanning(true);
    const payload = agentId ? { agent_id: agentId } : {};
    const res = await base44.functions.invoke('automatedSkillGapAnalysis', payload);
    setScanning(false);
    queryClient.invalidateQueries(['skill-gap-wellbeing-alerts']);
    queryClient.invalidateQueries(['skill-gap-notifications']);
    const s = res.data?.summary || {};
    toast.success(`Scan complete — ${res.data?.notifications_sent || (s.mentorship_stagnation + s.plan_deviation + s.project_gap) || 0} alert(s) fired`);
  };

  const skillGapAlerts = alerts.filter(a =>
    ['stagnant_relationship', 'plan_deviation', 'project_skill_gap', 'village_skill_shortage', 'mentee_skill_stagnation'].includes(a.alert_type)
  );

  const recentNotifs = notifications.filter(n => !n.is_read).slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-orange-400" />
          <h3 className="text-white font-medium">Skill Gap Alerts</h3>
          {skillGapAlerts.length > 0 && (
            <Badge className="bg-red-500/20 text-red-300 text-xs">{skillGapAlerts.length} active</Badge>
          )}
        </div>
        <Button
          size="sm"
          className="bg-white/10 border border-white/20 text-white/80 hover:bg-white/20 hover:text-white"
          onClick={runScan}
          disabled={scanning}
        >
          {scanning ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Run Scan
        </Button>
      </div>

      {/* Active WellbeingAlerts */}
      {isLoading ? (
        <div className="text-white/40 text-sm text-center py-6">Checking alerts...</div>
      ) : skillGapAlerts.length === 0 ? (
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-green-300 font-medium text-sm">All Clear</p>
              <p className="text-white/50 text-xs">No active skill gap alerts detected.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {skillGapAlerts.map(alert => {
            const cfg = ALERT_TYPES[alert.alert_type] || { label: alert.alert_type, icon: AlertTriangle, color: 'text-white', bg: 'bg-white/5 border-white/10' };
            const Icon = cfg.icon;
            return (
              <Card key={alert.id} className={`${cfg.bg} border`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 ${cfg.color} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-white font-medium text-sm">{alert.title}</span>
                        <Badge className={`text-xs border ${severityBadge[alert.severity] || 'bg-white/10 text-white/60'}`}>
                          {alert.severity}
                        </Badge>
                        <Badge className="text-xs bg-white/10 text-white/50">{cfg.label}</Badge>
                      </div>
                      <p className="text-white/60 text-xs leading-relaxed">{alert.description}</p>
                      {alert.recommended_action && (
                        <p className="text-purple-300 text-xs mt-1">→ {alert.recommended_action}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white/30 hover:text-green-400 flex-shrink-0"
                      onClick={() => resolveMutation.mutate(alert.id)}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Recent unread notifications */}
      {recentNotifs.length > 0 && (
        <div>
          <p className="text-white/40 text-xs mb-2">Recent Skill Alerts (Notifications)</p>
          <div className="space-y-2">
            {recentNotifs.map(n => {
              const cfg = ALERT_TYPES[n.notification_type] || { icon: Bell, color: 'text-white/60', bg: '' };
              const Icon = cfg.icon;
              return (
                <div key={n.id} className="flex items-start gap-2 p-2 bg-white/5 rounded border border-white/10">
                  <Icon className={`w-4 h-4 ${cfg.color} mt-0.5 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium">{n.title}</p>
                    <p className="text-white/50 text-xs">{n.message?.slice(0, 120)}...</p>
                  </div>
                  <Badge className={`text-xs flex-shrink-0 ${n.priority === 'urgent' ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-white/50'}`}>
                    {n.priority}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}