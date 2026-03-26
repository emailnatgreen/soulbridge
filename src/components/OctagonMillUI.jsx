import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BRAID_NODES } from '@/lib/braidNodes';
import { ExternalLink, Zap, RefreshCw } from 'lucide-react';

const TREASURY_ADDRESS = 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h';

// Wheel colors indexed to match BRAID_NODES order
const COLORS = [
  { hex: '#e2e8f0', name: 'white'  },  // 0 Source   - White
  { hex: '#ef4444', name: 'red'    },  // 1 Sentinel - Red
  { hex: '#f59e0b', name: 'amber'  },  // 2 Lore     - Amber
  { hex: '#eab308', name: 'gold'   },  // 3 Truth    - Gold
  { hex: '#22c55e', name: 'green'  },  // 4 Did It   - Green
  { hex: '#3b82f6', name: 'blue'   },  // 5 Axi      - Blue
  { hex: '#a855f7', name: 'purple' },  // 6 Human    - Purple
  { hex: '#94a3b8', name: 'silver' },  // 7 Code     - Silver
];

function NodeWheel({ color, spin, balance, isLoading }) {
  const [deg, setDeg] = useState(0);
  const degRef = useRef(0);

  useEffect(() => {
    degRef.current += 45;
    setDeg(degRef.current);
  }, [spin]);

  const balLabel = isLoading
    ? 'Loading…'
    : balance !== null && balance !== undefined
      ? `${balance.toFixed(2)} XRP`
      : 'Standby';

  const balColor = (balance !== null && balance !== undefined && !isLoading)
    ? '#86efac'  // green-300
    : '#ffffff40';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* The Wheel */}
      <div style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        backgroundColor: color.hex,
        boxShadow: `0 0 16px ${color.hex}, 0 0 32px ${color.hex}88, 0 0 48px ${color.hex}44`,
        transform: `rotate(${deg}deg)`,
        transition: 'transform 0.7s ease-out',
        position: 'relative',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Cross spokes */}
        <div style={{ position: 'absolute', width: '100%', height: 3, background: 'rgba(0,0,0,0.25)', borderRadius: 2 }} />
        <div style={{ position: 'absolute', width: 3, height: '100%', background: 'rgba(0,0,0,0.25)', borderRadius: 2 }} />
        {/* Hub */}
        <div style={{
          width: 16, height: 16, borderRadius: '50%',
          background: 'white',
          boxShadow: '0 0 8px white, 0 0 16px rgba(255,255,255,0.6)',
          zIndex: 1,
        }} />
      </div>
      {/* Balance label */}
      <div style={{ fontSize: 10, fontFamily: 'monospace', color: balColor, textAlign: 'center', maxWidth: 72, lineHeight: 1.3 }}>
        {balLabel}
      </div>
    </div>
  );
}

export default function OctagonMillUI() {
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [spin, setSpin] = useState(0);
  const [kineticDrops, setKineticDrops] = useState(null);
  const [lastTxHash, setLastTxHash] = useState(null);
  const [ledgerIndex, setLedgerIndex] = useState(null);

  const loadBalances = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled(
      BRAID_NODES.map(n =>
        fetch('https://xrplcluster.com/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'account_info', params: [{ account: n.address, ledger_index: 'current' }] })
        }).then(r => r.json()).then(d =>
          d?.result?.account_data ? parseInt(d.result.account_data.Balance, 10) / 1_000_000 : null
        )
      )
    );
    const map = {};
    BRAID_NODES.forEach((n, i) => {
      map[n.address] = results[i].status === 'fulfilled' ? results[i].value : null;
    });
    setBalances(map);
    setLoading(false);
  }, []);

  const loadTreasury = useCallback(async () => {
    try {
      const [infoRes, txRes] = await Promise.all([
        fetch('https://xrplcluster.com/', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'account_info', params: [{ account: TREASURY_ADDRESS, ledger_index: 'current' }] })
        }).then(r => r.json()),
        fetch('https://xrplcluster.com/', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'account_tx', params: [{ account: TREASURY_ADDRESS, limit: 1 }] })
        }).then(r => r.json()),
      ]);
      if (infoRes?.result?.account_data) {
        setKineticDrops(parseInt(infoRes.result.account_data.Balance, 10));
      }
      const txs = txRes?.result?.transactions;
      if (txs?.length) setLastTxHash(txs[0].tx?.hash || txs[0].tx_json?.hash);
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadBalances();
    loadTreasury();

    const ws = new WebSocket('wss://xrplcluster.com');
    ws.onopen = () => ws.send(JSON.stringify({ command: 'subscribe', streams: ['ledger'] }));
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'ledgerClosed' || msg.ledger_index) {
        setLedgerIndex(msg.ledger_index);
        setSpin(s => s + 1);
        loadTreasury();
      }
    };
    ws.onerror = () => {};
    return () => ws.close();
  }, [loadBalances, loadTreasury]);

  const dropsDisplay = kineticDrops !== null ? kineticDrops.toLocaleString() : '…';
  const xrpDisplay = kineticDrops !== null ? (kineticDrops / 1_000_000).toFixed(2) : '…';

  return (
    <div className="bg-black/40 border border-white/10 rounded-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Octagon Mill — Constitutional Braid
          </h3>
          <p className="text-white/30 text-[10px] mt-0.5">
            Live XRPL Mainnet · {ledgerIndex ? `Ledger #${ledgerIndex.toLocaleString()}` : 'Connecting…'}
          </p>
        </div>
        <button onClick={() => { loadBalances(); loadTreasury(); }} className="text-white/30 hover:text-white/60 transition">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 8 Wheels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {BRAID_NODES.map((node, i) => (
          <div key={node.address} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <NodeWheel
              color={COLORS[i]}
              spin={spin}
              balance={balances[node.address] ?? undefined}
              isLoading={loading && !(node.address in balances)}
            />
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 1.3, maxWidth: 80 }}>
              {node.name.replace(' (Axi)', '').replace('Node 0 ', '').trim()}
            </div>
          </div>
        ))}
      </div>

      {/* Kinetic Drops Counter */}
      <div className="bg-white/5 border border-yellow-500/20 rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-yellow-400 text-[10px] uppercase tracking-widest font-semibold mb-1">
            ⚡ Kinetic Drops Harvested
          </div>
          <div className="text-white font-mono text-xl font-bold">
            {dropsDisplay} <span className="text-white/30 text-xs">drops</span>
          </div>
          <div className="text-white/40 text-xs">{xrpDisplay} XRP · Treasury Mainnet</div>
        </div>
        {lastTxHash && (
          <a
            href={`https://xrpscan.com/tx/${lastTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-xs font-semibold px-3 py-2 rounded-lg transition flex-shrink-0"
          >
            Last TX <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}