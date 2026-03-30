import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Globe, KeyRound, Users } from 'lucide-react';

export default function UniversalDashboardQuickActions({ hasInviteSession, inviteWallet, onPublish, publishingDid, publishingWalletId, isAdmin }) {
  const cards = hasInviteSession
    ? [
        {
          title: 'Publish your DID',
          description: 'Anchor your identity on XRPL and complete your entry into SoulBridge.',
          action: (
            <button
              onClick={() => onPublish(inviteWallet?.id)}
              disabled={publishingDid}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              <Globe className="w-4 h-4" />
              {publishingDid && publishingWalletId === inviteWallet?.id ? 'Publishing…' : 'Publish now'}
            </button>
          )
        },
        {
          title: 'Enter the village',
          description: 'Once published, continue into the main SoulBridge experience.',
          action: (
            <Link to="/Home" className="inline-flex items-center gap-2 text-sm text-yellow-300 hover:text-yellow-200">
              Continue <ArrowRight className="w-4 h-4" />
            </Link>
          )
        }
      ]
    : [
        {
          title: 'Go to village home',
          description: 'Return to the main SoulBridge home and continue from your core dashboard flow.',
          action: (
            <Link to="/Home" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white hover:from-purple-500 hover:to-pink-500">
              <ArrowRight className="w-4 h-4" /> Open home
            </Link>
          )
        },
        ...(isAdmin ? [{
          title: 'Invite someone in',
          description: 'Create a clean invite link and bring new members into the platform.',
          action: (
            <Link to="/InviteLinkManager" className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200">
              <Users className="w-4 h-4" /> Open invites
            </Link>
          )
        }] : [])
      ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.map((card) => (
        <div key={card.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-white font-medium mb-2">{card.title}</h3>
          <p className="text-sm text-white/60 mb-4">{card.description}</p>
          {card.action}
        </div>
      ))}
    </div>
  );
}