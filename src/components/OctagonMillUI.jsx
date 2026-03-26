import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';

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

async function xrplFetch(body) {
  const r = await fetch('https://xrplcluster.com/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>

      {/* ── Spinning Wheel ── */}
      <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
        {/* Outer glow ring */}
        <div style={{
          position: 'absolute', inset: -6,
          borderRadius: '50%',
          boxShadow: `0 0 20px ${g}, 0 0 40px ${g}99, 0 0 70px ${g}44`,
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
          <div style={{
            position: 'absolute', left: 0, right: 0, top: '50%',
            height: 4, background: 'rgba(0,0,0,0.3)',
            transform: 'translateY(-50%)',
          }} />
          {/* Spoke V */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: '50%',
            width: 4, background: 'rgba(0,0,0,0.3)',
            transform: 'translateX(-50%)',
          }} />
          {/* Spoke diagonal 1 */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: '50%',
            height: 4, background: 'rgba(0,0,0,0.15)',
            transform: 'translateY(-50%) rotate(45deg)',
          }} />
          {/* Spoke diagonal 2 */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: '50%',
            height: 4, background: 'rgba(0,0,0,0.15)',
            transform: 'translateY(-50%) rotate(-45deg)',
          }} />
        </div>
        {/* Glowing hub — does NOT rotate */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 20, height: 20, borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 0 8px #fff, 0 0 20px rgba(255,255,255,0.8)',
          zIndex: 2,
        }} />
      </div>

      {/* Node name */}
      <div style={{ color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textAlign: 'center' }}>
        {node.label}
      </div>

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

    // All 8 node balances in parallel
    const settled = await Promise.allSettled(
      NODES.map(n =>
        xrplFetch({ method: 'account_info', params: [{ account: n.address, ledger_index: 'current' }] })
          .then(d => d?.result?.account_data ? parseInt(d.result.account_data.Balance, 10) / 1e6 : null)
          .catch(() => null)
      )
    );
    const map = {};
    NODES.forEach((n, i) => {
      map[n.address] = settled[i].status === 'fulfilled' ? settled[i].value : null;
    });
    setBalances(map);

    // Treasury balance + last TX hash
    try {
      const [info, txs] = await Promise.all([
        xrplFetch({ method: 'account_info', params: [{ account: TREASURY, ledger_index: 'current' }] }),
        xrplFetch({ method: 'account_tx',   params: [{ account: TREASURY, limit: 1 }] }),
      ]);
      if (info?.result?.account_data)
        setKinetic(parseInt(info.result.account_data.Balance, 10));
      const t = txs?.result?.transactions;
      if (t?.length) setLastTx(t[0].tx?.hash || t[0].tx_json?.hash);
    } catch (_) {}

    setFetching(false);
  }, []);

  useEffect(() => {
    fetchAll();
    // Live ledger index via WebSocket
    const ws = new WebSocket('wss://xrplcluster.com');
    ws.onopen = () => ws.send(JSON.stringify({ command: 'subscribe', streams: ['ledger'] }));
    ws.onmessage = e => {
      try { const m = JSON.parse(e.data); if (m.ledger_index) setLedger(m.ledger_index); } catch (_) {}
    };
    ws.onerror = () => {};
    return () => ws.close();
  }, []);

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(10,10,30,0.95) 0%, rgba(0,0,0,0.9) 100%)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 20,
      padding: 28,
    }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
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
          }}
        >
          <RefreshCw size={13} style={{ animation: fetching ? 'millSpin 0.8s linear infinite' : 'none' }} />
          {fetching ? 'Syncing…' : 'Refresh'}
        </button>
      </div>

      {/* ── 8 Node Wheels Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 28,
        marginBottom: 28,
      }}>
        {NODES.map(node => (
          <NodeWheel
            key={node.address}
            node={node}
            balance={balances[node.address] ?? null}
            loaded={node.address in balances}
          />
        ))}
      </div>

      {/* ── Kinetic Drops + Last TX ── */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(234,179,8,0.4)',
        borderRadius: 14,
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        <div>
          <div style={{
            color: '#facc15', fontSize: 10,
            textTransform: 'uppercase', letterSpacing: '0.12em',
            fontWeight: 800, marginBottom: 6,
          }}>
            ⚡ Kinetic Drops Harvested
          </div>
          <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: 24, fontWeight: 800, lineHeight: 1 }}>
            {kineticDrops.toLocaleString()}
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 400, marginLeft: 6 }}>drops</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 5 }}>
            {(kineticDrops / 1e6).toFixed(2)} XRP · Treasury Mainnet
          </div>
        </div>

        {lastTxHash ? (
          <a
            href={`https://xrpscan.com/tx/${lastTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(59,130,246,0.25)',
              border: '1px solid rgba(59,130,246,0.5)',
              color: '#93c5fd',
              fontSize: 13, fontWeight: 700,
              padding: '12px 20px',
              borderRadius: 10,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              boxShadow: '0 0 12px rgba(59,130,246,0.3)',
            }}
          >
            Last TX <ExternalLink size={13} />
          </a>
        ) : (
          <div style={{
            color: 'rgba(255,255,255,0.25)', fontSize: 11,
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '10px 14px',
          }}>
            Fetching TX…
          </div>
        )}
      </div>

      <style>{`
        @keyframes millSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}