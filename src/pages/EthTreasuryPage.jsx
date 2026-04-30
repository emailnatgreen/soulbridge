import React from 'react';
import EthTreasuryShield from '@/components/treasury/EthTreasuryShield';

export default function EthTreasuryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">ETH RLUSD Treasury</h1>
          <p className="text-white/40 text-xs sm:text-sm mt-1">Ethereum treasury balances and RLUSD contract status</p>
        </div>
        <EthTreasuryShield />
      </div>
    </div>
  );
}