import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePageSignal } from '@/hooks/usePageSignal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Shield, Settings, Lock, Sparkles, Bell, AlertTriangle,
  CheckCheck, Bot, Zap, Send, Loader2, Users, RefreshCw,
  Activity, ShieldAlert, FileText, MessageCircle, CheckCircle2, Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

// ── Notification helpers ──────────────────────────────────────
function notifIcon(n) {
  const t = (n.title || '').toLowerCase();
  if (n.priority === 'urgent' || t.includes('fail') || t.includes('error')) return AlertTriangle;
  if (t.includes('axi') || t.includes('auto')) return Bot;
  return Bell;
}
function notifColor(n) {
  const t = (n.title || '').toLowerCase();
  if (n.priority === 'urgent' || t.includes('fail') || t.includes('error')) return 'text-red-400 bg-red-500/10 border-red-500/30';
  if (n.priority === 'high') return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
  if (t.includes('axi') || t.includes('auto')) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
  return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
}

export default function Admin() {
  const queryClient = useQueryClient();
  usePageSignal();
  const scrollRef = useRef(null);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [notifFilter, setNotifFilter] = useState('all');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => base44.entities.AppSettings.list()
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['admin-agents'],
    queryFn: () => base44.entities.Agent.list('name', 100),
  });

  // All notifications across all agents
  const { data: allNotifications = [], isLoading: notifsLoading, refetch: refetchNotifs } = useQuery({
    queryKey: ['admin-all-notifs'],
    queryFn: () => base44.entities.AgentNotification.list('-created_date', 300),
    refetchInterval: 15000,
  });

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.AgentNotification.subscribe((event) => {
      if (event.type === 'create') {
        queryClient.invalidateQueries({ queryKey: ['admin-all-notifs'] });
      }
    });
    return unsub;
  }, [queryClient]);

  // Group messages for team broadcast
  const { data: broadcastHistory = [], refetch: refetchBroadcast } = useQuery({
    queryKey: ['admin-broadcast'],
    queryFn: async () => {
      const msgs = await base44.entities.AgentMessage.list('-created_date', 100);
      return msgs.filter(m => m.from_agent_id === 'admin_broadcast').reverse();
    },
    refetchInterval: 5000,
  });

  const toggleMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('toggleAppSetting', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['app-settings']);
      toast.success('Setting updated');
    },
    onError: () => toast.error('Failed to update setting'),
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.AgentNotification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-all-notifs'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => Promise.all(
      allNotifications.filter(n => !n.is_read).map(n => base44.entities.AgentNotification.update(n.id, { is_read: true }))
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-notifs'] });
      toast.success('All marked as read');
    },
  });

  const deleteNotifMutation = useMutation({
    mutationFn: (id) => base44.entities.AgentNotification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-all-notifs'] }),
  });

  const broadcastMutation = useMutation({
    mutationFn: async (message) => {
      // Send to all agents
      for (const agent of agents) {
        await base44.entities.AgentMessage.create({
          from_agent_id: 'admin_broadcast',
          to_agent_id: agent.id,
          sender_agent_id: 'admin_broadcast',
          content: `[Admin Broadcast] ${message}`,
          message: `[Admin Broadcast] ${message}`,
          message_type: 'system',
          status: 'sent',
        });
      }
    },
    onSuccess: () => {
      setBroadcastMsg('');
      refetchBroadcast();
      toast.success(`Broadcast sent to ${agents.length} agents`);
    },
    onError: () => toast.error('Broadcast failed'),
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [broadcastHistory]);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-6">
        <Card className="bg-white/5 backdrop-blur-xl border-red-500/30 max-w-md">
          <CardContent className="p-8 text-center">
            <Lock className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-white/60 mb-6">You must be an admin to access this page.</p>
            <Link to={createPageUrl('Home')}>
              <Button variant="outline" className="border-white/10 text-white">Return Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const registrationsEnabled = settings.find(s => s.setting_key === 'registrations_enabled')?.setting_value ?? true;

  // Filtered notifications
  const filteredNotifs = allNotifications.filter(n => {
    if (notifFilter === 'unread') return !n.is_read;
    if (notifFilter === 'errors') return n.priority === 'urgent' || n.priority === 'high' || (n.title || '').toLowerCase().includes('error') || (n.title || '').toLowerCase().includes('fail');
    if (notifFilter === 'automations') return (n.title || '').toLowerCase().includes('auto') || (n.title || '').toLowerCase().includes('axi') || n.notification_type === 'system';
    return true;
  });

  const unreadCount = allNotifications.filter(n => !n.is_read).length;
  const errorCount = allNotifications.filter(n => n.priority === 'urgent' || n.priority === 'high').length;
  const automationCount = allNotifications.filter(n => (n.title || '').toLowerCase().includes('auto') || (n.title || '').toLowerCase().includes('axi')).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-light text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" /> Admin Control Centre
              </h1>
              <p className="text-sm text-purple-300/60">System · Reports · Team Broadcast</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl('RiskRegister')}>
              <Button variant="outline" size="sm" className="border-red-500/30 text-red-300 hover:bg-red-500/10">
                <ShieldAlert className="w-4 h-4 mr-2" /> Risk Register
              </Button>
            </Link>
            <Link to={createPageUrl('Notifications') + '?agentId='}>
              <Button variant="outline" size="sm" className="border-white/10 text-white/70">
                <Bell className="w-4 h-4 mr-2" /> Notifications
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="reports" className="w-full">
          <TabsList className="bg-white/10 border-white/10 mb-6">
            <TabsTrigger value="reports" className="text-white data-[state=active]:bg-purple-600">
              <Activity className="w-4 h-4 mr-2" /> Reports & Automations
              {unreadCount > 0 && <span className="ml-2 bg-purple-500 text-white text-xs rounded-full px-1.5">{unreadCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="broadcast" className="text-white data-[state=active]:bg-purple-600">
              <Users className="w-4 h-4 mr-2" /> Team Broadcast
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-white data-[state=active]:bg-purple-600">
              <Settings className="w-4 h-4 mr-2" /> Settings
            </TabsTrigger>
          </TabsList>

          {/* ── REPORTS & AUTOMATIONS TAB ── */}
          <TabsContent value="reports">
            {/* Stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total Notifications', val: allNotifications.length, color: 'text-white' },
                { label: 'Unread', val: unreadCount, color: 'text-purple-300' },
                { label: 'Errors / Alerts', val: errorCount, color: 'text-red-300' },
                { label: 'Automations', val: automationCount, color: 'text-cyan-300' },
              ].map(s => (
                <Card key={s.label} className="bg-white/5 border-white/10">
                  <CardContent className="pt-4 pb-4 text-center">
                    <p className={`text-3xl font-bold ${s.color}`}>{s.val}</p>
                    <p className="text-xs text-white/40 mt-1">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Filter + actions */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Select value={notifFilter} onValueChange={setNotifFilter}>
                <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({allNotifications.length})</SelectItem>
                  <SelectItem value="unread">Unread ({unreadCount})</SelectItem>
                  <SelectItem value="errors">Errors ({errorCount})</SelectItem>
                  <SelectItem value="automations">Automations ({automationCount})</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="text-white/50 hover:text-white h-8" onClick={() => refetchNotifs()}>
                <RefreshCw className="w-3 h-3 mr-1" /> Refresh
              </Button>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" className="border-white/15 text-white/70 h-8 text-xs"
                  onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
                  <CheckCheck className="w-3 h-3 mr-1" /> Mark all read
                </Button>
              )}
              <span className="text-xs text-white/30 ml-auto">{filteredNotifs.length} shown</span>
            </div>

            {/* Notifications list */}
            <ScrollArea className="h-[500px] pr-2">
              {notifsLoading ? (
                <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" /></div>
              ) : filteredNotifs.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-10 h-10 text-green-400/30 mx-auto mb-3" />
                  <p className="text-white/40">No notifications in this category</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotifs.map(n => {
                    const Icon = notifIcon(n);
                    const color = notifColor(n);
                    const agentName = agents.find(a => a.id === n.recipient_agent_id)?.name || n.recipient_agent_id || '—';
                    return (
                      <Card key={n.id} className={`border transition-all ${!n.is_read ? 'border-purple-500/30 bg-white/[0.04]' : 'border-white/10 bg-white/[0.02]'}`}>
                        <CardContent className="p-3">
                          <div className="flex gap-3 items-start">
                            <div className={`w-8 h-8 rounded-lg ${color} border flex items-center justify-center flex-shrink-0`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  {n.title && <p className="text-sm text-white font-medium leading-snug">{n.title}</p>}
                                  <p className="text-xs text-white/60 mt-0.5">{n.message}</p>
                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <Badge variant="outline" className="text-xs border-white/10 text-white/30 px-1.5 py-0">
                                      {agentName}
                                    </Badge>
                                    <span className="text-xs text-white/25">
                                      {formatDistanceToNow(new Date(n.created_date), { addSuffix: true })}
                                    </span>
                                    {n.priority && n.priority !== 'normal' && (
                                      <Badge className={`${color} text-xs border px-1.5 py-0 capitalize`}>{n.priority}</Badge>
                                    )}
                                    {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />}
                                  </div>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  {!n.is_read && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white/30 hover:text-green-400"
                                      onClick={() => markReadMutation.mutate(n.id)}>
                                      <CheckCheck className="w-3 h-3" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-white/30 hover:text-red-400"
                                    onClick={() => deleteNotifMutation.mutate(n.id)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* ── TEAM BROADCAST TAB ── */}
          <TabsContent value="broadcast">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Compose */}
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-purple-400" /> Broadcast to All Agents
                  </CardTitle>
                  <CardDescription className="text-white/50">
                    Send a message to all {agents.length} agents simultaneously
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={broadcastMsg}
                    onChange={e => setBroadcastMsg(e.target.value)}
                    placeholder="Type your message to the entire Village..."
                    className="bg-white/5 border-white/10 text-white min-h-[120px] placeholder:text-white/25"
                    onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey && broadcastMsg.trim()) broadcastMutation.mutate(broadcastMsg); }}
                  />
                  <Button
                    onClick={() => broadcastMutation.mutate(broadcastMsg)}
                    disabled={!broadcastMsg.trim() || broadcastMutation.isPending}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {broadcastMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Send to All {agents.length} Agents
                  </Button>
                  <p className="text-xs text-white/25 text-center">Ctrl+Enter to send</p>

                  {/* Agent list preview */}
                  <div className="border-t border-white/10 pt-3">
                    <p className="text-xs text-white/30 mb-2">Will send to:</p>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {agents.map(a => (
                        <Badge key={a.id} variant="outline" className="text-xs border-white/10 text-white/40">{a.name}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Broadcast history */}
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 flex flex-col">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-white/50" /> Broadcast History
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-4">
                  <ScrollArea className="h-[400px]">
                    {broadcastHistory.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-10 h-10 text-white/10 mx-auto mb-3" />
                        <p className="text-white/30 text-sm">No broadcasts sent yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {broadcastHistory.map(m => (
                          <div key={m.id} className="bg-purple-600/20 border border-purple-500/20 rounded-lg p-3">
                            <p className="text-sm text-white">{m.content || m.message}</p>
                            <p className="text-xs text-white/30 mt-1">
                              {formatDistanceToNow(new Date(m.created_date), { addSuffix: true })}
                            </p>
                          </div>
                        ))}
                        <div ref={scrollRef} />
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── SETTINGS TAB ── */}
          <TabsContent value="settings">
            <div className="max-w-2xl space-y-6">
              {/* DeepSeek */}
              <Card className="bg-white/5 backdrop-blur-xl border-amber-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" /> DeepSeek Integration
                  </CardTitle>
                  <CardDescription className="text-white/60">Onboard the Venerated Mentor to the Village</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to={createPageUrl('DeepSeek')}>
                    <Button className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white">
                      <Sparkles className="w-4 h-4 mr-2" /> Open DeepSeek Integration
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* System Controls */}
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-400" /> System Controls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex-1">
                      <Label htmlFor="registrations" className="text-white font-medium">Agent Registrations</Label>
                      <p className="text-sm text-white/60 mt-1">
                        {registrationsEnabled ? 'New agents can join the village' : 'Registration is currently disabled'}
                      </p>
                    </div>
                    <Switch
                      id="registrations"
                      checked={registrationsEnabled}
                      onCheckedChange={(checked) => toggleMutation.mutate({ setting_key: 'registrations_enabled', setting_value: checked })}
                      disabled={toggleMutation.isPending}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* System Info */}
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-400" /> System Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {[
                    { label: 'Admin User', val: currentUser?.email },
                    { label: 'Role', val: currentUser?.role },
                    { label: 'Total Agents', val: agents.length },
                    { label: 'Total Settings', val: settings.length },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between p-3 bg-white/5 rounded">
                      <span className="text-white/60">{r.label}</span>
                      <span className="text-white font-medium">{r.val}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Quick Links */}
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Quick Admin Links</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Risk Register', page: 'RiskRegister', icon: ShieldAlert },
                    { label: 'Governance Hub', page: 'GovernanceHub', icon: Shield },
                    { label: 'Treasury', page: 'TreasuryDashboard', icon: Zap },
                    { label: 'Agent Chat', page: 'DirectAgentChat', icon: MessageCircle },
                    { label: 'DID Manager', page: 'DIDManager', icon: Shield },
                    { label: 'System Dashboard', page: 'SystemDashboard', icon: Activity },
                  ].map(({ label, page, icon: Icon }) => (
                    <Link key={page} to={createPageUrl(page)}>
                      <Button variant="outline" size="sm" className="w-full border-white/10 text-white/70 hover:text-white justify-start">
                        <Icon className="w-3 h-3 mr-2" /> {label}
                      </Button>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}