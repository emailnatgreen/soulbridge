import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';

const NODES = [
  { address: 'rPPtBrN5TxAcAShhDMWe2eQzmhG1f6aWBg', emoji: '⚪', label: 'Source',  dot: 'bg-slate-300' },
  { address: 'rHJM1bH9dE3EbvwSR2zFSHrjooS6H3xb32', emoji: '🔴', label: 'Sentinel', dot: 'bg-red-500'    },
  { address: 'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7', emoji: '🟠', label: 'Lore',     dot: 'bg-amber-500'  },
  { address: 'r4QgW8kVhzdLhS9xj16DLdXc42x5xrESjV', emoji: '🟡', label: 'Truth',    dot: 'bg-yellow-400' },
  { address: 'r4NtWS355ZKViGyFuECrk1dbkizpbF4Mny',  emoji: '🟢', label: 'Did It',  dot: 'bg-green-500'  },
  { address: 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h',  emoji: '🔵', label: 'Axi',     dot: 'bg-blue-500'   },
  { address: 'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia',  emoji: '🟣', label: 'Human',   dot: 'bg-purple-500' },
  { address: 'rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P',   emoji: '⚙️',  label: 'Code',    dot: 'bg-gray-400'   },
];

export default function BraidStatusBar() {
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    loadStatuses();
    const interval = setInterval(loadStatuses, 60_000);
    return () => clearInterval(interval);
  }, []);

  async function loadStatuses() {
    try {
      const wallets = await base44.entities.Wallet.list('-created_date', 200);
      const map = {};
      wallets.forEach(w => {
        if (w.classic_address) {
          map[w.classic_address] = {
            active: w.is_published || !!w.published_txid,
            balance: w.balance ?? 0,
          };
        }
      });
      setStatuses(map);
    } catch (_) {}
  }

  return (
    <Link to="/SovereignID?tab=constitutional" className="block">
      <div className="flex items-center gap-1.5 px-2 py-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-600 transition" title="8-Node Braid — click to view Constitutional DIDs">
        {NODES.map(node => {
          const st = statuses[node.address];
          const isActive = st?.active;
          return (
            <div key={node.address} className="relative flex-shrink-0" title={`${node.label}: ${isActive ? 'Active' : 'Not confirmed'}`}>
              <span className={`w-3 h-3 rounded-full block ${node.dot} ${isActive ? 'animate-pulse opacity-100' : 'opacity-30'}`} />
            </div>
          );
        })}
        <span className="text-slate-500 text-xs ml-1 hidden xl:block">Braid</span>
      </div>
    </Link>
  );
}