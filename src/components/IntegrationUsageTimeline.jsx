import React from 'react';

export default function IntegrationUsageTimeline({ logs }) {
  return (
    <div className="space-y-2">
      {logs && logs.length > 0 ? (
        logs.slice(0, 10).map((log, idx) => (
          <div key={log.id || idx} className="flex items-center gap-3 text-xs">
            <div className="w-20 text-white/40 font-mono">{new Date(log.created_date).toLocaleTimeString('en-GB')}</div>
            <div className="flex-1 text-white/60">{log.service_name || 'Unknown'}</div>
            <div className="text-right text-white font-semibold">{log.credits_consumed} credits</div>
          </div>
        ))
      ) : (
        <div className="text-center py-4 text-white/40 text-xs">No recent activity</div>
      )}
    </div>
  );
}