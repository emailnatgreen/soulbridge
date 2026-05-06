import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Clock, Rocket, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUS_STYLES = {
  not_started: { label: 'Not Started', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  in_progress: { label: 'In Progress', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  ready: { label: 'Ready', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  launched: { label: 'Launched', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
};

function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState({});
  useEffect(() => {
    if (!targetDate) return;
    const tick = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
}

function TimeBlock({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-2xl sm:text-3xl font-mono font-bold text-white bg-slate-800/60 rounded-lg px-3 py-2 min-w-[60px] border border-slate-700/50">
        {String(value ?? 0).padStart(2, '0')}
      </div>
      <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{label}</div>
    </div>
  );
}

export default function LaunchCountdown({ config }) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('not_started');
  const qc = useQueryClient();

  const timeLeft = useCountdown(config?.target_date);
  const currentStatus = config?.launch_status || 'not_started';
  const st = STATUS_STYLES[currentStatus];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = { target_date: date, launch_status: status };
      if (config?.id) {
        return base44.entities.PilotReadiness.update(config.id, data);
      }
      return base44.entities.PilotReadiness.create({ record_type: 'config', ...data });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pilot-readiness'] }); setEditing(false); },
  });

  const startEdit = () => {
    setDate(config?.target_date ? new Date(config.target_date).toISOString().slice(0, 16) : '');
    setStatus(currentStatus);
    setEditing(true);
  };

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-cyan-400" />
          <h3 className="text-white font-semibold">Launch Countdown</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${st.color} border text-xs`}>{st.label}</Badge>
          {!editing && (
            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-white" onClick={startEdit}>
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Target Date</label>
            <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_STYLES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-slate-400"><X className="w-4 h-4 mr-1" />Cancel</Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-700 text-white">
              <Check className="w-4 h-4 mr-1" />{saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      ) : config?.target_date ? (
        <div className="flex items-center justify-center gap-3">
          <TimeBlock value={timeLeft.days} label="Days" />
          <span className="text-slate-600 text-xl font-bold mt-[-16px]">:</span>
          <TimeBlock value={timeLeft.hours} label="Hours" />
          <span className="text-slate-600 text-xl font-bold mt-[-16px]">:</span>
          <TimeBlock value={timeLeft.minutes} label="Min" />
          <span className="text-slate-600 text-xl font-bold mt-[-16px]">:</span>
          <TimeBlock value={timeLeft.seconds} label="Sec" />
        </div>
      ) : (
        <div className="text-center py-4 text-slate-500 text-sm">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No target date set. Click edit to set the launch horizon.
        </div>
      )}
    </div>
  );
}