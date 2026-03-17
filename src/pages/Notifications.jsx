import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bell, CheckCheck, MessageCircle, Target, ShoppingCart, Wallet,
  Shield, Star, TrendingUp, AlertCircle, ArrowLeft, Trash2,
  Vote, Bot, Zap, Users, Calendar, AlertTriangle, XCircle,
  Activity, RefreshCw, Search, Filter, CheckCircle2, Loader2, Archive
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import FeedbackWidget from '../components/feedback/FeedbackWidget';

// ── Category definitions ─────────────────────────────────────
const CATEGORIES = [
  { id: 'all',        label: 'All',           icon: Bell },
  { id: 'unread',     label: 'Unread',        icon: AlertCircle },
  { id: 'errors',     label: 'Errors & Alerts',icon: AlertTriangle },
  { id: 'tasks',      label: 'Tasks & Projects',icon: Target },
  { id: 'votes',      label: 'Governance & Votes',icon: Vote },
  { id: 'messages',   label: 'Messages',      icon: MessageCircle },
  { id: 'axi',        label: 'Axi & Automations',icon: Bot },
  { id: 'payments',   label: 'Transactions',  icon: Wallet },
  { id: 'marketplace',label: 'Marketplace',   icon: ShoppingCart },
  { id: 'meetups',    label: 'Meetups',       icon: Calendar },
  { id: 'skills',     label: 'Skills & Honor',icon: Star },
  { id: 'system',     label: 'System',        icon: Zap },
];

const CATEGORY_TYPES = {
  errors:     ['system'], // will also match priority urgent/high
  tasks:      ['task_assigned','project_invite','project_update','milestone_completed'],
  votes:      ['governance_proposal','governance_vote_result'],
  messages:   ['message','mention'],
  axi:        ['system'], // filtered by title containing axi/automation/meetup
  payments:   ['payment_received','payment_sent'],
  marketplace:['marketplace_purchase','marketplace_sale'],
  meetups:    ['system'], // filtered by title containing meetup
  skills:     ['skill_validation','attestation_received','honor_change','role_change'],
  system:     ['system'],
};

function matchesCategory(notif, category) {
  if (category === 'all') return true;
  if (category === 'unread') return !notif.is_read;

  const type = notif.notification_type;
  const title = (notif.title || '').toLowerCase();
  const msg   = (notif.message || '').toLowerCase();

  if (category === 'errors') {
    return notif.priority === 'urgent' || notif.priority === 'high' ||
      title.includes('fail') || title.includes('error') || title.includes('alert') ||
      msg.includes('failed') || msg.includes('error') || msg.includes('blocked');
  }
  if (category === 'axi') {
    return title.includes('axi') || title.includes('auto') || title.includes('automation') ||
      msg.includes('axi') || msg.includes('auto-assign') || msg.includes('automation') ||
      (type === 'system' && !title.includes('meetup'));
  }
  if (category === 'meetups') {
    return title.includes('meetup') || title.includes('meeting') || title.includes('daily') ||
      msg.includes('meetup') || msg.includes('daily village');
  }
  if (category === 'system') {
    return type === 'system';
  }

  return (CATEGORY_TYPES[category] || []).includes(type);
}

// ── Icon & colour helpers ────────────────────────────────────
function getIcon(type, title = '', priority = '') {
  const t = (title || '').toLowerCase();
  if (priority === 'urgent' || t.includes('fail') || t.includes('error')) return AlertTriangle;
  if (t.includes('axi') || t.includes('auto')) return Bot;
  if (t.includes('meetup') || t.includes('meeting')) return Calendar;
  switch (type) {
    case 'message': case 'mention':                       return MessageCircle;
    case 'task_assigned': case 'project_invite':
    case 'project_update': case 'milestone_completed':    return Target;
    case 'marketplace_purchase': case 'marketplace_sale': return ShoppingCart;
    case 'payment_received': case 'payment_sent':        return Wallet;
    case 'governance_proposal': case 'governance_vote_result': return Vote;
    case 'skill_validation': case 'attestation_received': return Star;
    case 'honor_change': case 'role_change':              return TrendingUp;
    case 'system':                                        return Zap;
    default:                                              return AlertCircle;
  }
}

function getColor(type, priority, title = '') {
  const t = (title || '').toLowerCase();
  if (priority === 'urgent' || t.includes('fail') || t.includes('error'))
    return 'text-red-400 bg-red-500/10 border-red-500/30';
  if (priority === 'high' || t.includes('block') || t.includes('alert'))
    return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
  if (t.includes('axi') || t.includes('auto'))
    return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
  if (t.includes('meetup'))
    return 'text-teal-400 bg-teal-500/10 border-teal-500/30';
  switch (type) {
    case 'payment_received':       return 'text-green-400 bg-green-500/10 border-green-500/30';
    case 'payment_sent':           return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    case 'marketplace_sale':       return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    case 'marketplace_purchase':   return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
    case 'governance_proposal':
    case 'governance_vote_result': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
    case 'honor_change':           return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    case 'task_assigned':
    case 'project_invite':
    case 'project_update':         return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30';
    case 'milestone_completed':    return 'text-green-300 bg-green-500/10 border-green-500/30';
    case 'skill_validation':
    case 'attestation_received':   return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    case 'system':                 return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    default:                       return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
  }
}

