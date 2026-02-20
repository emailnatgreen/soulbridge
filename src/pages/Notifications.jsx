import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  CheckCheck, 
  MessageCircle, 
  Target, 
  ShoppingCart, 
  Wallet, 
  Shield, 
  Star,
  TrendingUp,
  AlertCircle,
  ArrowLeft,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function Notifications() {
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const agentId = urlParams.get('agentId');

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', agentId, filter],
    queryFn: async () => {
      if (!agentId) return [];
      
      const query = { recipient_agent_id: agentId };
      if (filter === 'unread') {
        query.is_read = false;
      }
      
      return base44.entities.AgentNotification.filter(query, '-created_date', 100);
    },
    enabled: !!agentId
  });

  const markReadMutation = useMutation({
    mutationFn: (ids) => base44.functions.invoke('markNotificationsRead', { notification_ids: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      toast.success('Marked as read');
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => base44.functions.invoke('markNotificationsRead', { agent_id: agentId, mark_all: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      toast.success('All notifications marked as read');
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.AgentNotification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      toast.success('Notification deleted');
    }
  });

  const getIcon = (type) => {
    switch (type) {
      case 'message':
      case 'mention':
        return MessageCircle;
      case 'task_assigned':
      case 'project_invite':
      case 'project_update':
      case 'milestone_completed':
        return Target;
      case 'marketplace_purchase':
      case 'marketplace_sale':
        return ShoppingCart;
      case 'payment_received':
      case 'payment_sent':
        return Wallet;
      case 'governance_proposal':
      case 'governance_vote_result':
        return Shield;
      case 'skill_validation':
      case 'attestation_received':
        return Star;
      case 'honor_change':
      case 'role_change':
        return TrendingUp;
      default:
        return AlertCircle;
    }
  };

  const getColor = (type, priority) => {
    if (priority === 'urgent') return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (priority === 'high') return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    
    switch (type) {
      case 'payment_received':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'marketplace_sale':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'governance_proposal':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'honor_change':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6 text-purple-400" />
                <div>
                  <h1 className="text-2xl font-light text-white">Notifications</h1>
                  {unreadCount > 0 && (
                    <p className="text-sm text-purple-300/60">{unreadCount} unread</p>
                  )}
                </div>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                variant="outline"
                className="border-white/10 text-white"
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {!agentId ? (
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-xl text-white mb-2">Select an Agent</h3>
              <p className="text-white/60 mb-6">Choose an agent to view their notifications</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {agents.slice(0, 10).map(agent => (
                  <Link key={agent.id} to={createPageUrl('Notifications') + `?agentId=${agent.id}`}>
                    <Button variant="outline" className="border-white/10 text-white">
                      {agent.name}
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Tabs value={filter} onValueChange={setFilter} className="mb-6">
              <TabsList className="bg-white/5 border border-white/10">
                <TabsTrigger value="all" className="data-[state=active]:bg-purple-600">
                  All
                </TabsTrigger>
                <TabsTrigger value="unread" className="data-[state=active]:bg-purple-600">
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto" />
              </div>
            ) : notifications.length === 0 ? (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="text-center py-12">
                  <Bell className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/60">
                    {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => {
                  const Icon = getIcon(notif.notification_type);
                  const colorClass = getColor(notif.notification_type, notif.priority);
                  
                  const cardContent = (
                    <Card className={`bg-white/5 backdrop-blur-xl border ${!notif.is_read ? 'border-purple-500/30' : 'border-white/10'} hover:bg-white/[0.07] transition-all`}>
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className={`w-12 h-12 rounded-lg ${colorClass} border flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                {notif.title && (
                                  <h3 className="text-white font-medium mb-1">{notif.title}</h3>
                                )}
                                <p className="text-white/70 text-sm">{notif.message}</p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="text-xs text-white/40">
                                    {new Date(notif.created_date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                  {notif.priority !== 'normal' && (
                                    <Badge className={colorClass}>
                                      {notif.priority}
                                    </Badge>
                                  )}
                                  {!notif.is_read && (
                                    <Badge className="bg-purple-500/20 text-purple-300">
                                      New
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {!notif.is_read && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      markReadMutation.mutate([notif.id]);
                                    }}
                                    className="text-white/60 hover:text-white h-8 w-8"
                                  >
                                    <CheckCheck className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    deleteNotificationMutation.mutate(notif.id);
                                  }}
                                  className="text-white/60 hover:text-red-400 h-8 w-8"
                                >
                                  <Trash2 className="w-4 h-4" />
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
                      <Link key={notif.id} to={notif.action_url} onClick={() => {
                        if (!notif.is_read) markReadMutation.mutate([notif.id]);
                      }}>
                        {cardContent}
                      </Link>
                    );
                  }

                  return <div key={notif.id}>{cardContent}</div>;
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}