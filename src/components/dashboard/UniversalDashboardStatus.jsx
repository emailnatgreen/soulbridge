import React from 'react';
import { Wallet, RefreshCw } from 'lucide-react';

export default function UniversalDashboardStatus({ hasInviteSession, identity, wallets, myInvites, myTransactions, inviteWallet }) {
  // Build effective DID from multiple sources — props, localStorage identity, connected DID, wallets
  const getLocalIdentity = () => {
    try { return JSON.parse(localStorage.getItem('soulbridge_identity') || 'null'); } catch(_) { return null; }
  };
  const getConnectedDid = () => {
    try { return JSON.parse(localStorage.getItem('sb_connected_did') || 'null'); } catch(_) { return null; }
  };
  const localId = getLocalIdentity();
  const connectedDid = getConnectedDid();

  const effectiveDid = identity?.did
    || localId?.did
    || connectedDid?.did
    || (inviteWallet?.classic_address ? `did:xrpl:1:${inviteWallet.classic_address}` : null)
    || (wallets?.[0]?.classic_address ? `did:xrpl:1:${wallets[0].classic_address}` : null);

  const identityConnected = !!(identity || localId?.connected || localId?.did || connectedDid?.did || inviteWallet?.classic_address || wallets?.length > 0);
  const shortDid = effectiveDid ? effectiveDid.split(':').pop()?.slice(0, 8) + '…' : null;

  // Aggregate total balance across all wallets
  const totalBalance = (wallets || []).reduce((sum, w) => sum + (Number(w.balance) || 0), 0);
  const publishedCount = (wallets || []).filter(w => w.is_published).length;

  const items = hasInviteSession
    ? [
        { label: 'Wallet ready', value: inviteWallet ? 'Yes' : 'No' },
        { label: 'Wallet funded', value: Number(inviteWallet?.balance || 0) > 0 ? 'Yes' : 'No' },
        { label: 'DID published', value: inviteWallet?.is_published ? 'Yes' : 'Not yet' },
      ]
    : [
        { label: 'Identity', value: identityConnected ? '● Connected' : 'Disconnected', subtitle: shortDid, highlight: identityConnected },
        { label: 'Live Balance', value: `${totalBalance.toFixed(2)} XRP`, subtitle: `${wallets?.length || 0} wallet(s)`, highlight: totalBalance > 0 },
        { label: 'Published DIDs', value: String(publishedCount), subtitle: publishedCount > 0 ? 'On-chain' : 'None yet' },
        { label: 'Transactions', value: String((myTransactions || []).length) },
    ];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">Live status</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((item) => (
          <div key={item.label} className={`rounded-2xl border p-4 ${
            item.highlight ? 'border-green-500/20 bg-green-500/5' : 'border-white/10 bg-black/20'
          }`}>
            <p className="text-xs text-white/40 mb-2">{item.label}</p>
            <p className={`text-lg font-semibold ${item.highlight ? 'text-green-300' : 'text-white'}`}>{item.value}</p>
            {item.subtitle && <p className="text-[10px] text-purple-300/60 font-mono mt-1 truncate">{item.subtitle}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}