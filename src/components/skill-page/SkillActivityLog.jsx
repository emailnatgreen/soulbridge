import React from 'react';
import { Activity, CheckCircle2, AlertTriangle, Shield, Clock } from 'lucide-react';
import { format } from 'date-fns';

const EVENT_CONFIG = {
  chrome_skill_creator_harness: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Skill Created' },
  anomaly_detected: { icon: AlertTriangle, color: 'text-amber-400', label: 'Anomaly Detected' },
  sentinel_flag: { icon: Shield, color: 'text-blue-400', label: 'Shield Log' },
  default: { icon: Activity, color: 'text-slate-400', label: 'Event' },
};

export default function SkillActivityLog({ governanceLogs, tripwireEvents }) {
  const events = [];

  (governanceLogs || []).forEach(log => {
    events.push({
      id: log.id,
      type: log.action,
      label: EVENT_CONFIG[log.action]?.label || log.action,
      icon: EVENT_CONFIG[log.action]?.icon || EVENT_CONFIG.default.icon,
      color: EVENT_CONFIG[log.action]?.color || EVENT_CONFIG.default.color,
      detail: log.denial_reason || `Pipeline: ${log.metadata?.pipeline_result || '—'}`,
      timestamp: log.timestamp || log.created_date,
    });
  });

  (tripwireEvents || []).forEach(tw => {
    events.push({
      id: tw.id,
      type: tw.event_type,
      label: EVENT_CONFIG[tw.event_type]?.label || tw.event_type,
      icon: EVENT_CONFIG[tw.event_type]?.icon || EVENT_CONFIG.default.icon,
      color: EVENT_CONFIG[tw.event_type]?.color || EVENT_CONFIG.default.color,
      detail: tw.description,
      timestamp: tw.created_date,
    });
  });

  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
      <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-purple-400" />
        Activity Log
        <span className="text-[10px] text-slate-600 ml-auto">{events.length}</span>
      </h3>

      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700/50 flex items-center justify-center py-6">
          <span className="text-xs text-slate-600">No activity recorded yet</span>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
          {events.map((evt) => {
            const IconComp = evt.icon;
            return (
              <div key={evt.id} className="flex items-start gap-2.5 rounded-lg border border-slate-700/30 bg-slate-800/20 px-3 py-2.5">
                <IconComp className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${evt.color}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-300">{evt.label}</span>
                    <div className="flex items-center gap-1 text-[10px] text-slate-600 shrink-0">
                      <Clock className="w-2.5 h-2.5" />
                      {evt.timestamp ? format(new Date(evt.timestamp), 'MMM d, HH:mm') : '—'}
                    </div>
                  </div>
                  {evt.detail && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{evt.detail}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}