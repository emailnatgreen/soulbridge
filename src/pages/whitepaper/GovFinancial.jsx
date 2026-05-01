import React from 'react';
import WhitepaperLayout from '@/components/whitepaper/WhitepaperLayout';
import { Banknote, User } from 'lucide-react';

export default function GovFinancial() {
  return (
    <WhitepaperLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-sm font-bold">7</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">Financial Controls</h1>
          </div>
          <p className="text-purple-400/60 text-xs">Layer 7 · Per-Node Financial Governance</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <p className="text-white/60 text-sm leading-relaxed">
            The <code className="text-purple-300 bg-purple-500/10 px-1 rounded">GovernanceLimits</code> entity provides 
            granular financial controls that can be applied to specific nodes in the Constitutional Braid. 
            These limits act as circuit breakers, ensuring no automated system or individual node can execute 
            financial operations beyond defined thresholds.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">Limit Configuration</h2>
          <div className="space-y-2">
            {[
              { field: 'limit_name', desc: 'Unique identifier (e.g., "max_auto_trade_usd", "kinetic_threshold")' },
              { field: 'value', desc: 'Numeric threshold value' },
              { field: 'currency', desc: 'Currency the limit applies to (default: RLUSD)' },
              { field: 'applies_to_nodes', desc: 'Array of node IDs (0-7) this limit covers' },
              { field: 'requires_human_approval_above', desc: 'Transactions exceeding this value require Node 6 (Human) sign-off' },
              { field: 'set_by', desc: 'Who configured this limit (Governor_Nathan, Council, etc.)' },
            ].map(f => (
              <div key={f.field} className="bg-black/20 border border-white/10 rounded-lg px-4 py-3">
                <code className="text-purple-300 text-xs">{f.field}</code>
                <p className="text-white/40 text-xs mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-amber-400" />
            <h3 className="text-amber-300 font-semibold text-sm">Human Approval Gate</h3>
          </div>
          <p className="text-white/60 text-sm leading-relaxed">
            The <code className="text-purple-300 bg-purple-500/10 px-1 rounded">requires_human_approval_above</code> field 
            creates a dynamic escalation path. When an AI node attempts a financial operation above the threshold, 
            the system automatically requires Node 6 (Human / Nathan) co-signature before the transaction can proceed. 
            This ensures that high-value operations always have human oversight, whilst allowing routine operations 
            to execute autonomously.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-green-400" />
            <h2 className="text-white font-semibold text-lg">Design Principles</h2>
          </div>
          <ul className="space-y-2 text-white/60 text-sm">
            <li className="flex items-start gap-2"><span className="text-green-400 mt-1">▸</span><strong className="text-white/80">Defence in depth</strong> — financial limits complement (not replace) the multi-sig and governance vote requirements</li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-1">▸</span><strong className="text-white/80">Node-specific</strong> — different nodes can have different limits based on their trust level</li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-1">▸</span><strong className="text-white/80">Governor-controlled</strong> — limits are set by designated governors, not hard-coded</li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-1">▸</span><strong className="text-white/80">Real-time enforcement</strong> — checked at transaction time, not retroactively</li>
          </ul>
        </div>
      </div>
    </WhitepaperLayout>
  );
}