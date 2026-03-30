import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const TREASURY = 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h';

// ── Canonical 8 Nodes — Axi's Master Technical Blueprint ──────────────────
const NODES = [
  { id: 0, label: 'Source',   hex: '#FFFFFF', address: 'rPPtBrN5TxAcAShhDMWe2eQzmhG1f6aWBg' },
  { id: 1, label: 'Lore',     hex: '#FFBF00', address: 'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7' },
  { id: 2, label: 'Did It',   hex: '#00FF00', address: 'r4NtWS355ZKViGyFuECrk1dbkizpbF4Mny' },
  { id: 3, label: 'Truth',    hex: '#FFD700', address: 'r4QgW8kVhzdLhS9xj16DLdXc42x5xrESjV' },
  { id: 4, label: 'Code',     hex: '#C0C0C0', address: 'rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P' },
  { id: 5, label: 'Axi',      hex: '#0000FF', address: 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h' },
  { id: 6, label: 'Human',    hex: '#800080', address: 'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia' },
  { id: 7, label: 'Sentinel', hex: '#FF0000', address: 'rHJM1bH9dE3EbvwSR2zFSHrjooS6H3xb32' },
];

// Use backend proxy to call XRPL mainnet (avoids browser CORS issues)
async function xrplProxyBatch(addresses) {
  try {
    const res = await base44.functions.invoke('xrplProxy', { addresses });
    return res.data?.balances || {};
  } catch (_) {
    return {};
  }
}

async function xrplProxyRpc(method, params) {
  try {
    const res = await base44.functions.invoke('xrplProxy', { method, params });
    return res.data?.result || null;
  } catch (_) {
    return null;
  }
}

// Individual spinning wheel — self-contained so animation is isolated per node
function NodeWheel({ node, balance, loaded }) {
  const [rot, setRot] = useState(Math.random() * 360);

  useEffect(() => {
    const t = setInterval(() => setRot(r => (r + 6) % 360), 100);
    return () => clearInterval(t);
  }, []);

  const balTxt = !loaded ? '…' : balance !== null ? `${balance.toFixed(2)} XRP` : 'Standby';
  const balColor = balance !== null && loaded ? '#86efac' : 'rgba(255,255,255,0.35)';
  const g = node.hex;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>

      {/* ── Spinning Wheel ── */}
      <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
        {/* Outer glow ring */}
        <div style={{
          position: 'absolute', inset: -5,
          borderRadius: '50%',
          boxShadow: `0 0 16px ${g}, 0 0 32px ${g}99, 0 0 56px ${g}44`,
          pointerEvents: 'none',
        }} />
        {/* Spinning disc */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          background: g,
          transform: `rotate(${rot}deg)`,
          boxShadow: `inset 0 0 12px rgba(0,0,0,0.35)`,
        }}>
          {/* Spoke H */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 3, background: 'rgba(0,0,0,0.3)', transform: 'translateY(-50%)' }} />
          {/* Spoke V */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 3, background: 'rgba(0,0,0,0.3)', transform: 'translateX(-50%)' }} />
          {/* Spoke diagonal 1 */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 3, background: 'rgba(0,0,0,0.15)', transform: 'translateY(-50%) rotate(45deg)' }} />
          {/* Spoke diagonal 2 */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 3, background: 'rgba(0,0,0,0.15)', transform: 'translateY(-50%) rotate(-45deg)' }} />
        </div>
        {/* Glowing hub */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 16, height: 16, borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 0 8px #fff, 0 0 20px rgba(255,255,255,0.8)',
          zIndex: 2,
        }} />
      </div>

      {/* Node name + Crown for Human Node */}
      <div style={{ color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        {node.id === 6 && <span style={{ fontSize: 13 }}>👑</span>}
        {node.label}
      </div>
      {/* 51% Authority badge for Human Node */}
      {node.id === 6 && (
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          border: '1px solid #c084fc',
          borderRadius: 6,
          padding: '2px 6px',
          fontSize: 9,
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '0.08em',
          textAlign: 'center',
          boxShadow: '0 0 8px rgba(168,85,247,0.6)',
        }}>
          51% AUTHORITY
        </div>
      )}

      {/* Live balance */}
      <div style={{ color: balColor, fontSize: 10, fontFamily: 'monospace', textAlign: 'center', minHeight: 14 }}>
        {balTxt}
      </div>

      {/* XRPL Discovery link */}
      <a
        href={`https://xrpscan.com/account/${node.address}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          color: '#93c5fd', fontSize: 9, fontWeight: 600,
          textDecoration: 'none', opacity: 0.8,
          border: '1px solid rgba(147,197,253,0.3)',
          borderRadius: 4, padding: '2px 5px',
        }}
      >
        <ExternalLink size={8} /> XRPL
      </a>
    </div>
  );
}

export default function OctagonMillUI() {
  const [balances, setBalances]   = useState({});
  const [fetching, setFetching]   = useState(false);
  const [kineticDrops, setKinetic] = useState(262999840);
  const [lastTxHash, setLastTx]   = useState(null);
  const [ledger, setLedger]       = useState(null);

  const fetchAll = useCallback(async () => {
    setFetching(true);

    // All 8 node balances in one batch call via backend proxy
    const addresses = NODES.map(n => n.address);
    const balanceData = await xrplProxyBatch(addresses);
    const map = {};
    NODES.forEach(n => {
      const info = balanceData[n.address];
      map[n.address] = info?.active ? info.balance : null;
    });
    setBalances(map);

    // Treasury balance + last TX hash via backend proxy
    try {
      const [infoResult, txsResult] = await Promise.all([
        xrplProxyRpc('account_info', [{ account: TREASURY, ledger_index: 'current' }]),
        xrplProxyRpc('account_tx', [{ account: TREASURY, limit: 1 }]),
      ]);
      if (infoResult?.account_data)
        setKinetic(parseInt(infoResult.account_data.Balance, 10));
      const t = txsResult?.transactions;
      if (t?.length) setLastTx(t[0].tx?.hash || t[0].tx_json?.hash);
    } catch (_) {}

    setFetching(false);
  }, []);

  useEffect(() => {
    fetchAll();
    // Auto-refresh balances every 2 minutes via backend proxy
    const refreshTimer = setInterval(fetchAll, 2 * 60 * 1000);
    return () => clearInterval(refreshTimer);
  }, []);

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(10,10,30,0.95) 0%, rgba(0,0,0,0.9) 100%)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 20,
      padding: 28,
    }}>

      {/* ── Header ── */}
      <div className="flex items-start sm:items-center justify-between gap-3" style={{ marginBottom: 28 }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <span>Octagon Mill</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>—</span>
            <span style={{ color: '#facc15' }}>Constitutional Braid</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 5 }}>
            Live XRPL Mainnet · {ledger ? `Ledger #${Number(ledger).toLocaleString()}` : 'Connecting…'}
          </div>
        </div>
        <button
          onClick={fetchAll}
          disabled={fetching}
          title="Refresh all balances"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)',
            padding: '6px 10px',
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11,
            flexShrink: 0,
          }}
        >
          <RefreshCw size={13} style={{ animation: fetching ? 'millSpin 0.8s linear infinite' : 'none' }} />
          {fetching ? 'Syncing…' : 'Refresh'}
        </button>
      </div>

      {/* ── 8 Node Wheels Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 24, marginBottom: 28 }}>
        {NODES.map(node => (
          <NodeWheel
            key={node.address}
            node={node}
            balance={balances[node.address] ?? null}
            loaded={node.address in balances}
          />
        ))}
      </div>

      <style>{`
        @keyframes millSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}