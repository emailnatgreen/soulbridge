import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Wallet, Send, Eye, Sparkles } from 'lucide-react';

export default function AgentQuickActions({ agent }) {
  const hasDID = agent.classic_address && agent.classic_address.startsWith('r');

  const actions = [
    { icon: Eye, label: 'Profile', path: `/agents/${agent.id}`, color: 'text-purple-400 hover:bg-purple-500/10' },
    { icon: MessageSquare, label: 'Chat', path: `/AgentChat`, color: 'text-blue-400 hover:bg-blue-500/10' },
  ];

  if (hasDID) {
    actions.push({
      icon: Wallet,
      label: 'Wallet',
      path: `/wallets`,
      color: 'text-green-400 hover:bg-green-500/10',
    });
    actions.push({
      icon: Send,
      label: 'Send',
      path: `/send`,
      color: 'text-amber-400 hover:bg-amber-500/10',
    });
  }

  return (
    <div className="flex gap-1">
      {actions.map(a => (
        <Link
          key={a.label}
          to={a.path}
          className={`p-1.5 rounded-lg transition-all ${a.color}`}
          title={a.label}
          onClick={(e) => e.stopPropagation()}
        >
          <a.icon className="w-3.5 h-3.5" />
        </Link>
      ))}
    </div>
  );
}