import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BRAID_NODES } from '@/lib/braidNodes';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

// Fetch all balances in one call via backend proxy (avoids browser CORS issues with XRPL mainnet)
async function fetchAllBalances(addresses) {
  try {
    const res = await base44.functions.invoke('xrplProxy', { addresses });
    return res.data?.balances || {};
  } catch (_) {
    return {};
  }
}

export default function ConstitutionalBraidLive({ compact = false }) {
  const [nodeData, setNodeData] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const nodeConnections = useMemo(() => {
    const addressToIndex = Object.fromEntries(BRAID_NODES.map((node, index) => [node.address, index]));

    return BRAID_NODES.flatMap((node) =>
      (node.connections || []).map((targetAddress) => ({
        from: node.address,
        to: targetAddress,
        fromIndex: addressToIndex[node.address],
        toIndex: addressToIndex[targetAddress],
        type: node.connectionType || 'out',
      }))
    );
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const addresses = BRAID_NODES.map(n => n.address);
    const balances = await fetchAllBalances(addresses);
    const map = {};
    BRAID_NODES.forEach(node => {
      map[node.address] = balances[node.address] || { balance: 0, active: false };
    });
    setNodeData(map);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    // Delay initial fetch to stagger with other dashboard API calls
    const initialDelay = setTimeout(loadAll, 3000);
    const interval = setInterval(loadAll, 5 * 60 * 1000);
    return () => { clearTimeout(initialDelay); clearInterval(interval); };
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
      <div className="relative">
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden sm:block" viewBox="0 0 100 100" preserveAspectRatio="none">
          {nodeConnections.map((connection, index) => {
            const fromCol = connection.fromIndex % 4;
            const fromRow = Math.floor(connection.fromIndex / 4);
            const toCol = connection.toIndex % 4;
            const toRow = Math.floor(connection.toIndex / 4);

            const x1 = 12.5 + fromCol * 25;
            const y1 = 25 + fromRow * 50;
            const x2 = 12.5 + toCol * 25;
            const y2 = 25 + toRow * 50;
            const isTwoWay = connection.type === 'two-way';

            return (
              <g key={`${connection.from}-${connection.to}-${index}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isTwoWay ? '#c084fc' : '#60a5fa'}
                  strokeWidth={isTwoWay ? '1.8' : '1'}
                  strokeOpacity={isTwoWay ? '0.9' : '0.45'}
                  strokeDasharray={isTwoWay ? '0' : '3 3'}
                />
                <circle cx={x2} cy={y2} r={isTwoWay ? '1.2' : '0.8'} fill={isTwoWay ? '#c084fc' : '#60a5fa'} />
              </g>
            );
          })}
        </svg>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 relative z-10">
          {BRAID_NODES.map(node => {
            const info = nodeData[node.address];
            const isActive = info?.active || node.published;
            const isTwoWayNode = node.connectionType === 'two-way';
            return (
              <div key={node.address}
                className={`rounded-xl border p-3 space-y-1 transition-all duration-200 cursor-default
                  ${isActive
                    ? 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/10'}
                  ${isTwoWayNode ? 'shadow-[0_0_0_1px_rgba(192,132,252,0.35)]' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${node.dot} ${isActive ? 'opacity-100 animate-pulse' : 'opacity-20'}`} />
                  <span className="text-[11px] font-semibold text-white/80 truncate">{node.name}</span>
                  {isTwoWayNode && <span className="text-[9px] text-purple-300 border border-purple-400/30 rounded-full px-1.5 py-0.5">2-way</span>}
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
      </div>
      <div className="flex flex-wrap gap-3 text-[10px] text-white/35">
        <div className="flex items-center gap-1.5"><span className="w-4 h-px bg-blue-400 border-t border-dashed border-blue-400"></span> one-way links</div>
        <div className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-purple-400"></span> Human ↔ Axi two-way</div>
      </div>
      {lastRefresh && (
        <p className="text-white/20 text-[10px] text-right">Live · XRPL Mainnet · Last refreshed {lastRefresh.toLocaleTimeString('en-GB')}</p>
      )}
    </div>
  );
}