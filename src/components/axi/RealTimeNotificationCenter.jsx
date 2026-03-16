import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, Zap, X, Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const NOTIFICATION_CONFIG = {
  governance_proposal_passed: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-900/20',
    borderColor: 'border-green-700/40',
    category: 'GOVERNANCE'
  },
  governance_proposal_failed: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-900/20',
    borderColor: 'border-red-700/40',
    category: 'GOVERNANCE'
  },
  project_milestone_completed: {
    icon: CheckCircle,
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/20',
    borderColor: 'border-blue-700/40',
    category: 'PROJECTS'
  },
  project_blocked: {
    icon: AlertTriangle,
    color: 'text-orange-400',
    bgColor: 'bg-orange-900/20',
    borderColor: 'border-orange-700/40',
    category: 'PROJECTS'
  },
  agent_honor_change: {
    icon: Zap,
    color: 'text-violet-400',
    bgColor: 'bg-violet-900/20',
    borderColor: 'border-violet-700/40',
    category: 'AGENTS'
  },
  treasury_alert: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-900/20',
    borderColor: 'border-amber-700/40',
    category: 'TREASURY'
  },
  system_alert: {
    icon: AlertTriangle,
    color: 'text-red-500',
    bgColor: 'bg-red-900/30',
    borderColor: 'border-red-700/60',
    category: 'SYSTEM'
  }
};

export default function RealTimeNotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState(new Set());

  // Fetch urgent/high-priority notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['urgent-notifications'],
    queryFn: async () => {
      const allNotifications = await base44.asServiceRole.entities.AgentNotification.filter(
        { priority: { $in: ['urgent', 'high'] }, is_read: false },
        '-created_date',
        15
      );
      return allNotifications || [];
    },
    refetchInterval: 10000, // Poll every 10 seconds for urgent alerts
  });

  const { data: systemHealth = {} } = useQuery({
    queryKey: ['system-health-check'],
    queryFn: async () => {
      const automationLogs = await base44.asServiceRole.entities.AutomationLog.filter(
        { status: 'error' },
        '-run_at',
        5
      );
      return {
        hasErrors: automationLogs.length > 0,
        errorCount: automationLogs.length,
        latestError: automationLogs[0]
      };
    },
    refetchInterval: 30000,
  });

  // Filter out dismissed notifications
  const visibleNotifications = notifications.filter(n => !dismissedIds.has(n.id));

  const handleDismiss = (id) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };

  const handleMarkAsRead = async (id) => {
    await base44.asServiceRole.entities.AgentNotification.update(id, {
      is_read: true,
      read_at: new Date().toISOString()
    });
    handleDismiss(id);
  };

  const getNotificationConfig = (notification) => {
    const typeKey = notification.notification_type.toLowerCase();
    return NOTIFICATION_CONFIG[typeKey] || NOTIFICATION_CONFIG.system_alert;
  };

  const unreadCount = visibleNotifications.length + (systemHealth.hasErrors ? 1 : 0);

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-slate-300 hover:bg-slate-800 px-3 py-1.5"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute top-10 right-0 w-96 max-h-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col">
          {/* Header */}
          <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">Real-Time Alerts</h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1 space-y-2 p-3">
            {/* System Health Alert */}
            {systemHealth.hasErrors && (
              <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-red-300">SYSTEM ALERT</p>
                    <p className="text-xs text-red-200 mt-1">
                      {systemHealth.errorCount} automation(s) reported errors in the last check
                    </p>
                    {systemHealth.latestError && (
                      <p className="text-xs text-red-100 mt-1 opacity-75">{systemHealth.latestError.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Regular Notifications */}
            {visibleNotifications.length > 0 ? (
              visibleNotifications.map(notification => {
                const config = getNotificationConfig(notification);
                const Icon = config.icon;
                const timeSince = new Date(notification.created_date);
                const minutesAgo = Math.floor((Date.now() - timeSince.getTime()) / 60000);

                return (
                  <div
                    key={notification.id}
                    className={`${config.bgColor} border ${config.borderColor} rounded-lg p-3 group hover:opacity-90 transition`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className={`w-4 h-4 ${config.color} flex-shrink-0 mt-0.5`} />
                      <div className="flex-1">
                        <p className={`text-xs font-semibold ${config.color}`}>{config.category}</p>
                        <p className="text-xs text-slate-200 mt-1">{notification.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{notification.message}</p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {minutesAgo < 1 ? 'just now' : `${minutesAgo}m ago`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : !systemHealth.hasErrors ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No urgent alerts at this time
              </div>
            ) : null}
          </div>

          {/* Footer */}
          {visibleNotifications.length > 0 && (
            <div className="bg-slate-800 border-t border-slate-700 px-4 py-2 text-center">
              <button className="text-xs text-violet-400 hover:text-violet-300">
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}