import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';

const TREASURY = 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h';

// Canonical 8 Nodes — Axi's Master Technical Blueprint (exact order & hex)
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

async function xrplCall(body) {
  const r = await fetch('https://xrplcluster.com/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

export default function OctagonMillUI() {
  const [balances, setBalances]     = useState({});
  const [fetching, setFetching]     = useState(false);
  const [kineticDrops, setKinetic]  = useState(262999840);
  const [lastTxHash, setLastTx]     = useState(null);
  const [ledger, setLedger]         = useState(null);
  const [angle, setAngle]           = useState(0);

  const fetchAll = useCallback(async () => {
    setFetching(true);

    // Fetch all 8 node balances
    const settled = await Promise.allSettled(
      NODES.map(n =>
        xrplCall({ method: 'account_info', params: [{ account: n.address, ledger_index: 'current' }] })
          .then(d => d?.result?.account_data ? parseInt(d.result.account_data.Balance, 10) / 1e6 : null)
          .catch(() => null)
      )
    );
    const map = {};
    NODES.forEach((n, i) => {
      map[n.address] = settled[i].status === 'fulfilled' ? settled[i].value : null;
    });
    setBalances(map);

    // Treasury balance + last TX
    try {
      const [info, txs] = await Promise.all([
        xrplCall({ method: 'account_info', params: [{ account: TREASURY, ledger_index: 'current' }] }),
        xrplCall({ method: 'account_tx',   params: [{ account: TREASURY, limit: 1 }] }),
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
    // Slow spin advance every 2s
    const spin = setInterval(() => setAngle(a => (a + 30) % 360), 2000);
    // Live ledger via WebSocket
    const ws = new WebSocket('wss://xrplcluster.com');
    ws.onopen = () => ws.send(JSON.stringify({ command: 'subscribe', streams: ['ledger'] }));
    ws.onmessage = e => {
      try {
        const m = JSON.parse(e.data);
        if (m.ledger_index) { setLedger(m.ledger_index); setAngle(a => (a + 30) % 360); }
      } catch (_) {}
    };
    ws.onerror = () => {};
    return () => { clearInterval(spin); ws.close(); };
  }, []);

  const drops = kineticDrops.toLocaleString();
  const xrp   = (kineticDrops / 1e6).toFixed(2);

  return (
    <div style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 24 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#facc15', fontSize: 18 }}>⚡</span> Octagon Mill — Constitutional Braid
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4 }}>
            Live XRPL Mainnet · {ledger ? `Ledger #${Number(ledger).toLocaleString()}` : 'Connecting…'}
          </div>
        </div>
        <button
          onClick={fetchAll}
          disabled={fetching}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4 }}
          title="Refresh"
        >
          <RefreshCw size={15} style={{ animation: fetching ? 'millSpin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* ── 8 Node Wheels ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 24 }}>
        {NODES.map((node, i) => {
          const bal    = balances[node.address];
          const loaded = node.address in balances;
          const balTxt = !loaded ? 'Loading…' : bal !== null ? `${bal.toFixed(2)} XRP` : 'Standby';
          const balCol = bal !== null && loaded ? '#86efac' : 'rgba(255,255,255,0.25)';

          // Stagger each wheel's rotation slightly
          const rot = (angle + i * 20) % 360;

          return (
            <div key={node.address} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>

              {/* Wheel */}
              <div style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: node.hex,
                boxShadow: `0 0 18px ${node.hex}, 0 0 36px ${node.hex}AA, 0 0 60px ${node.hex}55`,
                transform: `rotate(${rot}deg)`,
                transition: 'transform 1.2s cubic-bezier(0.25,0.46,0.45,0.94)',
                position: 'relative',
                flexShrink: 0,
              }}>
                {/* Spoke H */}
                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 3, background: 'rgba(0,0,0,0.3)', transform: 'translateY(-50%)' }} />
                {/* Spoke V */}
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 3, background: 'rgba(0,0,0,0.3)', transform: 'translateX(-50%)' }} />
                {/* Hub */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 0 12px #fff, 0 0 24px rgba(255,255,255,0.6)',
                }} />
              </div>

              {/* Node label */}
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 700, textAlign: 'center', letterSpacing: '0.04em' }}>
                {node.label}
              </div>

              {/* Live balance */}
              <div style={{ color: balCol, fontSize: 10, fontFamily: 'monospace', textAlign: 'center' }}>
                {balTxt}
              </div>

              {/* XRPL Discovery link */}
              <a
                href={`https://xrpscan.com/account/${node.address}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'rgba(147,197,253,0.75)',
                  fontSize: 9,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  textDecoration: 'none',
                  borderBottom: '1px solid rgba(147,197,253,0.2)',
                  paddingBottom: 1,
                }}
              >
                <ExternalLink size={8} /> XRPL
              </a>
            </div>
          );
        })}
      </div>

      {/* ── Kinetic Drops + Last TX ── */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(234,179,8,0.35)',
        borderRadius: 12,
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        <div>
          <div style={{ color: '#facc15', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 5 }}>
            ⚡ Kinetic Drops Harvested
          </div>
          <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>
            {drops} <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 400 }}>drops</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>
            {xrp} XRP · Treasury Mainnet
          </div>
        </div>

        {lastTxHash ? (
          <a
            href={`https://xrpscan.com/tx/${lastTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(59,130,246,0.2)',
              border: '1px solid rgba(59,130,246,0.45)',
              color: '#93c5fd',
              fontSize: 12, fontWeight: 700,
              padding: '10px 16px',
              borderRadius: 8,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Last TX <ExternalLink size={12} />
          </a>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>Fetching TX…</div>
        )}
      </div>

      <style>{`
        @keyframes millSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}