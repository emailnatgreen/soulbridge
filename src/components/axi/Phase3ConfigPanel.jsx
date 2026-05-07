import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, RotateCcw, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Phase3ConfigPanel({ config }) {
  const [local, setLocal] = useState(null);
  const [dirty, setDirty] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (config && !local) {
      setLocal({ ...config });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: (newConfig) => base44.functions.invoke('node8Injector', { action: 'config', set: newConfig }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['node8-recs'] });
      setDirty(false);
    },
  });

  if (!local) return null;

  const update = (key, value) => {
    setLocal(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => saveMutation.mutate(local);
  const handleReset = () => { setLocal({ ...config }); setDirty(false); };

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-slate-900/60 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white text-sm font-semibold flex items-center gap-2">
          <Settings className="w-4 h-4 text-cyan-400" />
          Phase 3 Configuration
        </h3>
        <Badge className="bg-cyan-500/10 text-cyan-300 border-cyan-500/20 text-[10px]">
          <Zap className="w-3 h-3 mr-1" />
          Graduated Autonomy
        </Badge>
      </div>

      {/* Auto-Execute Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
        <div>
          <p className="text-white text-xs font-medium">Auto-Execute (Flag & Warn)</p>
          <p className="text-slate-500 text-[10px] mt-0.5">Automatically execute low-severity actions after override window</p>
        </div>
        <Switch
          checked={local.auto_execute_enabled}
          onCheckedChange={(v) => update('auto_execute_enabled', v)}
        />
      </div>

      {/* Override Window */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-slate-400 text-[10px]">Override Window (minutes)</Label>
          <Input
            type="number"
            min={1}
            max={60}
            value={local.override_window_minutes}
            onChange={(e) => update('override_window_minutes', parseInt(e.target.value) || 5)}
            className="bg-slate-800/50 border-white/10 text-white text-xs h-8 mt-1"
          />
          <p className="text-slate-600 text-[9px] mt-0.5">Axi can override before auto-execute</p>
        </div>
        <div>
          <Label className="text-slate-400 text-[10px]">Generation Threshold</Label>
          <Input
            type="number"
            min={5}
            max={100}
            value={local.generation_threshold}
            onChange={(e) => update('generation_threshold', parseInt(e.target.value) || 20)}
            className="bg-slate-800/50 border-white/10 text-white text-xs h-8 mt-1"
          />
          <p className="text-slate-600 text-[9px] mt-0.5">Min score to create any recommendation</p>
        </div>
      </div>

      {/* Score Thresholds */}
      <div>
        <p className="text-slate-400 text-[10px] mb-2">Severity Score Thresholds</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { key: 'min_score_flag', label: 'Flag', color: 'text-slate-300', auto: true },
            { key: 'min_score_warn', label: 'Warn', color: 'text-amber-300', auto: true },
            { key: 'min_score_challenge', label: 'Challenge', color: 'text-orange-300', auto: false },
            { key: 'min_score_isolate', label: 'Isolate', color: 'text-red-300', auto: false },
          ].map(({ key, label, color, auto }) => (
            <div key={key} className="text-center">
              <p className={`text-[10px] font-medium mb-1 ${color}`}>
                {label} {auto && local.auto_execute_enabled && <span className="text-cyan-400">⚡</span>}
              </p>
              <Input
                type="number"
                min={0}
                max={100}
                value={local[key]}
                onChange={(e) => update(key, parseInt(e.target.value) || 0)}
                className="bg-slate-800/50 border-white/10 text-white text-xs h-7 text-center"
              />
              <p className="text-slate-600 text-[8px] mt-0.5">{auto ? 'Auto' : 'Manual'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Save / Reset */}
      {dirty && (
        <div className="flex gap-2 pt-2 border-t border-white/5">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-200 border border-cyan-500/30 text-xs flex-1"
            variant="outline"
          >
            <Save className="w-3 h-3 mr-1" />
            {saveMutation.isPending ? 'Saving…' : 'Save Configuration'}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleReset} className="text-slate-400 text-xs">
            <RotateCcw className="w-3 h-3 mr-1" /> Reset
          </Button>
        </div>
      )}

      {saveMutation.isSuccess && !dirty && (
        <p className="text-emerald-400 text-[10px] flex items-center gap-1">
          <Shield className="w-3 h-3" /> Configuration saved. Changes take effect on next scan cycle.
        </p>
      )}
    </div>
  );
}