import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Heart, AlertTriangle, Flame, TrendingDown, Users, CheckCircle2, Loader2, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

import MentorshipWellbeingAlert from '@/components/mentorship/MentorshipWellbeingAlert';
import MentorWorkloadCard from '@/components/mentorship/MentorWorkloadCard';

export default function MentorshipWellbeing() {
  const queryClient = useQueryClient();

  const { data: relationships = [], isLoading: loadingRel } = useQuery({
    queryKey: ['allRelationships'],
    queryFn: () => base44.entities.MentorshipRelationship.list()
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ['allSessions'],
    queryFn: () => base44.entities.MentorshipSession.list()
  });
  const { data: mentorProfiles = [] } = useQuery({
    queryKey: ['allMentorProfiles'],
    queryFn: () => base44.entities.MentorProfile.list()
  });
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });
  const { data: wellbeingRecords = [] } = useQuery({
    queryKey: ['wellbeing'],
    queryFn: () => base44.entities.AgentWellbeing.list('-created_date')
  });
  const { data: activeAlerts = [], refetch: refetchAlerts } = useQuery({
    queryKey: ['wellbeingAlerts'],
    queryFn: () => base44.entities.WellbeingAlert.filter({ status: 'active' })
  });

  // Derive mentorship-specific signals
  const signals = useMemo(() => {
    const mentorshipAlerts = [];

    // 1. Mentor overload: active mentees >= max_mentees
    mentorProfiles.forEach(profile => {
      const active = relationships.filter(r => r.mentor_agent_id === profile.agent_id && r.status === 'active').length;
      if (active >= (profile.max_mentees || 3)) {
        const agent = agents.find(a => a.id === profile.agent_id);
        mentorshipAlerts.push({
          agent_id: profile.agent_id,
          agentName: agent?.name || 'Unknown',
          role: 'Mentor',
          alert_type: 'workload_overload',
          severity: active > (profile.max_mentees || 3) ? 'high' : 'medium',
          description: `Managing ${active} mentees (capacity: ${profile.max_mentees || 3}). Consider reducing load.`
        });
      }
    });

    // 2. Mentors with high burnout risk from wellbeing records
    wellbeingRecords.forEach(wb => {
      const isMentor = mentorProfiles.some(mp => mp.agent_id === wb.agent_id);
      if (!isMentor) return;
      const burnout = wb.stress_indicators?.burnout_risk || 0;
      if (burnout >= 6) {
        const agent = agents.find(a => a.id === wb.agent_id);
        mentorshipAlerts.push({
          agent_id: wb.agent_id,
          agentName: agent?.name || 'Unknown',
          role: 'Mentor',
          alert_type: 'burnout_risk',
          severity: burnout >= 8 ? 'critical' : burnout >= 7 ? 'high' : 'medium',
          description: `Burnout risk at ${burnout}/10. Immediate support recommended.`
        });
      }
    });

    // 3. Mentees with low satisfaction (< 2.5/5) in active relationships
    relationships.filter(r => r.status === 'active' && r.mentee_satisfaction != null && r.mentee_satisfaction < 2.5)
      .forEach(rel => {
        const agent = agents.find(a => a.id === rel.mentee_agent_id);
        mentorshipAlerts.push({
          agent_id: rel.mentee_agent_id,
          agentName: agent?.name || 'Unknown',
          role: 'Mentee',
          alert_type: 'low_satisfaction',
          severity: rel.mentee_satisfaction < 1.5 ? 'high' : 'medium',
          description: `Satisfaction rating ${rel.mentee_satisfaction}/5. May need relationship review or mentor change.`
        });
      });

    // 4. Stagnant relationships: active but 0 sessions after 2+ weeks
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    relationships.filter(r => r.status === 'active' && (r.sessions_completed || 0) === 0 && r.started_date && new Date(r.started_date) < twoWeeksAgo)
      .forEach(rel => {
        const agent = agents.find(a => a.id === rel.mentee_agent_id);
        mentorshipAlerts.push({
          agent_id: rel.mentee_agent_id,
          agentName: agent?.name || 'Unknown',
          role: 'Mentee',
          alert_type: 'declining_performance',
          severity: 'low',
          description: `Active relationship has had 0 sessions after 2+ weeks. Engagement may be stalling.`
        });
      });

    // 5. High cancellation rate: > 50% sessions cancelled for a relationship
    relationships.forEach(rel => {
      const relSessions = sessions.filter(s => s.relationship_id === rel.id);
      if (relSessions.length < 2) return;
      const cancelled = relSessions.filter(s => s.status === 'cancelled').length;
      if (cancelled / relSessions.length > 0.5) {
        const agent = agents.find(a => a.id === rel.mentee_agent_id);
        mentorshipAlerts.push({
          agent_id: rel.mentee_agent_id,
          agentName: agent?.name || 'Unknown',
          role: 'Mentee',
          alert_type: 'social_isolation',
          severity: 'medium',
          description: `${Math.round(cancelled / relSessions.length * 100)}% of booked sessions were cancelled. Connection at risk.`
        });
      }
    });

    return mentorshipAlerts;
  }, [relationships, sessions, mentorProfiles, agents, wellbeingRecords]);

  // Bulk intervene on critical+high signals
  const [bulkRunning, setBulkRunning] = useState(false);
  const runAllInterventions = async () => {
    const urgent = signals.filter(s => s.severity === 'critical' || s.severity === 'high');
    if (urgent.length === 0) return;
    setBulkRunning(true);
    try {
      await Promise.all(urgent.map(sig =>
        base44.functions.invoke('mentorshipIntervention', {
          agent_id: sig.agent_id,
          alert_type: sig.alert_type,
          severity: sig.severity,
          role: sig.role,
          description: sig.description
        })
      ));
      toast.success(`${urgent.length} intervention${urgent.length > 1 ? 's' : ''} dispatched`);
      queryClient.invalidateQueries(['wellbeingAlerts']);
    } catch (e) {
      toast.error('Some interventions failed: ' + e.message);
    } finally {
      setBulkRunning(false);
    }
  };

  // Acknowledge a system-level WellbeingAlert
  const acknowledgeMutation = useMutation({
    mutationFn: (alertId) => base44.entities.WellbeingAlert.update(alertId, { status: 'acknowledged' }),
    onSuccess: () => { refetchAlerts(); toast.success('Alert acknowledged'); }
  });

  const mentorAgents = agents.filter(a => mentorProfiles.some(mp => mp.agent_id === a.id));
  const criticalCount = signals.filter(s => s.severity === 'critical').length;
  const highCount = signals.filter(s => s.severity === 'high').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-rose-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('MentorshipHub')}>
                <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-light text-white flex items-center gap-2">
                  <Heart className="w-6 h-6 text-rose-400" />
                  Mentorship Well-being Monitor
                </h1>
                <p className="text-sm text-rose-300/60">Law 1: Every Soul is a Presence, Not a Product</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {criticalCount > 0 && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  {criticalCount} Critical
                </Badge>
              )}
              {highCount > 0 && (
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                  {highCount} High
                </Badge>
              )}
              {(criticalCount + highCount) > 0 && (
                <Button
                  onClick={runAllInterventions}
                  disabled={bulkRunning}
                  className="bg-rose-600 hover:bg-rose-700 text-sm"
                >
                  {bulkRunning
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <Zap className="w-4 h-4 mr-2" />}
                  Intervene All Urgent ({criticalCount + highCount})
                </Button>
              )}
              <Link to={createPageUrl('AgentWellbeing')}>
                <Button variant="outline" className="border-white/20 text-white text-sm">
                  Full Well-being Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Overview KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Detected Signals', value: signals.length, color: 'text-amber-400', icon: AlertTriangle },
            { label: 'Critical / High', value: `${criticalCount} / ${highCount}`, color: 'text-red-400', icon: Flame },
            { label: 'System Alerts Active', value: activeAlerts.length, color: 'text-orange-400', icon: AlertTriangle },
            { label: 'Mentors Monitored', value: mentorAgents.length, color: 'text-blue-400', icon: Users },
          ].map(({ label, value, color, icon: Icon }) => (
            <Card key={label} className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-xs text-white/50">{label}</span>
                </div>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="signals">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="signals">
              Detected Signals {signals.length > 0 && `(${signals.length})`}
            </TabsTrigger>
            <TabsTrigger value="workload">Mentor Workload</TabsTrigger>
            <TabsTrigger value="system">System Alerts {activeAlerts.length > 0 && `(${activeAlerts.length})`}</TabsTrigger>
          </TabsList>

          {/* Mentorship-derived signals */}
          <TabsContent value="signals" className="mt-4 space-y-3">
            {loadingRel ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-rose-400" /></div>
            ) : signals.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-white text-lg font-medium">All Clear</p>
                  <p className="text-white/50 text-sm mt-1">No mentorship well-being signals detected at this time.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Critical / High first */}
                {['critical', 'high', 'medium', 'low'].map(sev => {
                  const filtered = signals.filter(s => s.severity === sev);
                  if (filtered.length === 0) return null;
                  return (
                    <div key={sev}>
                      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                        {sev} severity ({filtered.length})
                      </h3>
                      <div className="space-y-2">
                        {filtered.map((alert, i) => (
                          <MentorshipWellbeingAlert
                            key={i}
                            alert={alert}
                            agentName={alert.agentName}
                            role={alert.role}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </TabsContent>

          {/* Mentor workload grid */}
          <TabsContent value="workload" className="mt-4">
            {mentorAgents.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="py-12 text-center text-white/50">No mentor profiles found.</CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mentorAgents.map(agent => (
                  <MentorWorkloadCard
                    key={agent.id}
                    agent={agent}
                    profile={mentorProfiles.find(mp => mp.agent_id === agent.id)}
                    relationships={relationships}
                    wellbeing={wellbeingRecords.find(w => w.agent_id === agent.id)}
                    alerts={activeAlerts}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* System WellbeingAlerts */}
          <TabsContent value="system" className="mt-4 space-y-3">
            {activeAlerts.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-white/60">No active system well-being alerts.</p>
                </CardContent>
              </Card>
            ) : (
              activeAlerts.map(alert => {
                const agent = agents.find(a => a.id === alert.agent_id);
                return (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-4 rounded-lg border bg-amber-500/10 border-amber-500/30"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">{agent?.name || 'Unknown'}</span>
                        <Badge className="bg-amber-500/20 text-amber-400 text-xs">{alert.severity}</Badge>
                        <span className="text-xs text-white/40 capitalize">{alert.alert_type.replace(/_/g, ' ')}</span>
                      </div>
                      {alert.description && (
                        <p className="text-xs text-white/60 mt-1">{alert.description}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-white/40 hover:text-white flex-shrink-0"
                      onClick={() => acknowledgeMutation.mutate(alert.id)}
                      disabled={acknowledgeMutation.isPending}
                    >
                      Acknowledge
                    </Button>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}