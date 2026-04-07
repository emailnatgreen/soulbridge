import React from 'react';
import { ExternalLink } from 'lucide-react';

export default function TreasuryXRPscanLink({ address }) {
  if (!address || address === 'N/A - Legacy Record' || address.length < 20) {
    return <span className="text-[10px] text-slate-600 font-mono">{address || 'No address'}</span>;
  }

  return (
    <a
      href={`https://xrpscan.com/account/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-mono transition-colors"
    >
      {address.slice(0, 8)}…{address.slice(-6)}
      <ExternalLink className="w-2.5 h-2.5" />
    </a>
  );
}