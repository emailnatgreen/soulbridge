import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { BRAID_NODES } from '@/lib/braidNodes';

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
        {BRAID_NODES.map(node => {
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