// ── NotificationRow ──────────────────────────────────────────
function NotificationRow({ notif, onMarkRead, onDelete, onArchive }) {
  const Icon = getIcon(notif.notification_type, notif.title, notif.priority);
  const colorClass = getColor(notif.notification_type, notif.priority, notif.title);
  const isError = notif.priority === 'urgent' || notif.priority === 'high' ||
    (notif.title || '').toLowerCase().includes('fail') ||
    (notif.title || '').toLowerCase().includes('error');

  const inner = (
    <Card className={`border transition-all ${!notif.is_read ? 'border-purple-500/30 bg-white/[0.04]' : 'border-white/10 bg-white/[0.02]'} hover:bg-white/[0.07]`}>
      <CardContent className="p-4">
        <div className="flex gap-4 items-start">
          <div className={`w-10 h-10 rounded-lg ${colorClass} border flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {notif.title && (
                  <h3 className={`font-medium mb-0.5 text-sm leading-snug ${isError ? 'text-red-300' : 'text-white'}`}>
                    {notif.title}
                  </h3>
                )}
                <p className="text-white/60 text-sm leading-relaxed">{notif.message}</p>
                {notif.metadata && Object.keys(notif.metadata).length > 0 && (
                  <div className="mt-2 text-xs text-white/30 bg-white/5 rounded px-2 py-1 font-mono truncate">
                    {Object.entries(notif.metadata).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                  </div>
                )}
                <div className="flex items-center flex-wrap gap-2 mt-2">
                  <span className="text-xs text-white/30">
                    {formatDistanceToNow(new Date(notif.created_date), { addSuffix: true })}
                  </span>
                  <Badge variant="outline" className="text-xs border-white/10 text-white/30 capitalize px-1.5 py-0">
                    {notif.notification_type?.replace(/_/g, ' ')}
                  </Badge>
                  {notif.priority && notif.priority !== 'normal' && (
                    <Badge className={`${colorClass} text-xs border px-1.5 py-0 capitalize`}>
                      {notif.priority}
                    </Badge>
                  )}
                  {!notif.is_read && (
                    <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {!notif.is_read && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-green-400" title="Mark as read"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); onMarkRead(notif.id); }}>
                    <CheckCheck className="w-3.5 h-3.5" />
                  </Button>
                )}
                {!notif.is_archived && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-yellow-400" title="Archive"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); onArchive(notif.id); }}>
                    <Archive className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-red-400" title="Delete"
                  onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(notif.id); }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (notif.action_url) {
    return (
      <Link key={notif.id} to={notif.action_url} onClick={() => { if (!notif.is_read) onMarkRead(notif.id); }}>
        {inner}
      </Link>
    );
  }
  return <div key={notif.id}>{inner}</div>;
}

// ── Main Page ────────────────────────────────────────────────
export default function Notifications() {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const agentId = urlParams.get('agentId');

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-notif'],
    queryFn: () => base44.entities.Agent.list('-updated_date', 50),
  });

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications-all', agentId],
    queryFn: () => base44.entities.AgentNotification.filter(
      { recipient_agent_id: agentId },
      '-created_date',
      200
    ),
    enabled: !!agentId,
    refetchInterval: 15000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!agentId) return;
    const unsub = base44.entities.AgentNotification.subscribe((event) => {
      if (event.type === 'create' && event.data?.recipient_agent_id === agentId) {
        queryClient.invalidateQueries({ queryKey: ['notifications-all', agentId] });
      }
    });
    return unsub;
  }, [agentId, queryClient]);

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.AgentNotification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications-all', agentId] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => Promise.all(
      notifications.filter(n => !n.is_read).map(n => base44.entities.AgentNotification.update(n.id, { is_read: true }))
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-all', agentId] });
      toast.success('All notifications marked as read');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => base44.entities.AgentNotification.update(id, { is_archived: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications-all', agentId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AgentNotification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications-all', agentId] }),
  });

  const deleteAllReadMutation = useMutation({
    mutationFn: () => Promise.all(
      notifications.filter(n => n.is_read).map(n => base44.entities.AgentNotification.delete(n.id))
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-all', agentId] });
      toast.success('Cleared read notifications');
    },
  });

  const filtered = notifications
    .filter(n => !n.is_archived)
    .filter(n => matchesCategory(n, category))
    .filter(n => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (n.title || '').toLowerCase().includes(q) || (n.message || '').toLowerCase().includes(q);
    });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const errorCount  = notifications.filter(n => matchesCategory(n, 'errors')).length;

  // Category counts
  const catCount = (id) => notifications.filter(n => matchesCategory(n, id)).length;

  const selectedAgent = agents.find(a => a.id === agentId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/40 to-slate-950 text-white">

      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-purple-400" />
              <div>
                <h1 className="text-lg font-semibold text-white leading-none">
                  Notifications {selectedAgent && <span className="text-white/40 font-normal text-sm ml-1">— {selectedAgent.name}</span>}
                </h1>
                <div className="flex items-center gap-3 mt-0.5">
                  {unreadCount > 0 && <span className="text-xs text-purple-300/70">{unreadCount} unread</span>}
                  {errorCount > 0 && <span className="text-xs text-red-400">{errorCount} errors/alerts</span>}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            {notifications.filter(n => n.is_read).length > 0 && (
              <Button variant="ghost" size="sm" className="text-white/40 hover:text-red-400 text-xs h-8"
                onClick={() => deleteAllReadMutation.mutate()} disabled={deleteAllReadMutation.isPending}>
                Clear read
              </Button>
            )}
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" className="border-white/15 text-white/70 hover:text-white text-xs h-8"
                onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
                {markAllReadMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCheck className="w-3 h-3 mr-1" />}
                Mark all read
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">

        {/* Agent selector */}
        <FeedbackWidget pageName="Notifications" />

      {!agentId ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="text-center py-12">
              <Bell className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl text-white mb-2">Select an Agent</h3>
              <p className="text-white/40 mb-6">Choose an agent to view their full notification feed</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {agents.slice(0, 12).map(a => (
                  <Link key={a.id} to={createPageUrl('Notifications') + `?agentId=${a.id}`}>
                    <Button variant="outline" size="sm" className="border-white/15 text-white/70 hover:text-white">
                      {a.name}
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-6">

            {/* Sidebar: categories */}
            <div className="w-52 shrink-0 space-y-1 hidden md:block">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const count = catCount(cat.id);
                const isActive = category === cat.id;
                return (
                  <button key={cat.id} onClick={() => setCategory(cat.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left
                      ${isActive ? 'bg-purple-600/30 text-white border border-purple-500/30' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 shrink-0 ${cat.id === 'errors' ? 'text-red-400' : cat.id === 'axi' ? 'text-cyan-400' : ''}`} />
                      <span className="truncate">{cat.label}</span>
                    </div>
                    {count > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                        cat.id === 'errors' ? 'bg-red-500/20 text-red-300' :
                        cat.id === 'unread' ? 'bg-purple-500/30 text-purple-200' :
                        'bg-white/10 text-white/50'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Agent switcher */}
              <div className="pt-4 border-t border-white/10 mt-4 space-y-1">
                <div className="text-xs text-white/20 px-3 mb-2 uppercase tracking-wider">Switch Agent</div>
                {agents.slice(0, 8).map(a => (
                  <Link key={a.id} to={createPageUrl('Notifications') + `?agentId=${a.id}`}>
                    <button className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors truncate
                      ${a.id === agentId ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                      {a.name}
                    </button>
                  </Link>
                ))}
              </div>
            </div>

            {/* Main feed */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* Mobile category pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
                {CATEGORIES.slice(0, 6).map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button key={cat.id} onClick={() => setCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs shrink-0 transition-colors
                        ${category === cat.id ? 'bg-purple-600 border-purple-500 text-white' : 'border-white/15 text-white/50 hover:text-white'}`}>
                      <Icon className="w-3 h-3" />
                      {cat.label}
                      {catCount(cat.id) > 0 && <span className="ml-1 text-white/50">({catCount(cat.id)})</span>}
                    </button>
                  );
                })}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search notifications…"
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-purple-500"
                />
              </div>

              {/* Stats strip */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Total',    val: notifications.length,  color: 'text-white' },
                  { label: 'Unread',   val: unreadCount,           color: 'text-purple-300' },
                  { label: 'Errors',   val: errorCount,            color: 'text-red-300' },
                  { label: 'Tasks',    val: catCount('tasks'),     color: 'text-indigo-300' },
                ].map(s => (
                  <div key={s.label} className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
                    <div className="text-xs text-white/30 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Notification list */}
              {isLoading ? (
                <div className="text-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
                </div>
              ) : filtered.length === 0 ? (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="text-center py-16">
                    <CheckCircle2 className="w-12 h-12 text-green-400/30 mx-auto mb-3" />
                    <p className="text-white/40">
                      {search ? 'No notifications match your search' : `No ${category === 'all' ? '' : category + ' '}notifications`}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-white/25 px-1">{filtered.length} notification{filtered.length !== 1 ? 's' : ''}</div>
                  {filtered.map(notif => (
                    <NotificationRow
                      key={notif.id}
                      notif={notif}
                      onMarkRead={id => markReadMutation.mutate(id)}
                      onArchive={id => archiveMutation.mutate(id)}
                      onDelete={id => deleteMutation.mutate(id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}