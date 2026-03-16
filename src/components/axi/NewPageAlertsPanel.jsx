import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertCircle, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NewPageAlertsPanel() {
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['new-page-alerts'],
    queryFn: async () => {
      const notifs = await base44.asServiceRole.entities.AgentNotification.filter({
        recipient_agent_id: '6993271e7dc0fa2ab78762bf',
        notification_type: 'system'
      }, '-created_date', 20);
      return notifs.filter(n => n.metadata?.review_type === 'auto' && n.message?.includes('auto-review'));
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">New Page Reviews</h3>
        {unreadCount > 0 && (
          <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-amber-900/60 text-amber-300 font-medium">
            {unreadCount} new
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="text-xs text-slate-400 py-4 text-center">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="text-xs text-slate-500 py-4 text-center">No new page reviews yet</div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {notifications.map(notif => (
            <Link
              key={notif.id}
              to="/PageReviewMemoryPanel"
              className="p-3 rounded-lg bg-slate-700/40 border border-slate-600/40 hover:border-amber-500/40 hover:bg-slate-600/40 transition-all block text-xs"
            >
              <div className="flex items-start gap-2">
                {notif.is_read ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 font-medium truncate">{notif.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{notif.message}</p>
                  <div className="flex items-center gap-1 mt-1.5 text-slate-500">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{new Date(notif.created_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}