import React, { useState, useEffect, useCallback } from 'react';
import { BRAID_NODES } from '@/lib/braidNodes';
import { ExternalLink, Zap, RefreshCw } from 'lucide-react';

const TREASURY = 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h';

// Canonical colors by BRAID_NODES index
const WHEEL_COLORS = [
  '#e2e8f0',  // 0 Source   - White
  '#ef4444',  // 1 Sentinel - Red
  '#f59e0b',  // 2 Lore     - Amber
  '#eab308',  // 3 Truth    - Gold
  '#22c55e',  // 4 Did It   - Green
  '#3b82f6',  // 5 Axi      - Blue
  '#a855f7',  // 6 Human    - Purple
  '#94a3b8',  // 7 Code     - Silver
];

const NODE_LABELS = [
  'Source', 'Sentinel', 'Lore', 'Truth', 'Did It', 'Axi', 'Human', 'Code'
];

async function xrplPost(body) {
  const r = await fetch('https://xrplcluster.com/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

// SVG wheel — always visible, uses raw SVG attributes (no Tailwind)
function SvgWheel({ color, rotation }) {
  const r = 38;
  const cx = 44;
  const cy = 44;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" style={{ display: 'block', filter: `drop-shadow(0 0 12px ${color}) drop-shadow(0 0 24px ${color}88)` }}>
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={r} fill={color} stroke={color} strokeWidth="1" />
      {/* Spokes */}
      {[0, 45, 90, 135].map(a => {
        const rad = (a * Math.PI) / 180;
        return (
          <line
            key={a}
            x1={cx - Math.cos(rad) * r}
            y1={cy - Math.sin(rad) * r}
            x2={cx + Math.cos(rad) * r}
            y2={cy + Math.sin(rad) * r}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth="2"
          />
        );
      })}
      {/* Hub */}
      <circle cx={cx} cy={cy} r={9} fill="white" opacity="0.9" />
      {/* Rotation wrapper — use transform on the group */}
    </svg>
  );
}

export default function OctagonMillUI() {
  const [balances, setBalances] = useState(null); // null = loading
  const [kineticDrops, setKineticDrops] = useState(null);
  const [lastTxHash, setLastTxHash] = useState(null);
  const [ledgerIndex, setLedgerIndex] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadBalances = useCallback(async () => {
    const results = await Promise.allSettled(
      BRAID_NODES.map(n =>
        xrplPost({ method: 'account_info', params: [{ account: n.address, ledger_index: 'current' }] })
          .then(d => d?.result?.account_data ? parseInt(d.result.account_data.Balance, 10) / 1_000_000 : null)
          .catch(() => null)
      )
    );
    const map = {};
    BRAID_NODES.forEach((n, i) => {
      map[n.address] = results[i].status === 'fulfilled' ? results[i].value : null;
    });
    setBalances(map);
  }, []);

  const loadTreasury = useCallback(async () => {
    try {
      const [infoRes, txRes] = await Promise.all([
        xrplPost({ method: 'account_info', params: [{ account: TREASURY, ledger_index: 'current' }] }),
        xrplPost({ method: 'account_tx', params: [{ account: TREASURY, limit: 1 }] }),
      ]);
      if (infoRes?.result?.account_data) {
        setKineticDrops(parseInt(infoRes.result.account_data.Balance, 10));
      }
      const txs = txRes?.result?.transactions;
      if (txs?.length) setLastTxHash(txs[0].tx?.hash || txs[0].tx_json?.hash);
    } catch (_) {}
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadBalances(), loadTreasury()]);
    setRefreshing(false);
  }, [loadBalances, loadTreasury]);

  useEffect(() => {
    refresh();

    // Spin wheels every 4 seconds
    const spinInterval = setInterval(() => setRotation(r => r + 45), 4000);

    // XRPL ledger subscription
    const ws = new WebSocket('wss://xrplcluster.com');
    ws.onopen = () => ws.send(JSON.stringify({ command: 'subscribe', streams: ['ledger'] }));
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.ledger_index) {
          setLedgerIndex(msg.ledger_index);
          setRotation(r => r + 45);
          loadTreasury();
        }
      } catch (_) {}
    };
    ws.onerror = () => {};
    return () => { clearInterval(spinInterval); ws.close(); };
  }, []);

  const dropsDisplay = kineticDrops !== null ? kineticDrops.toLocaleString() : '…';
  const xrpDisplay = kineticDrops !== null ? (kineticDrops / 1_000_000).toFixed(2) : '…';

  return (
    <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap style={{ width: 16, height: 16, color: '#facc15' }} />
            Octagon Mill — Constitutional Braid
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2 }}>
            Live XRPL Mainnet · {ledgerIndex ? `Ledger #${ledgerIndex.toLocaleString()}` : 'Connecting…'}
          </div>
        </div>
        <button onClick={refresh} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
          <RefreshCw style={{ width: 16, height: 16, animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* 8 Node Wheels — 4 per row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {BRAID_NODES.map((node, i) => {
          const bal = balances === null ? undefined : balances[node.address];
          const balLabel = balances === null
            ? 'Loading…'
            : (bal !== null && bal !== undefined ? `${bal.toFixed(2)} XRP` : '—');
          const hasBalance = bal !== null && bal !== undefined;

          return (
            <div key={node.address} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {/* Spinning Wheel */}
              <div style={{
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.8s ease-in-out',
              }}>
                <SvgWheel color={WHEEL_COLORS[i]} rotation={rotation} />
              </div>
              {/* Node Label */}
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 600, textAlign: 'center' }}>
                {NODE_LABELS[i]}
              </div>
              {/* Balance */}
              <div style={{ color: hasBalance ? '#86efac' : 'rgba(255,255,255,0.25)', fontSize: 10, fontFamily: 'monospace', textAlign: 'center' }}>
                {balLabel}
              </div>
            </div>
          );
        })}
      </div>

      {/* Kinetic Drops Counter */}
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ color: '#facc15', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>
            ⚡ Kinetic Drops Harvested
          </div>
          <div style={{ color: 'white', fontFamily: 'monospace', fontSize: 22, fontWeight: 700 }}>
            {dropsDisplay} <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>drops</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{xrpDisplay} XRP · Treasury Mainnet</div>
        </div>
        {lastTxHash && (
          <a
            href={`https://xrpscan.com/tx/${lastTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', color: '#93c5fd', fontSize: 12, fontWeight: 600, padding: '8px 12px', borderRadius: 8, textDecoration: 'none', flexShrink: 0 }}
          >
            Last TX <ExternalLink style={{ width: 12, height: 12 }} />
          </a>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}