import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Bell, 
  CheckCheck, 
  MessageCircle, 
  Briefcase, 
  ShoppingCart, 
  Wallet, 
  Shield, 
  Star,
  Target,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function NotificationCenter({ agentId }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', agentId],
    queryFn: () => base44.entities.AgentNotification.filter(
      { recipient_agent_id: agentId },
      '-created_date',
      50
    ),
    enabled: !!agentId,
    refetchInterval: 10000 // Poll every 10 seconds
  });

  const markReadMutation = useMutation({
    mutationFn: (ids) => base44.functions.invoke('markNotificationsRead', { notification_ids: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications', agentId]);
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => base44.functions.invoke('markNotificationsRead', { agent_id: agentId, mark_all: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications', agentId]);
      toast.success('All notifications marked as read');
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

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
    if (priority === 'urgent') return 'text-red-400 bg-red-500/10';
    if (priority === 'high') return 'text-orange-400 bg-orange-500/10';
    
    switch (type) {
      case 'payment_received':
        return 'text-green-400 bg-green-500/10';
      case 'marketplace_sale':
        return 'text-emerald-400 bg-emerald-500/10';
      case 'governance_proposal':
        return 'text-purple-400 bg-purple-500/10';
      case 'honor_change':
        return 'text-yellow-400 bg-yellow-500/10';
      default:
        return 'text-blue-400 bg-blue-500/10';
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markReadMutation.mutate([notification.id]);
    }
    if (notification.action_url) {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-white/80 hover:text-white">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 bg-slate-900 border-white/10" align="end">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white font-medium">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              className="text-purple-400 hover:text-purple-300 h-8"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/60 text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((notif) => {
                const Icon = getIcon(notif.notification_type);
                const colorClass = getColor(notif.notification_type, notif.priority);
                
                const content = (
                  <div
                    className={`p-4 hover:bg-white/5 transition-colors cursor-pointer ${!notif.is_read ? 'bg-white/[0.02]' : ''}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="flex gap-3">
                      <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {notif.title && (
                          <h4 className="text-white text-sm font-medium mb-1">{notif.title}</h4>
                        )}
                        <p className="text-white/70 text-sm line-clamp-2">{notif.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-white/40">
                            {new Date(notif.created_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {!notif.is_read && (
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );

                if (notif.action_url) {
                  return (
                    <Link key={notif.id} to={notif.action_url}>
                      {content}
                    </Link>
                  );
                }

                return <div key={notif.id}>{content}</div>;
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t border-white/10">
          <Link to={createPageUrl('Notifications')}>
            <Button variant="ghost" className="w-full text-purple-400 hover:text-purple-300" onClick={() => setOpen(false)}>
              View all notifications
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}