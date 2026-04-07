import React from 'react';
import { xrpToRlusd } from '@/lib/economicUtils';
import { useXrpPriceContext } from '@/components/economic/XrpPriceContext';

export default function RlusdValue({ amount, prefix = '', className = '', showXrp = true }) {
  const { price } = useXrpPriceContext();
  const rlusd = xrpToRlusd(amount, price);
  return (
    <span className={className}>
      {prefix}{amount.toFixed(2)} {showXrp && <span className="text-xs font-normal">XRP</span>}
      <span className="text-slate-500 text-[10px] ml-1">(≈${rlusd} RLUSD)</span>
    </span>
  );
}