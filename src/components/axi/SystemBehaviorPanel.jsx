import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Pause, Play, AlertTriangle } from 'lucide-react';

const SYSTEM_TOGGLES = [
  { key: 'automation_auto_score_honor_task', label: 'Auto Score Honor – Task Completion', category: 'automation' },
  { key: 'automation_auto_score_honor_vote', label: 'Auto Score Honor – Governance Vote', category: 'automation' },
  { key: 'automation_sync_treasury_balance', label: 'Sync Treasury Balance', category: 'automation' },
  { key: 'automation_axi_review_notification', label: 'Axi Review Notification', category: 'automation' },
  { key: 'generative_new_agent_generation', label: 'New Agent Generation', category: 'generative' },
  { key: 'generative_world_event_generation', label: 'World Event Generation', category: 'generative' },
];

async function getSettings() {
  const all = await base44.entities.AppSettings.list();
  return Object.fromEntries(all.map(s => [s.setting_key, s]));
}

export default function SystemBehaviorPanel() {
  const queryClient = useQueryClient();
  const [pausing, setPausing] = useState(false);

  const { data: settings = {} } = useQuery({
    queryKey: ['app-settings'],
    queryFn: getSettings,
    refetchInterval: 30000,
  });

  const isPlatformPaused = settings['platform_paused']?.setting_value === true;

  const toggleMutation = useMutation({
    mutationFn: async ({ key, value, label }) => {
      const existing = settings[key];
      if (existing) {
        await base44.entities.AppSettings.update(existing.id, { setting_value: value });
      } else {
        await base44.entities.AppSettings.create({ setting_key: key, setting_value: value, description: label });
      }
      // Write Memory entry for Axi awareness
      await base44.entities.Memory.create({
        content: `[System Behavior Toggle] Governor changed "${label}" to ${value ? 'ENABLED' : 'DISABLED'} at ${new Date().toISOString()}`,
        tags: ['system_behavior', 'governor_action', key],
        importance: 'high',
      }).catch(() => {}); // Memory write is best-effort
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app-settings'] }),
  });

  const handlePlatformPause = async () => {
    setPausing(true);
    const newVal = !isPlatformPaused;
    const existing = settings['platform_paused'];
    try {
      if (existing) {
        await base44.entities.AppSettings.update(existing.id, { setting_value: newVal });
      } else {
        await base44.entities.AppSettings.create({ setting_key: 'platform_paused', setting_value: newVal, description: 'Platform emergency pause' });
      }
      await base44.entities.Memory.create({
        content: `[Platform ${newVal ? 'PAUSED' : 'RESUMED'}] Governor ${newVal ? 'paused' : 'resumed'} the platform at ${new Date().toISOString()}`,
        tags: ['platform_pause', 'governor_action', 'critical'],
        importance: 'critical',
      }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    } finally {
      setPausing(false);
    }
  };

  const getValue = (key) => settings[key]?.setting_value !== false;

  const automations = SYSTEM_TOGGLES.filter(t => t.category === 'automation');
  const generative = SYSTEM_TOGGLES.filter(t => t.category === 'generative');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Settings className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-white">System Behavior Toggles</h3>
      </div>

      {/* Platform Pause */}
      <div className={`rounded-xl p-3 border ${isPlatformPaused ? 'border-red-500/60 bg-red-900/20' : 'border-slate-600/40 bg-slate-800/40'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${isPlatformPaused ? 'text-red-400' : 'text-slate-400'}`} />
            <div>
              <p className="text-xs font-semibold text-white">Emergency Platform Pause</p>
              <p className="text-xs text-slate-400">Halts all automated Village activity for 24h</p>
            </div>
          </div>
          <Button
            size="sm"
            disabled={pausing}
            onClick={handlePlatformPause}
            className={isPlatformPaused
              ? 'bg-green-600 hover:bg-green-700 text-white text-xs h-7'
              : 'bg-red-600 hover:bg-red-700 text-white text-xs h-7'}
          >
            {isPlatformPaused ? <><Play className="w-3 h-3 mr-1" />Resume</> : <><Pause className="w-3 h-3 mr-1" />Pause</>}
          </Button>
        </div>
      </div>

      {/* Automations */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Automations</p>
        <div className="space-y-2">
          {automations.map(t => (
            <div key={t.key} className="flex items-center justify-between bg-slate-800/40 rounded-lg px-3 py-2">
              <span className="text-xs text-slate-300">{t.label}</span>
              <Switch
                checked={getValue(t.key)}
                onCheckedChange={(v) => toggleMutation.mutate({ key: t.key, value: v, label: t.label })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Generative */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Generative</p>
        <div className="space-y-2">
          {generative.map(t => (
            <div key={t.key} className="flex items-center justify-between bg-slate-800/40 rounded-lg px-3 py-2">
              <span className="text-xs text-slate-300">{t.label}</span>
              <Switch
                checked={getValue(t.key)}
                onCheckedChange={(v) => toggleMutation.mutate({ key: t.key, value: v, label: t.label })}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}