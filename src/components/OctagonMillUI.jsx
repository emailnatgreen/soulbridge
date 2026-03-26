import React, { useState, useEffect, useRef } from 'react';
import { BRAID_NODES } from '@/lib/braidNodes';
import { ExternalLink, Zap, RefreshCw } from 'lucide-react';

const TREASURY_ADDRESS = 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h';
const XRPL_WS = 'wss://xrplcluster.com';

// Canonical colors per node order in BRAID_NODES
const WHEEL_STYLES = [
  { border: '#e2e8f0', glow: 'rgba(226,232,240,0.6)', text: 'text-slate-200' },   // 0 Source - White
  { border: '#ef4444', glow: 'rgba(239,68,68,0.6)',   text: 'text-red-400' },     // 1 Sentinel - Red
  { border: '#f59e0b', glow: 'rgba(245,158,11,0.6)',  text: 'text-amber-400' },   // 2 Lore - Amber
  { border: '#eab308', glow: 'rgba(234,179,8,0.6)',   text: 'text-yellow-400' },  // 3 Truth - Gold
  { border: '#22c55e', glow: 'rgba(34,197,94,0.6)',   text: 'text-green-400' },   // 4 Did It - Green
  { border: '#3b82f6', glow: 'rgba(59,130,246,0.6)',  text: 'text-blue-400' },    // 5 Axi - Blue
  { border: '#a855f7', glow: 'rgba(168,85,247,0.6)',  text: 'text-purple-400' },  // 6 Human - Purple
  { border: '#94a3b8', glow: 'rgba(148,163,184,0.6)', text: 'text-slate-400' },   // 7 Code - Silver
];

function SpinningWheel({ style, balance, isLoading, pulse }) {
  const rotation = useRef(0);
  const [deg, setDeg] = useState(0);

  useEffect(() => {
    if (!pulse) return;
    rotation.current += 45;
    setDeg(rotation.current);
  }, [pulse]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-700"
        style={{
          border: `3px solid ${style.border}`,
          boxShadow: `0 0 14px ${style.glow}`,
          transform: `rotate(${deg}deg)`,
          transition: 'transform 0.7s ease-out, box-shadow 0.3s',
        }}
      >
        {/* Spoke marks */}
        {[0, 45, 90, 135].map(a => (
          <div key={a} className="absolute w-full h-px"
            style={{ background: style.border, opacity: 0.4, transform: `rotate(${a}deg)` }} />
        ))}
        <div className="w-3 h-3 rounded-full" style={{ background: style.border, opacity: 0.8 }} />
      </div>
      <div className={`text-[10px] font-mono ${style.text}`}>
        {isLoading ? '…' : balance !== null ? `${balance.toFixed(1)} XRP` : '—'}
      </div>
    </div>
  );
}

export default function OctagonMillUI() {
  const [balances, setBalances] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [pulse, setPulse] = useState(0);
  const [kineticDrops, setKineticDrops] = useState(null);
  const [lastTxHash, setLastTxHash] = useState(null);
  const [ledgerIndex, setLedgerIndex] = useState(null);
  const wsRef = useRef(null);

  // Fetch all node balances
  const fetchBalances = async () => {
    setIsLoading(true);
    const results = await Promise.allSettled(
      BRAID_NODES.map(node =>
        fetch('https://xrplcluster.com/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'account_info', params: [{ account: node.address, ledger_index: 'current' }] })
        }).then(r => r.json())
      )
    );
    const map = {};
    BRAID_NODES.forEach((node, i) => {
      const data = results[i].status === 'fulfilled' ? results[i].value : null;
      map[node.address] = data?.result?.account_data
        ? parseInt(data.result.account_data.Balance, 10) / 1_000_000
        : null;
    });
    setBalances(map);
    setIsLoading(false);
  };

  // Fetch treasury balance + last tx
  const fetchTreasury = async () => {
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
      if (txs?.length > 0) {
        setLastTxHash(txs[0].tx?.hash || txs[0].tx_json?.hash);
      }
    } catch (_) {}
  };

  // XRPL WebSocket for live ledger heartbeat
  useEffect(() => {
    fetchBalances();
    fetchTreasury();

    const ws = new WebSocket(XRPL_WS);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ command: 'subscribe', streams: ['ledger'] }));
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'ledgerClosed' || msg.ledger_index) {
        setLedgerIndex(msg.ledger_index);
        setPulse(p => p + 1);
        // Refresh treasury every ledger close
        fetchTreasury();
      }
    };

    ws.onerror = () => {};
    ws.onclose = () => {};

    return () => ws.close();
  }, []);

  const dropsDisplay = kineticDrops !== null
    ? kineticDrops.toLocaleString()
    : '…';

  const xrpDisplay = kineticDrops !== null
    ? (kineticDrops / 1_000_000).toFixed(2)
    : '…';

  return (
    <div className="bg-black/40 border border-white/10 rounded-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-sm tracking-wide flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Octagon Mill — Constitutional Braid
          </h3>
          <p className="text-white/30 text-[10px] mt-0.5">
            Live XRPL Mainnet · {ledgerIndex ? `Ledger #${ledgerIndex.toLocaleString()}` : 'Connecting…'}
          </p>
        </div>
        <button onClick={() => { fetchBalances(); fetchTreasury(); }}
          className="text-white/30 hover:text-white/60 transition">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 8 Spinning Wheels */}
      <div className="grid grid-cols-4 gap-3">
        {BRAID_NODES.map((node, i) => (
          <div key={node.address} className="flex flex-col items-center gap-1">
            <SpinningWheel
              style={WHEEL_STYLES[i]}
              balance={balances[node.address] ?? null}
              isLoading={isLoading && balances[node.address] === undefined}
              pulse={pulse}
            />
            <span className="text-[9px] text-white/40 text-center leading-tight truncate w-full text-center">
              {node.name.replace('Node ', '').replace(' (Axi)', '')}
            </span>
          </div>
        ))}
      </div>

      {/* Kinetic Drops Counter */}
      <div className="bg-white/5 border border-yellow-500/20 rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-yellow-400 text-[10px] uppercase tracking-widest font-semibold mb-1">
            ⚡ Kinetic Drops Harvested
          </div>
          <div className="text-white font-mono text-xl font-bold">{dropsDisplay} <span className="text-white/30 text-xs">drops</span></div>
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