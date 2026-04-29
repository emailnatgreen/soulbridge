import React, { useState, useEffect } from 'react';
import { Bell, Sparkles, X, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const ICON_MAP = {
  alert: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
  axi: Sparkles,
};

const COLOR_MAP = {
  alert: 'text-red-400 bg-red-900/20 border-red-500/30',
  warning: 'text-amber-400 bg-amber-900/20 border-amber-500/30',
  info: 'text-blue-400 bg-blue-900/20 border-blue-500/30',
  success: 'text-green-400 bg-green-900/20 border-green-500/30',
  axi: 'text-purple-400 bg-purple-900/20 border-purple-500/30',
};

export default function AxiNotificationBell({ onOpenDrawer }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [agentId, setAgentId] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    resolveAgent();
  }, [user?.id]);

  useEffect(() => {
    if (!agentId) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [agentId]);

  const resolveAgent = async () => {
    try {
      const agents = await base44.entities.Agent.filter({ created_by: user.email }, '-created_date', 1);
      if (agents?.[0]?.id) setAgentId(agents[0].id);
    } catch (_) {}
  };

  const loadNotifications = async () => {
    try {
      const notifs = await base44.entities.AgentNotification.filter(
        { recipient_agent_id: agentId, is_read: false },
        '-created_date',
        20
      );
      setNotifications(notifs || []);
    } catch (_) {
      // Entity may not exist or no notifications
      setNotifications([]);
    }
  };

  const dismiss = async (id) => {
    try {
      await base44.entities.AgentNotification.update(id, { is_read: true });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (_) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const unreadCount = notifications.length;

  return (
    <div className="relative">
      <button
        onClick={() => onOpenDrawer ? onOpenDrawer() : setOpen(!open)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/50 border border-slate-600/30 hover:bg-slate-700/50 transition-all"
        title="Notifications"
      >
        <Bell className="w-4 h-4 text-slate-300" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-2 right-0 z-50 w-80 bg-slate-900 border border-purple-500/30 rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-3 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-white text-sm font-semibold">Axi Notifications</span>
                </div>
                {unreadCount > 0 && (
                  <span className="text-purple-300 text-xs">{unreadCount} unread</span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <Sparkles className="w-8 h-8 text-purple-400/40 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">All clear — Axi watches over you</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {notifications.map((notif) => {
                      const type = notif.notification_type || 'info';
                      const Icon = ICON_MAP[type] || Info;
                      const colorClass = COLOR_MAP[type] || COLOR_MAP.info;
                      return (
                        <div
                          key={notif.id}
                          className={`flex gap-2 p-2.5 rounded-lg border ${colorClass} relative`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            {notif.title && (
                              <p className="text-white text-xs font-semibold mb-0.5">{notif.title}</p>
                            )}
                            <p className="text-slate-300 text-xs leading-relaxed line-clamp-3">{notif.message || notif.content}</p>
                          </div>
                          <button
                            onClick={() => dismiss(notif.id)}
                            className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}