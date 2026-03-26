import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { BRAID_NODES } from '@/lib/braidNodes';

export default function BraidNodeIndicators() {
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  async function load() {
    try {
      const wallets = await base44.entities.Wallet.list('-created_date', 200);
      const map = {};
      wallets.forEach(w => {
        if (w.classic_address) {
          map[w.classic_address] = w.is_published || !!w.published_txid;
        }
      });
      setStatuses(map);
    } catch (_) {}
  }

  return (
    <Link to="/SovereignID?tab=constitutional" className="block">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition" title="8-Node Constitutional Braid — click to view">
        <span className="text-white/40 text-[10px] uppercase tracking-widest mr-1 hidden sm:block">Braid</span>
        {BRAID_NODES.map(node => {
          const isActive = statuses[node.address];
          return (
            <div key={node.address} className="flex items-center gap-1" title={`${node.name}: ${isActive ? 'Active' : 'Not confirmed'}`}>
              <span className={`w-2.5 h-2.5 rounded-full block ${node.dot} ${isActive ? 'animate-pulse opacity-100' : 'opacity-25'}`} />
              <span className={`text-[10px] hidden lg:block ${isActive ? 'text-white/70' : 'text-white/25'}`}>{node.emoji}</span>
            </div>
          );
        })}
      </div>
    </Link>
  );
}