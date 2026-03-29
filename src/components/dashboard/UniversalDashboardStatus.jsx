import React from 'react';

export default function UniversalDashboardStatus({ hasInviteSession, identity, wallets, myInvites, myTransactions, inviteWallet }) {
  const items = hasInviteSession
    ? [
        { label: 'Wallet ready', value: inviteWallet ? 'Yes' : 'No' },
        { label: 'Wallet funded', value: Number(inviteWallet?.balance || 0) > 0 ? 'Yes' : 'No' },
        { label: 'DID published', value: inviteWallet?.is_published ? 'Yes' : 'Not yet' },
      ]
    : [
        { label: 'Identity connected', value: identity ? 'Yes' : 'No' },
        { label: 'My wallets', value: String(wallets.length) },
        { label: 'My invites', value: String(myInvites.length) },
        { label: 'Transactions', value: String(myTransactions.length) },
      ];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">Status snapshot</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-white/40 mb-2">{item.label}</p>
            <p className="text-lg font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}