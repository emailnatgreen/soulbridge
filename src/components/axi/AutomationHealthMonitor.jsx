import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

const CRITICAL_AUTOMATIONS = ['processPageSignalToMemory', 'detectAnomalyComprehensive'];

export default function AutomationHealthMonitor() {
  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['automations-list'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('getAutomationStatus', {});
        const data = response.data || [];
        // Ensure we always return an array
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.error('Error fetching automations:', e);
        return [];
      }
    },
    refetchInterval: 45000,
  });

  const getHealthStatus = (automation) => {
    if (!automation.last_run_timestamp) return 'waiting';
    const lastRun = new Date(automation.last_run_timestamp);
    const now = new Date();
    const minutesSinceRun = (now - lastRun) / (1000 * 60);

    if (automation.status === 'failed') return 'failed';
    if (minutesSinceRun > 120) return 'stale';
    return 'healthy';
  };

  const statusConfig = {
    healthy: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-900/20', label: 'Healthy' },
    stale: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-900/20', label: 'Stale' },
    failed: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-900/20', label: 'Failed' },
    waiting: { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-900/20', label: 'Waiting' },
  };

  if (isLoading) {
    return <div className="text-slate-400 text-sm p-4">Loading automation health...</div>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white mb-4">Automation Health</h3>

      {automations.length === 0 ? (
        <div className="text-slate-400 text-xs p-4 bg-slate-800/30 rounded-lg">
          No automations found. Check that backend functions are enabled.
        </div>
      ) : (
        <div className="space-y-2">
          {automations.map((automation) => {
            const status = getHealthStatus(automation);
            const config = statusConfig[status];
            const Icon = config.icon;
            const isCritical = CRITICAL_AUTOMATIONS.includes(automation.function_name || automation.name);

            return (
              <div
                key={automation.id}
                className={`rounded-lg border p-3 transition-all ${
                  isCritical ? 'border-violet-600/50 bg-violet-900/20' : 'border-slate-700/50 bg-slate-800/30'
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${config.color} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white">
                      {automation.function_name || automation.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {automation.automation_type} • {automation.description || 'No description'}
                    </p>
                  </div>
                  <Badge className={`text-xs flex-shrink-0 ${config.bg} text-white border-0`}>
                    {config.label}
                  </Badge>
                </div>

                {automation.last_run_timestamp && (
                  <p className="text-xs text-slate-500 ml-6">
                    Last run: {new Date(automation.last_run_timestamp).toLocaleTimeString()}
                  </p>
                )}

                {isCritical && status !== 'healthy' && (
                  <div className="mt-2 p-2 bg-red-900/20 rounded border border-red-700/50 text-xs text-red-300">
                    ⚠️ Critical automation requires attention
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}