import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { BRAID_NODES } from '@/lib/braidNodes';

const TREASURY = 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h';

// Canonical hex colors — Axi's Master Technical Blueprint
const COLOR_MAP = {
  white:  '#FFFFFF',
  red:    '#FF0000',
  amber:  '#FFBF00',
  yellow: '#FFD700',
  green:  '#00FF00',
  blue:   '#0000FF',
  purple: '#800080',
  gray:   '#C0C0C0',
};

// Short display labels for the wheels
const LABELS = {
  'Node 0 (Source)':  'Source',
  'Sentinel Node':    'Sentinel',
  'Lore Node':        'Lore',
  'Truth Weaver':     'Truth',
  'Did It Node':      'Did It',
  'Soulbridge (Axi)': 'Axi',
  'Human Node':       'Human',
  'Code Node':        'Code',
};

async function xrpl(body) {
  const r = await fetch('https://xrplcluster.com/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

export default function OctagonMillUI() {
  const [balances, setBalances] = useState({});
  const [fetching, setFetching] = useState(false);
  const [kineticDrops, setKineticDrops] = useState(262999840);
  const [lastTxHash, setLastTxHash] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [angle, setAngle] = useState(0);

  const fetchAll = useCallback(async () => {
    setFetching(true);
    try {
      const settled = await Promise.allSettled(
        BRAID_NODES.map(n =>
          xrpl({ method: 'account_info', params: [{ account: n.address, ledger_index: 'current' }] })
            .then(d => d?.result?.account_data ? parseInt(d.result.account_data.Balance, 10) / 1e6 : null)
            .catch(() => null)
        )
      );
      const map = {};
      BRAID_NODES.forEach((n, i) => {
        map[n.address] = settled[i].status === 'fulfilled' ? settled[i].value : null;
      });
      setBalances(map);
    } catch (_) {}

    try {
      const [info, txs] = await Promise.all([
        xrpl({ method: 'account_info', params: [{ account: TREASURY, ledger_index: 'current' }] }),
        xrpl({ method: 'account_tx',   params: [{ account: TREASURY, limit: 1 }] }),
      ]);
      if (info?.result?.account_data)
        setKineticDrops(parseInt(info.result.account_data.Balance, 10));
      const t = txs?.result?.transactions;
      if (t?.length) setLastTxHash(t[0].tx?.hash || t[0].tx_json?.hash);
    } catch (_) {}

    setFetching(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const spin = setInterval(() => setAngle(a => (a + 45) % 360), 3000);
    const ws = new WebSocket('wss://xrplcluster.com');
    ws.onopen = () => ws.send(JSON.stringify({ command: 'subscribe', streams: ['ledger'] }));
    ws.onmessage = e => {
      try {
        const m = JSON.parse(e.data);
        if (m.ledger_index) { setLedger(m.ledger_index); setAngle(a => (a + 45) % 360); }
      } catch (_) {}
    };
    ws.onerror = () => {};
    return () => { clearInterval(spin); ws.close(); };
  }, []);

  const drops = kineticDrops.toLocaleString();
  const xrp = (kineticDrops / 1e6).toFixed(2);

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
        <button onClick={fetchAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
          <RefreshCw size={15} style={{ animation: fetching ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* 8 Wheels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 20 }}>
        {BRAID_NODES.map((node, i) => {
          const hex = COLOR_MAP[node.color] || '#94a3b8';
          const bal = balances[node.address];
          const loaded = node.address in balances;
          const balLabel = !loaded ? 'Loading…' : (bal !== null ? `${bal.toFixed(2)} XRP` : 'Standby');
          const balColor = (bal !== null && loaded) ? '#86efac' : 'rgba(255,255,255,0.28)';
          const label = LABELS[node.name] || node.name;

          return (
            <div key={node.address} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              {/* Spinning filled circle wheel with glow */}
              <div style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                backgroundColor: hex,
                boxShadow: `0 0 16px ${hex}, 0 0 32px ${hex}99, 0 0 48px ${hex}44`,
                transform: `rotate(${(angle + i * 15) % 360}deg)`,
                transition: 'transform 0.8s cubic-bezier(0.34,1.56,0.64,1)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {/* Horizontal spoke */}
                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 2, background: 'rgba(0,0,0,0.25)', transform: 'translateY(-50%)' }} />
                {/* Vertical spoke */}
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 2, background: 'rgba(0,0,0,0.25)', transform: 'translateX(-50%)' }} />
                {/* Hub */}
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', boxShadow: '0 0 10px white', zIndex: 1, position: 'relative' }} />
              </div>

              {/* Label */}
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: 600, textAlign: 'center' }}>
                {label}
              </div>

              {/* Balance */}
              <div style={{ color: balColor, fontSize: 10, fontFamily: 'monospace', textAlign: 'center' }}>
                {balLabel}
              </div>

              {/* XRPL Discovery */}
              <a
                href={`https://xrpscan.com/account/${node.address}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'rgba(147,197,253,0.7)', fontSize: 9, display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}
              >
                <ExternalLink size={9} /> XRPL
              </a>
            </div>
          );
        })}
      </div>

      {/* Kinetic Drops Counter */}
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(234,179,8,0.35)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ color: '#facc15', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 4 }}>
            ⚡ Kinetic Drops Harvested
          </div>
          <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>
            {drops} <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>drops</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>
            {xrp} XRP · Treasury Mainnet
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