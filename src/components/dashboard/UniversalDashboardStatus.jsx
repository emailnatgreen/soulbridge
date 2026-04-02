import React, { useState, useEffect } from 'react';
import { Wallet, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function UniversalDashboardStatus({ hasInviteSession, identity, wallets, myInvites, myTransactions, inviteWallet, identityDid }) {
  const [liveBalances, setLiveBalances] = useState({});
  const [loadingBalances, setLoadingBalances] = useState(false);

  // Build effective DID from multiple sources
  const getLocalIdentity = () => {
    try { return JSON.parse(localStorage.getItem('soulbridge_identity') || 'null'); } catch(_) { return null; }
  };
  const getConnectedDid = () => {
    try { return JSON.parse(localStorage.getItem('sb_connected_did') || 'null'); } catch(_) { return null; }
  };
  const localId = getLocalIdentity();
  const connectedDid = getConnectedDid();

  const effectiveDid = identityDid
    || identity?.did
    || localId?.did
    || connectedDid?.did
    || (inviteWallet?.classic_address ? `did:xrpl:1:${inviteWallet.classic_address}` : null)
    || (wallets?.[0]?.classic_address ? `did:xrpl:1:${wallets[0].classic_address}` : null);

  const identityConnected = !!(identityDid || identity || localId?.connected || localId?.did || connectedDid?.did || inviteWallet?.classic_address || wallets?.length > 0);
  const shortDid = effectiveDid ? effectiveDid.split(':').pop()?.slice(0, 8) + '…' : null;

  // Collect all unique addresses to fetch live balances
  const allAddresses = [...new Set([
    ...(wallets || []).map(w => w.classic_address).filter(Boolean),
    inviteWallet?.classic_address,
    effectiveDid?.includes(':') ? effectiveDid.split(':').pop() : null,
  ].filter(Boolean))];

  // Fetch live XRPL balances
  const fetchLiveBalances = async () => {
    if (allAddresses.length === 0) return;
    setLoadingBalances(true);
    try {
      const res = await base44.functions.invoke('xrplProxy', { addresses: allAddresses });
      setLiveBalances(res?.data?.balances || {});
    } catch (_) {}
    setLoadingBalances(false);
  };

  useEffect(() => {
    fetchLiveBalances();
  }, [allAddresses.join(',')]);

  // The user's own DID address — this is what we show as "My DID Balance"
  const myDidAddress = effectiveDid?.includes(':') ? effectiveDid.split(':').pop() : null;
  const myDidLive = myDidAddress ? liveBalances[myDidAddress] : null;
  const myDidBalance = myDidLive?.balance != null
    ? myDidLive.balance
    : (myDidAddress ? (Number((wallets || []).find(w => w.classic_address === myDidAddress)?.balance) || 0) : 0);
  const myDidActive = myDidLive?.active ?? (myDidBalance > 0);
  const publishedCount = (wallets || []).filter(w => w.is_published).length;

  const items = hasInviteSession
    ? [
        { label: 'Wallet ready', value: inviteWallet ? 'Yes' : 'No' },
        { label: 'Wallet funded', value: Number(inviteWallet?.balance || 0) > 0 ? 'Yes' : 'No' },
        { label: 'DID published', value: inviteWallet?.is_published ? 'Yes' : 'Not yet' },
      ]
    : [
        { label: 'Identity', value: identityConnected ? '● Connected' : 'Disconnected', subtitle: shortDid, highlight: identityConnected },
        { label: 'My DID Balance', value: `${myDidBalance.toFixed(2)} XRP`, subtitle: myDidAddress ? myDidAddress.slice(0, 12) + '…' : 'No DID', highlight: myDidActive },
        { label: 'Published DIDs', value: String(publishedCount), subtitle: publishedCount > 0 ? 'On-chain' : 'None yet' },
        { label: 'Transactions', value: String((myTransactions || []).length) },
    ];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">Live status</p>
        <button onClick={fetchLiveBalances} disabled={loadingBalances} className="text-white/30 hover:text-white/60 transition" title="Refresh live balances">
          <RefreshCw className={`w-3.5 h-3.5 ${loadingBalances ? 'animate-spin' : ''}`} />
        </button>
      </div>
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

      {/* Per-address live balance breakdown */}
      {!hasInviteSession && allAddresses.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Balance per address</p>
          {allAddresses.map((addr) => {
            const live = liveBalances[addr];
            const bal = live?.balance != null ? live.balance : ((wallets || []).find(w => w.classic_address === addr)?.balance || 0);
            const isActive = live?.active ?? (bal > 0);
            const walletName = (wallets || []).find(w => w.classic_address === addr)?.name;
            return (
              <div key={addr} className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-2.5 ${
                isActive ? 'border-green-500/20 bg-green-500/5' : 'border-white/10 bg-black/20'
              }`}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono text-white/70 truncate">{addr}</p>
                  {walletName && <p className="text-[10px] text-purple-300/50">{walletName}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-semibold ${isActive ? 'text-green-300' : 'text-white/40'}`}>{Number(bal).toFixed(2)} XRP</p>
                  <p className={`text-[9px] ${isActive ? 'text-green-400/60' : 'text-white/20'}`}>{isActive ? 'Active' : 'Inactive'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}