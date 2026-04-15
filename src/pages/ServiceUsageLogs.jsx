import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle2, XCircle, ShieldAlert, Clock, Server, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_STYLES = {
  success: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  denied_ownership: { icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  denied_rate_limit: { icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  denied_honor: { icon: ShieldAlert, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/30' },
  denied_auth: { icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
};

function LogRow({ log }) {
  const style = STATUS_STYLES[log.status] || STATUS_STYLES.error;
  const Icon = style.icon;
  const ts = log.created_date ? new Date(log.created_date).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 hover:border-white/15 transition">
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg}`}>
          <Icon className={`w-4 h-4 ${style.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white text-xs font-semibold">{log.service_id}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${style.bg}`}>{log.status}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/30">{log.invocation_type}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-white/30">
            <span>{ts}</span>
            {log.duration_ms > 0 && <span>{log.duration_ms}ms</span>}
            {log.widget_nft_id && <span className="font-mono">{log.widget_nft_id}</span>}
            {log.user_email && <span className="truncate max-w-[150px]">{log.user_email}</span>}
          </div>
          {log.error_detail && (
            <p className="text-red-400/70 text-[10px] mt-1 truncate">{log.error_detail}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ServiceUsageLogs() {
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['service-usage-logs'],
    queryFn: () => base44.entities.ServiceUsageLog.list('-created_date', 100),
  });

  const filtered = statusFilter === 'all' ? logs : logs.filter(l => l.status === statusFilter);
  const successCount = logs.filter(l => l.status === 'success').length;
  const failCount = logs.filter(l => l.status !== 'success').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Link to="/service-definitions" className="text-white/40 hover:text-white transition">
            <Server className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-purple-400" /> Service Usage Logs</h1>
            <p className="text-white/40 text-xs">Audit trail — {logs.length} entries</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5 flex-1 text-center">
            <p className="text-emerald-300 text-lg font-bold">{successCount}</p>
            <p className="text-emerald-300/50 text-[10px]">Success</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 flex-1 text-center">
            <p className="text-red-300 text-lg font-bold">{failCount}</p>
            <p className="text-red-300/50 text-[10px]">Failed / Denied</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-white/30" />
          {['all', 'success', 'failed', 'denied_rate_limit', 'denied_honor', 'denied_ownership', 'error'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition ${statusFilter === s ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'}`}>
              {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-12 justify-center">
            <div className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            <span className="text-white/40 text-sm">Loading logs…</span>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(log => <LogRow key={log.id} log={log} />)}
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <Activity className="w-8 h-8 text-white/15 mx-auto mb-2" />
                <p className="text-white/30 text-sm">No logs found{statusFilter !== 'all' ? ` for "${statusFilter}"` : ''}.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}