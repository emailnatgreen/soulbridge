import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Zap, RefreshCw } from 'lucide-react';

const TREASURY = 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h';

// Hard-coded node data — no external import dependency
const NODES = [
  { address: 'rPPtBrN5TxAcAShhDMWe2eQzmhG1f6aWBg', label: 'Source',   color: '#e2e8f0' },
  { address: 'rHJM1bH9dE3EbvwSR2zFSHrjooS6H3xb32', label: 'Sentinel', color: '#ef4444' },
  { address: 'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7', label: 'Lore',     color: '#f59e0b' },
  { address: 'r4QgW8kVhzdLhS9xj16DLdXc42x5xrESjV', label: 'Truth',    color: '#eab308' },
  { address: 'r4NtWS355ZKViGyFuECrk1dbkizpbF4Mny',  label: 'Did It',  color: '#22c55e' },
  { address: 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h',  label: 'Axi',     color: '#3b82f6' },
  { address: 'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia',  label: 'Human',   color: '#a855f7' },
  { address: 'rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P',   label: 'Code',    color: '#94a3b8' },
];

export default function OctagonMillUI() {
  const [balances, setBalances] = useState({});  // address -> xrp number or null
  const [loading, setLoading] = useState(true);
  const [kineticDrops, setKineticDrops] = useState(null);
  const [lastTxHash, setLastTxHash] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [angle, setAngle] = useState(0);

  async function xrpl(body) {
    const r = await fetch('https://xrplcluster.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return r.json();
  }

  const fetchAll = useCallback(async () => {
    setLoading(true);
    // Fetch all node balances
    const settled = await Promise.allSettled(
      NODES.map(n =>
        xrpl({ method: 'account_info', params: [{ account: n.address, ledger_index: 'current' }] })
          .then(d => d?.result?.account_data ? parseInt(d.result.account_data.Balance, 10) / 1e6 : null)
          .catch(() => null)
      )
    );
    const map = {};
    NODES.forEach((n, i) => {
      map[n.address] = settled[i].status === 'fulfilled' ? settled[i].value : null;
    });
    setBalances(map);
    setLoading(false);

    // Treasury
    try {
      const [info, txs] = await Promise.all([
        xrpl({ method: 'account_info', params: [{ account: TREASURY, ledger_index: 'current' }] }),
        xrpl({ method: 'account_tx', params: [{ account: TREASURY, limit: 1 }] }),
      ]);
      if (info?.result?.account_data)
        setKineticDrops(parseInt(info.result.account_data.Balance, 10));
      const t = txs?.result?.transactions;
      if (t?.length) setLastTxHash(t[0].tx?.hash || t[0].tx_json?.hash);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchAll();
    const spin = setInterval(() => setAngle(a => a + 45), 3000);
    const ws = new WebSocket('wss://xrplcluster.com');
    ws.onopen = () => ws.send(JSON.stringify({ command: 'subscribe', streams: ['ledger'] }));
    ws.onmessage = e => {
      try {
        const m = JSON.parse(e.data);
        if (m.ledger_index) { setLedger(m.ledger_index); setAngle(a => a + 45); }
      } catch (_) {}
    };
    ws.onerror = () => {};
    return () => { clearInterval(spin); ws.close(); };
  }, []);

  return (
    <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#facc15' }}>⚡</span> Octagon Mill — Constitutional Braid
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 3 }}>
            Live XRPL Mainnet · {ledger ? `Ledger #${ledger.toLocaleString()}` : 'Connecting…'}
          </div>
        </div>
        <button
          onClick={fetchAll}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}
        >
          <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* 8 Wheels grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 20 }}>
        {NODES.map((node, i) => {
          const bal = balances[node.address];
          const hasBalance = bal !== null && bal !== undefined;
          const isLoadingThis = loading && !hasBalance;
          const balLabel = isLoadingThis ? 'Loading…' : hasBalance ? `${bal.toFixed(2)} XRP` : 'Standby';

          return (
            <div key={node.address} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              {/* The Wheel */}
              <div style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                backgroundColor: node.color,
                boxShadow: `0 0 18px ${node.color}, 0 0 36px ${node.color}77, 0 0 54px ${node.color}33`,
                transform: `rotate(${angle + i * 15}deg)`,
                transition: 'transform 0.8s cubic-bezier(0.34,1.56,0.64,1)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {/* Horizontal spoke */}
                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 2, background: 'rgba(0,0,0,0.3)', transform: 'translateY(-50%)' }} />
                {/* Vertical spoke */}
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 2, background: 'rgba(0,0,0,0.3)', transform: 'translateX(-50%)' }} />
                {/* Center hub */}
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: 'white',
                  boxShadow: '0 0 10px white',
                  zIndex: 1,
                  position: 'relative',
                }} />
              </div>

              {/* Label */}
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 600, textAlign: 'center' }}>
                {node.label}
              </div>

              {/* Balance */}
              <div style={{
                color: hasBalance ? '#86efac' : 'rgba(255,255,255,0.28)',
                fontSize: 10,
                fontFamily: 'monospace',
                textAlign: 'center',
              }}>
                {balLabel}
              </div>
            </div>
          );
        })}
      </div>

      {/* Kinetic Drops Counter */}
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ color: '#facc15', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 4 }}>
            ⚡ Kinetic Drops Harvested
          </div>
          <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>
            {kineticDrops !== null ? kineticDrops.toLocaleString() : '…'}
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginLeft: 6 }}>drops</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>
            {kineticDrops !== null ? (kineticDrops / 1e6).toFixed(2) : '…'} XRP · Treasury Mainnet
          </div>
        </div>
        {lastTxHash && (
          <a
            href={`https://xrpscan.com/tx/${lastTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', color: '#93c5fd', fontSize: 12, fontWeight: 600, padding: '8px 14px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            Last TX <ExternalLink size={12} />
          </a>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}