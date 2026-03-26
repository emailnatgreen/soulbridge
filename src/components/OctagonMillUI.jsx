import React, { useState, useEffect, useRef } from 'react';
import { BRAID_NODES } from '@/lib/braidNodes';
import { ExternalLink, Zap, RefreshCw } from 'lucide-react';

const TREASURY_ADDRESS = 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h';
const XRPL_WS = 'wss://xrplcluster.com';

// Indexed to match BRAID_NODES order exactly
const WHEEL_COLORS = [
  { bg: '#e2e8f0', glow: '226,232,240' },  // 0 Source      - White
  { bg: '#ef4444', glow: '239,68,68'   },  // 1 Sentinel    - Red
  { bg: '#f59e0b', glow: '245,158,11'  },  // 2 Lore        - Amber
  { bg: '#eab308', glow: '234,179,8'   },  // 3 Truth       - Gold
  { bg: '#22c55e', glow: '34,197,94'   },  // 4 Did It      - Green
  { bg: '#3b82f6', glow: '59,130,246'  },  // 5 Axi         - Blue
  { bg: '#a855f7', glow: '168,85,247'  },  // 6 Human       - Purple
  { bg: '#94a3b8', glow: '148,163,184' },  // 7 Code        - Silver
];

async function fetchBalance(address) {
  const res = await fetch('https://xrplcluster.com/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'account_info', params: [{ account: address, ledger_index: 'current' }] })
  });
  const data = await res.json();
  if (data?.result?.account_data) {
    return parseInt(data.result.account_data.Balance, 10) / 1_000_000;
  }
  return null;
}

function Wheel({ color, spin }) {
  const degRef = useRef(0);
  const [deg, setDeg] = useState(0);

  useEffect(() => {
    degRef.current += 45;
    setDeg(degRef.current);
  }, [spin]);

  return (
    <div
      style={{
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: color.bg,
        boxShadow: `0 0 20px rgba(${color.glow},0.8), 0 0 40px rgba(${color.glow},0.4), 0 0 4px rgba(${color.glow},0.9)`,
        transform: `rotate(${deg}deg)`,
        transition: 'transform 0.7s ease-out',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {[0, 45, 90, 135].map(a => (
        <div key={a} style={{
          position: 'absolute', width: '100%', height: 2,
          background: 'rgba(0,0,0,0.2)', transform: `rotate(${a}deg)`
        }} />
      ))}
      <div style={{
        width: 14, height: 14, borderRadius: '50%',
        background: 'rgba(255,255,255,0.9)',
        boxShadow: '0 0 8px white',
        zIndex: 1,
      }} />
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

  const loadBalances = async () => {
    setLoading(true);
    const results = await Promise.allSettled(BRAID_NODES.map(n => fetchBalance(n.address)));
    const map = {};
    BRAID_NODES.forEach((n, i) => {
      map[n.address] = results[i].status === 'fulfilled' ? results[i].value : null;
    });
    setBalances(map);
    setLoading(false);
  };

  const loadTreasury = async () => {
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
  };

  useEffect(() => {
    loadBalances();
    loadTreasury();

    const ws = new WebSocket(XRPL_WS);
    ws.onopen = () => ws.send(JSON.stringify({ command: 'subscribe', streams: ['ledger'] }));
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'ledgerClosed' || msg.ledger_index) {
        setLedgerIndex(msg.ledger_index);
        setSpin(s => s + 1);
        loadTreasury();
      }
    };
    return () => ws.close();
  }, []);

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

      {/* 8 Wheels Grid */}
      <div className="grid grid-cols-4 gap-4">
        {BRAID_NODES.map((node, i) => {
          const bal = balances[node.address];
          const balLabel = loading && bal === undefined
            ? 'Loading…'
            : bal !== null && bal !== undefined
              ? `${bal.toFixed(2)} XRP`
              : 'Standby';
          return (
            <div key={node.address} className="flex flex-col items-center gap-2">
              <Wheel color={WHEEL_COLORS[i]} spin={spin} />
              <div className="text-[9px] text-white/50 text-center leading-tight truncate w-full px-1">
                {node.name.replace(' (Axi)', '').replace('Node ', '').replace('Node', '').trim()}
              </div>
              <div className={`text-[10px] font-mono text-center font-semibold ${
                bal !== null && bal !== undefined ? 'text-white/80' : 'text-white/30'
              }`}>
                {balLabel}
              </div>
            </div>
          );
        })}
      </div>

      {/* Kinetic Drops */}
      <div className="bg-white/5 border border-yellow-500/20 rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-yellow-400 text-[10px] uppercase tracking-widest font-semibold mb-1">⚡ Kinetic Drops Harvested</div>
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