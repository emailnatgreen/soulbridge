import React, { useState, useEffect, useCallback } from 'react';
import { BRAID_NODES } from '@/lib/braidNodes';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

async function fetchXRPLBalance(address) {
  const res = await fetch('https://xrplcluster.com/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'account_info',
      params: [{ account: address, ledger_index: 'current' }]
    })
  });
  const data = await res.json();
  if (data?.result?.account_data) {
    const drops = parseInt(data.result.account_data.Balance, 10);
    return { balance: drops / 1_000_000, active: true };
  }
  return { balance: 0, active: false };
}

export default function ConstitutionalBraidLive({ compact = false }) {
  const [nodeData, setNodeData] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled(
      BRAID_NODES.map(node => fetchXRPLBalance(node.address))
    );
    const map = {};
    BRAID_NODES.forEach((node, i) => {
      map[node.address] = results[i].status === 'fulfilled'
        ? results[i].value
        : { balance: 0, active: false };
    });
    setNodeData(map);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadAll]);

  if (compact) {
    return (
      <Link to="/SovereignID?tab=constitutional" className="block">
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition"
          title="8-Node Constitutional Braid — click to view">
          <span className="text-white/40 text-[10px] uppercase tracking-widest mr-1 hidden sm:block">Braid</span>
          {BRAID_NODES.map(node => {
            const info = nodeData[node.address];
            // published nodes always show active; live fetch upgrades the tooltip with balance
            const isActive = info?.active || node.published;
            return (
              <span
                key={node.address}
                className={`w-2.5 h-2.5 rounded-full block ${node.dot} transition-opacity ${isActive ? 'opacity-90 animate-pulse' : 'opacity-30'}`}
                title={`${node.name}: ${info?.active ? `Active · ${info?.balance?.toFixed(1)} XRP` : node.published ? 'Published · DID Active' : loading ? 'Loading…' : 'Standby'}`}
              />
            );
          })}
          {loading && <RefreshCw className="w-3 h-3 text-white/30 animate-spin ml-1" />}
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-4 animate-[fadeIn_0.4s_ease-out]">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">8-Node Constitutional Braid — Live XRPL Status</h3>
        <button onClick={loadAll} disabled={loading}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {lastRefresh ? lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'Loading'}
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {BRAID_NODES.map(node => {
          const info = nodeData[node.address];
          const isActive = info?.active || node.published;
          return (
            <div key={node.address}
              className={`rounded-xl border p-3 space-y-1 transition-all duration-200 cursor-default
                ${isActive
                  ? 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10'}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${node.dot} ${isActive ? 'opacity-100 animate-pulse' : 'opacity-20'}`} />
                <span className="text-[11px] font-semibold text-white/80 truncate">{node.name}</span>
              </div>
              <div className="text-xs text-white/40 font-mono truncate">{node.address.slice(0, 8)}…</div>
              {loading ? (
                <div className="text-xs text-white/30">Querying…</div>
              ) : info?.active ? (
                <div className="text-xs text-green-400 font-semibold">{info.balance.toFixed(2)} XRP · Active</div>
              ) : node.published ? (
                <div className="text-xs text-blue-400 font-semibold">DID Published · Mainnet</div>
              ) : (
                <div className="text-xs text-amber-400 font-semibold">Standby</div>
              )}
            </div>
          );
        })}
      </div>
      {lastRefresh && (
        <p className="text-white/20 text-[10px] text-right">Live · XRPL Mainnet · Last refreshed {lastRefresh.toLocaleTimeString('en-GB')}</p>
      )}
    </div>
  );
}