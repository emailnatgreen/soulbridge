import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { hasAdminAccess } from '@/lib/adminAccess';
import { Link } from 'react-router-dom';
import { Shield, Globe, Wallet, Sparkles, RefreshCw, Plus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VipWalletAssigner from '@/components/vip/VipWalletAssigner';
import VipWalletCard from '@/components/vip/VipWalletCard';
import DexSwapPanel from '@/components/dex/DexSwapPanel';
import SendPanel from '@/components/wallet/SendPanel';
import ReceivePanel from '@/components/wallet/ReceivePanel';
import AxiGuidanceModule from '@/components/vip/AxiGuidanceModule';

export default function VipInviteDashboard() {
  const { user } = useAuth();
  const [identity] = useState(() => {
    try { return JSON.parse(localStorage.getItem('soulbridge_identity') || 'null'); } catch(_) { return null; }
  });
  const identityDid = identity?.did;
  const isAdmin = hasAdminAccess({ user, identityDid });

  const [wallets, setWallets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [treasuryAddresses, setTreasuryAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveBalances, setLiveBalances] = useState({});
  const [rlusdBalances, setRlusdBalances] = useState({});
  const [lastAxiEvent, setLastAxiEvent] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const [allWallets, allAgents, treasuries] = await Promise.all([
      base44.entities.Wallet.list('-created_date', 100).catch(() => []),
      base44.entities.Agent.list('-created_date', 100).catch(() => []),
      base44.entities.Treasury.list('-created_date', 20).catch(() => [])
    ]);
    const tAddresses = (treasuries || []).map(t => t.classic_address).filter(a => a && a !== 'N/A - Legacy Record');
    setTreasuryAddresses(tAddresses);
    const vipOnly = (allWallets || []).filter(w =>
      (w.name && w.name.toLowerCase().includes('vip')) ||
      (w.notes && w.notes.toLowerCase().includes('vip'))
    );
    setWallets(vipOnly);
    setAgents(allAgents || []);
    setLoading(false);

    // Fetch live XRP + RLUSD balances for all VIP wallets in parallel
    const newLive = {};
    const newRlusd = {};
    await Promise.all(vipOnly.map(async (w) => {
      if (!w.classic_address) return;
      const [balRes, tlRes] = await Promise.all([
        base44.functions.invoke('getBalance', { wallet_id: w.id }).catch(() => null),
        base44.functions.invoke('getWalletTrustlines', { wallet_id: w.id }).catch(() => null),
      ]);
      if (balRes?.data?.balance !== undefined) {
        newLive[w.id] = balRes.data.balance;
      }
      const lines = tlRes?.data?.trustlines || [];
      const rlusdLine = lines.find(tl => tl.currency === 'RLUSD' || tl.currency === '524C555344000000000000000000000000000000');
      if (rlusdLine) {
        newRlusd[w.id] = parseFloat(rlusdLine.balance || '0');
      }
    }));
    setLiveBalances(newLive);
    setRlusdBalances(newRlusd);
  };

  useEffect(() => { loadData(); }, []);



  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <Shield className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-white/60">Admin access required</p>
          <Link to="/dashboard" className="text-purple-400 text-sm hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl px-3 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between gap-2 sm:gap-3 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-semibold text-xs sm:text-base truncate">VIP Invite Dashboard</h1>
              <p className="text-amber-400/60 text-[9px] sm:text-xs truncate">Admin · VIP wallets, DIDs & access</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={loadData}
            className="text-[10px] sm:text-xs border-white/20 bg-white/5 text-white hover:bg-white/10 gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0">
            <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Operational Guide */}
        <details className="group bg-white/5 border border-amber-500/20 rounded-2xl overflow-hidden">
          <summary className="flex items-center justify-between cursor-pointer px-4 sm:px-5 py-3 sm:py-4 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">VIP Dashboard — How to Operate</h3>
                <p className="text-amber-400/60 text-[10px]">Full guide · Features · Functions · Operational notes</p>
              </div>
            </div>
            <span className="text-white/30 text-xs group-open:rotate-90 transition-transform">▶</span>
          </summary>
          <div className="px-4 sm:px-5 pb-5 space-y-4 border-t border-white/10 pt-4">

            {/* Operational Funds Notice */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
              <p className="text-green-300 text-sm font-semibold flex items-center gap-2">✅ Pre-Funded Wallet Ready — "Ripple Node 1"</p>
              <p className="text-green-300/70 text-xs mt-1">The wallet <strong className="text-green-200">Ripple Node 1</strong> has already been funded with XRP and is ready to use. Simply click <strong className="text-green-200">"Publish DID to Mainnet"</strong> on its card to publish a DID on-chain in real time — then verify it instantly on <a href="https://xrpscan.com" target="_blank" rel="noopener noreferrer" className="text-green-200 underline hover:text-green-100">XRPScan.com</a>.</p>
            </div>

            {/* Purpose */}
            <div className="space-y-1.5">
              <h4 className="text-white font-semibold text-xs uppercase tracking-widest">📋 Purpose</h4>
              <p className="text-white/60 text-xs leading-relaxed">The VIP Invite Dashboard is the admin command centre for managing privileged wallets within the SoulBridge Village. It provides full visibility over VIP wallet balances, DID publication status, RLUSD trustlines, and cross-wallet operations — all from a single interface.</p>
            </div>

            {/* Features Breakdown */}
            <div className="space-y-3">
              <h4 className="text-white font-semibold text-xs uppercase tracking-widest">⚙️ Features & Functions</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    title: '💳 VIP Wallet Cards',
                    desc: 'Each card displays the wallet name, XRPL address, live XRP and RLUSD balances, DID publication status, linked agent, and role badge. Balances are fetched live from XRPL mainnet on page load and can be manually refreshed.'
                  },
                  {
                    title: '📤 Send Panel',
                    desc: 'Send XRP from any VIP wallet to any XRPL address. Select the source wallet, enter the destination address, amount, and optional destination tag. Treasury wallets are excluded to prevent accidental sends from governance-controlled funds.'
                  },
                  {
                    title: '📥 Receive Panel',
                    desc: 'Displays the XRPL address and QR code for any selected VIP wallet, making it easy to receive XRP or RLUSD payments from external sources or exchanges.'
                  },
                  {
                    title: '🔄 DEX Swap Panel',
                    desc: 'Swap between XRP and RLUSD directly on the XRPL decentralised exchange. Select a VIP wallet, choose the swap direction, enter the amount, and execute. Uses on-chain XRPL DEX order matching.'
                  },
                  {
                    title: '🌐 DID Publication (12 XRP)',
                    desc: 'Each wallet can publish a Decentralised Identifier (DID) to XRPL mainnet. Publishing a DID costs 12 XRP (owner reserve + transaction fees). Once published, the DID is permanently anchored on-chain with a verifiable transaction hash — verify it instantly on XRPScan.com. Click "Publish DID to Mainnet" on any unpublished wallet.'
                  },
                  {
                    title: '🔗 RLUSD Trustline (Manual Only)',
                    desc: 'To hold or swap RLUSD, users must manually activate the RLUSD trustline on their wallet. This is always a deliberate user choice — trustlines are never activated automatically. Click the "Activate RLUSD Trustline" button on any wallet card that does not yet have one enabled.'
                  },
                  {
                    title: '📱 QR Codes (Xaman Import)',
                    desc: 'Toggle the QR icon on any wallet card to reveal two QR codes: (1) the public XRPL address for receiving funds, and (2) the secret seed for importing the wallet into the Xaman (formerly Xumm) mobile app. The seed QR is hidden by default and requires explicit reveal for security.'
                  },
                  {
                    title: '✏️ Wallet Editor',
                    desc: 'Click the pencil icon on any wallet card to edit its name, colour, assigned role, linked agent, and Node DID. Changes are saved directly to the wallet record.'
                  },
                  {
                    title: '➕ Add Wallet to VIP',
                    desc: 'Use the "Add Wallet to VIP" section to assign existing wallets to the VIP pool. Wallets must have "vip" in their name or notes field to appear in this dashboard.'
                  },
                  {
                    title: '📊 Stats Overview',
                    desc: 'The top stats bar shows: total VIP wallets, number of published DIDs, combined XRP balance across all VIP wallets, and combined RLUSD balance. All values are fetched live from the XRPL ledger.'
                  },
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                    <p className="text-white font-medium text-xs mb-1">{item.title}</p>
                    <p className="text-white/50 text-[10px] leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Xaman Import Steps */}
            <div className="space-y-1.5">
              <h4 className="text-white font-semibold text-xs uppercase tracking-widest">📱 How to Import a Wallet into Xaman (Xumm)</h4>
              <ol className="text-white/60 text-xs leading-relaxed list-decimal list-inside space-y-1 pl-1">
                <li>Open the Xaman app on your phone</li>
                <li>Go to <strong className="text-white/80">Settings → Accounts → Add Account</strong></li>
                <li>Select <strong className="text-white/80">Import an existing account</strong></li>
                <li>Choose <strong className="text-white/80">Family Seed / Secret Key</strong></li>
                <li>On the VIP Dashboard, find the wallet card and tap the <strong className="text-white/80">QR icon</strong></li>
                <li>Click <strong className="text-white/80">Reveal</strong> to show the secret seed QR code</li>
                <li>Scan the QR code with Xaman, or copy/paste the seed text</li>
                <li>Xaman will recognise the wallet and add it to your accounts</li>
              </ol>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-2">
                <p className="text-red-300/70 text-[10px]">⚠️ <strong>Security:</strong> Never share your seed with anyone. The seed grants full control of the wallet. Only reveal it on a trusted device in a private setting.</p>
              </div>
            </div>

            {/* Operational Notes */}
            <div className="space-y-1.5">
              <h4 className="text-white font-semibold text-xs uppercase tracking-widest">📌 Operational Notes</h4>
              <ul className="text-white/60 text-xs leading-relaxed list-disc list-inside space-y-1 pl-1">
                <li>All wallets operate on <strong className="text-white/80">XRPL Mainnet</strong> — transactions are real and irreversible</li>
                <li>Minimum XRPL account reserve is <strong className="text-white/80">1 XRP</strong> (base reserve) plus 0.2 XRP per trustline/object</li>
                <li>DID publication costs <strong className="text-white/80">12 XRP</strong> to fully publish on-chain (owner reserves + transaction fees)</li>
                <li>RLUSD trustline activation is <strong className="text-white/80">always manual</strong> — users choose when to enable it; it is never done automatically. Requires 0.2 XRP additional reserve</li>
                <li>Treasury wallets are <strong className="text-white/80">excluded</strong> from the Send panel to protect governance-controlled funds</li>
                <li>Balances refresh automatically on page load and can be manually refreshed per wallet</li>
                <li>Wallets with encrypted seeds (AES-256-GCM) cannot display seed QR codes — only plain-seed wallets support Xaman import via QR</li>
              </ul>
            </div>

          </div>
        </details>

        {/* Axi Interactive Guidance Module */}
        <AxiGuidanceModule
          wallets={wallets}
          liveBalances={liveBalances}
          rlusdBalances={rlusdBalances}
          lastEvent={lastAxiEvent}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: 'VIP Wallets', value: wallets.length },
            { label: 'DIDs Published', value: wallets.filter(w => w.is_published && w.published_txid).length },
            { label: 'Total XRP', value: `${wallets.reduce((s, w) => s + (liveBalances[w.id] ?? w.balance ?? 0), 0).toFixed(2)}` },
            { label: 'Total RLUSD', value: `${Object.values(rlusdBalances).reduce((s, b) => s + b, 0).toFixed(2)}` },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-2.5 sm:p-3 text-center">
              <p className="text-base sm:text-xl font-bold text-white truncate">{s.value}</p>
              <p className="text-white/40 text-[9px] sm:text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Send / Receive / DEX Swap — VIP wallets only, exclude treasury */}
        {(() => {
          const vipUserWallets = wallets.filter(w => !treasuryAddresses.includes(w.classic_address));
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SendPanel wallets={vipUserWallets} />
                <ReceivePanel wallets={vipUserWallets} />
              </div>
              <DexSwapPanel wallets={vipUserWallets} />
            </div>
          );
        })()}

        {/* Admin: Add Wallet to VIP */}
        <VipWalletAssigner
          wallets={wallets}
          agents={agents}
          onComplete={loadData}
        />

        {/* Live VIP Wallets */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-purple-400" /> Live VIP Wallets
            </h2>
            <span className="text-white/30 text-xs">{wallets.length} VIP wallets</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : wallets.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-sm">No wallets found. Use Edit Mode to assign wallets.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wallets.map(wallet => (
                <VipWalletCard
                  key={wallet.id}
                  wallet={wallet}
                  agents={agents}
                  onRefresh={loadData}
                  liveXrpBalance={liveBalances[wallet.id]}
                  liveRlusdBalance={rlusdBalances[wallet.id]}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}