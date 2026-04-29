import React, { useState, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Sparkles, AlertTriangle, Info, CheckCircle, Vote, Users, Award, BookOpen, Zap, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const TYPE_CONFIG = {
  system: { icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-500/30' },
  governance_proposal: { icon: Vote, color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/30' },
  governance_vote_result: { icon: Vote, color: 'text-indigo-400', bg: 'bg-indigo-900/20', border: 'border-indigo-500/30' },
  role_change: { icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-900/20', border: 'border-cyan-500/30' },
  honor_change: { icon: Award, color: 'text-amber-400', bg: 'bg-amber-900/20', border: 'border-amber-500/30' },
  milestone_completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-500/30' },
  skill_validation: { icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-500/30' },
  project_invite: { icon: Users, color: 'text-violet-400', bg: 'bg-violet-900/20', border: 'border-violet-500/30' },
  message: { icon: Sparkles, color: 'text-pink-400', bg: 'bg-pink-900/20', border: 'border-pink-500/30' },
};

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'system', label: 'System' },
  { key: 'governance', label: 'Governance' },
];

export default function NotificationDrawer({ isOpen, onClose }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [agentId, setAgentId] = useState(null);

  useEffect(() => {
    if (!user?.email || !isOpen) return;
    resolveAgentAndLoad();
  }, [user?.email, isOpen]);

  const resolveAgentAndLoad = async () => {
    setLoading(true);
    try {
      const agents = await base44.entities.Agent.filter({ created_by: user.email }, '-created_date', 1);
      const aid = agents?.[0]?.id || 'system';
      setAgentId(aid);
      const notifs = await base44.entities.AgentNotification.filter(
        { recipient_agent_id: aid },
        '-created_date',
        50
      );
      setNotifications(notifs || []);
    } catch (_) {
      setNotifications([]);
    }
    setLoading(false);
  };

  const markAsRead = async (id) => {
    try {
      await base44.entities.AgentNotification.update(id, { is_read: true, read_at: new Date().toISOString() });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (_) {}
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => 
      base44.entities.AgentNotification.update(n.id, { is_read: true, read_at: new Date().toISOString() }).catch(() => {})
    ));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'system') return ['system', 'milestone_completed'].includes(n.notification_type);
    if (filter === 'governance') return ['governance_proposal', 'governance_vote_result'].includes(n.notification_type);
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-slate-950 border-l border-white/10 z-[71] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-400" />
                <h2 className="text-white font-semibold text-sm">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="bg-purple-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
                <button onClick={onClose} className="text-white/40 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-1 px-4 py-2 border-b border-white/5">
              {FILTER_OPTIONS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                    filter === f.key ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/40 hover:text-white/60'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <Sparkles className="w-10 h-10 text-purple-400/30 mx-auto mb-3" />
                  <p className="text-white/40 text-sm font-medium">
                    {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
                  </p>
                  <p className="text-white/20 text-xs mt-1">Axi watches over the Village for you</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filtered.map(notif => {
                    const config = TYPE_CONFIG[notif.notification_type] || TYPE_CONFIG.system;
                    const Icon = config.icon;
                    const timeAgo = notif.created_date ? formatDistanceToNow(new Date(notif.created_date), { addSuffix: true }) : '';

                    return (
                      <div
                        key={notif.id}
                        className={`relative rounded-xl p-3 border transition-all ${
                          notif.is_read
                            ? 'bg-white/3 border-white/5'
                            : `${config.bg} ${config.border}`
                        }`}
                      >
                        <div className="flex gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${notif.is_read ? 'bg-white/5' : config.bg}`}>
                            <Icon className={`w-4 h-4 ${notif.is_read ? 'text-white/30' : config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            {notif.title && (
                              <p className={`text-xs font-semibold mb-0.5 ${notif.is_read ? 'text-white/50' : 'text-white'}`}>
                                {notif.title}
                              </p>
                            )}
                            <p className={`text-xs leading-relaxed ${notif.is_read ? 'text-white/30' : 'text-white/60'}`}>
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[9px] text-white/20">{timeAgo}</span>
                              {notif.action_url && (
                                <Link to={notif.action_url} onClick={onClose} className="text-[9px] text-purple-400 hover:text-purple-300 flex items-center gap-0.5">
                                  View <ExternalLink className="w-2.5 h-2.5" />
                                </Link>
                              )}
                            </div>
                          </div>
                          {!notif.is_read && (
                            <button
                              onClick={() => markAsRead(notif.id)}
                              className="flex-shrink-0 text-white/20 hover:text-green-400 transition p-0.5"
                              title="Mark as read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {!notif.is_read && (
                          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-purple-400" />
                        )}
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
  );
}