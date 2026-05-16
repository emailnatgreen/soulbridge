import React from 'react';
import { AlertTriangle, ShieldOff, ServerCrash } from 'lucide-react';

const errorConfig = {
  403: {
    Icon: ShieldOff,
    title: 'Access Denied',
    message: 'This engine does not belong to your DID. You can only search with engines you own.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
  404: {
    Icon: AlertTriangle,
    title: 'Engine Not Found',
    message: 'The specified Search Engine NFT does not exist. Please select a valid engine.',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
  },
  500: {
    Icon: ServerCrash,
    title: 'Engine Error',
    message: 'The search engine encountered an internal error. Please try again later.',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
  },
};

export default function SearchErrorCard({ status, errorMessage }) {
  const config = errorConfig[status] || errorConfig[500];
  const ErrorIcon = config.Icon;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${config.bg}`}>
      <ErrorIcon className={`w-5 h-5 ${config.color} mt-0.5 shrink-0`} />
      <div>
        <h3 className={`text-sm font-semibold ${config.color}`}>{config.title}</h3>
        <p className="text-xs text-slate-400 mt-1">{errorMessage || config.message}</p>
      </div>
    </div>
  );
}