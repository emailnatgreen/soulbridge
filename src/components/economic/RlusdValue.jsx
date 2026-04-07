import React from 'react';
import { xrpToRlusd } from '@/lib/economicUtils';

export default function RlusdValue({ amount, prefix = '', className = '', showXrp = true }) {
  const rlusd = xrpToRlusd(amount);
  return (
    <span className={className}>
      {prefix}{amount.toFixed(2)} {showXrp && <span className="text-xs font-normal">XRP</span>}
      <span className="text-slate-500 text-[10px] ml-1">(≈${rlusd} RLUSD)</span>
    </span>
  );
}