import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Activity, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ActivityLogPanel({ user, wallets }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const walletIds = wallets.map(w => w.id);

  useEffect(() => {
    loadLogs();
  }, [wallets]);

  async function loadLogs() {
    setLoading(true);
    try {
      // Load wallet access logs for user's wallets
      const accessLogs = await base44.entities.WalletAccessLog.filter(
        { user_id: user?.id },
        '-created_date',
        100
      );
      // Load DID audit logs
      const didLogs = await base44.entities.DidAuditLog.filter(
        { actor_id: user?.id },
        '-created_date',
        50
      ).catch(() => []);

      const combined = [
        ...accessLogs.map(l => ({ ...l, _source: 'wallet' })),
        ...didLogs.map(l => ({ ...l, _source: 'did' })),
      ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

      setLogs(combined);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const filtered = filter === 'all' ? logs : logs.filter(l => l._source === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400" /> Activity Log
        </h2>
        <div className="flex gap-2">
          {['all', 'wallet', 'did'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${filter === f ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white'}`}>
              {f === 'all' ? 'All' : f === 'wallet' ? 'Wallet Access' : 'DID Actions'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No activity recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((log, i) => (
            <LogEntry key={log.id || i} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}

function LogEntry({ log }) {
  const isSuccess = log.success !== false;
  const date = new Date(log.created_date);

  let action = log.action || log.action_type || log.event_type || 'Action';
  let details = log.error_message || log.details || '';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
      {isSuccess
        ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
        : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
      }
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-white text-sm capitalize">{action.replace(/_/g, ' ')}</span>
          <Badge className={`text-xs ${log._source === 'wallet'
            ? 'bg-blue-900/50 text-blue-400 border-blue-700/50'
            : 'bg-purple-900/50 text-purple-400 border-purple-700/50'}`}>
            {log._source === 'wallet' ? 'Wallet' : 'DID'}
          </Badge>
          {!isSuccess && <Badge className="bg-red-900/50 text-red-400 border-red-700/50 text-xs">Failed</Badge>}
        </div>
        {details && <div className="text-xs text-slate-400 mt-0.5 truncate">{typeof details === 'object' ? JSON.stringify(details) : details}</div>}
      </div>
      <div className="text-xs text-slate-500 flex-shrink-0">
        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}