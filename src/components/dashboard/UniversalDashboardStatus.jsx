import React from 'react';

export default function UniversalDashboardStatus({ hasInviteSession, identity, wallets, myInvites, myTransactions, inviteWallet }) {
  // Derive the effective DID address from identity, inviteWallet, or first wallet
  const effectiveDid = identity?.did
    || (inviteWallet?.classic_address ? `did:xrpl:1:${inviteWallet.classic_address}` : null)
    || (wallets?.[0]?.classic_address ? `did:xrpl:1:${wallets[0].classic_address}` : null);

  const identityConnected = !!(identity || inviteWallet?.classic_address || wallets?.length > 0);
  const shortDid = effectiveDid ? effectiveDid.split(':').pop()?.slice(0, 8) + '…' : null;

  const items = hasInviteSession
    ? [
        { label: 'Wallet ready', value: inviteWallet ? 'Yes' : 'No' },
        { label: 'Wallet funded', value: Number(inviteWallet?.balance || 0) > 0 ? 'Yes' : 'No' },
        { label: 'DID published', value: inviteWallet?.is_published ? 'Yes' : 'Not yet' },
      ]
    : [
        { label: 'Identity connected', value: identityConnected ? 'Yes' : 'No', subtitle: shortDid },
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
            {item.subtitle && <p className="text-[10px] text-purple-300/60 font-mono mt-1 truncate">{item.subtitle}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}