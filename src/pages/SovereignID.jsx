import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Shield, Wallet, Plus, Activity, Lock, ArrowLeft, Home } from 'lucide-react';
import WidgetPageNavBar from '@/components/widgets/WidgetPageNavBar';
import AxiNFTExplainer from '@/components/widgets/AxiNFTExplainer';
import MyDIDPanel from '@/components/sovereignid/MyDIDPanel';
import MyWalletsPanel from '@/components/sovereignid/MyWalletsPanel';
import UserDIDPanel from '@/components/sovereignid/UserDIDPanel';
import UserWalletsPanel from '@/components/sovereignid/UserWalletsPanel';
import CreateLinkDIDPanel from '@/components/sovereignid/CreateLinkDIDPanel';
import SecurityPrivacyPanel from '@/components/sovereignid/SecurityPrivacyPanel';
import ActivityLogPanel from '@/components/sovereignid/ActivityLogPanel';

const ADMIN_TABS = [
  { id: 'did', label: 'My DID', icon: Shield },
  { id: 'wallets', label: 'My Wallets', icon: Wallet },
  { id: 'create', label: 'Create / Link DID', icon: Plus },
  { id: 'security', label: 'Security & Privacy', icon: Lock },
  { id: 'activity', label: 'Activity Log', icon: Activity },
];

const USER_TABS = [
  { id: 'did', label: 'My DID', icon: Shield },
  { id: 'wallets', label: 'My Wallets', icon: Wallet },
  { id: 'security', label: 'Security & Privacy', icon: Lock },
  { id: 'activity', label: 'Activity Log', icon: Activity },
];

export default function SovereignID() {
  const [activeTab, setActiveTab] = useState('did');
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const me = await base44.auth.me();
    setUser(me);
    if (me) {
      const allWallets = await base44.entities.Wallet.list('-created_date', 200);
      const ws = allWallets.filter(w =>
        w.classic_address && w.owner_id === me.id
      );
      setWallets(ws);
    }
    setLoading(false);
  }

  const publishedWallet = wallets.find(w => w.is_published);
  const isAdmin = user?.role === 'admin';
  const visibleTabs = isAdmin ? ADMIN_TABS : USER_TABS;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <WidgetPageNavBar
        title="Sovereign Identity"
        subtitle="DID · Wallets · Privacy · Certificates"
        icon={Shield}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-purple-950 border-b border-slate-800 px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Sovereign Identity</h1>
                <p className="text-slate-400 text-sm">Your personal DID, certificates, wallets, and privacy controls</p>
              </div>
            </div>
          </div>
          {publishedWallet && (
            <div className="mt-3 inline-flex items-center gap-2 bg-green-900/30 border border-green-700/50 rounded-full px-4 py-1.5 text-sm text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              DID Active · {publishedWallet.classic_address?.slice(0, 8)}...{publishedWallet.classic_address?.slice(-6)}
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto py-2">
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                    active
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-900/30 to-slate-900 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-purple-300/60 mb-2">Private identity space</p>
          <h2 className="text-xl font-semibold text-white">Only your identity details are shown here</h2>
          <p className="text-sm text-slate-400 mt-2">This page is focused on your own DID records, wallet activity, verification certificates, and privacy settings.</p>
        </div>
        {activeTab === 'did' && (isAdmin ? <MyDIDPanel user={user} wallets={wallets} onRefresh={loadData} /> : <UserDIDPanel wallets={wallets} />)}
        {activeTab === 'wallets' && (isAdmin ? <MyWalletsPanel user={user} wallets={wallets} onRefresh={loadData} /> : <UserWalletsPanel wallets={wallets} />)}
        {activeTab === 'create' && isAdmin && <CreateLinkDIDPanel user={user} wallets={wallets} onRefresh={loadData} onTabChange={setActiveTab} />}
        {activeTab === 'security' && <SecurityPrivacyPanel user={user} wallets={wallets} />}
        {activeTab === 'activity' && <ActivityLogPanel user={user} wallets={wallets} />}

        {/* Axi NFT Explainer */}
        <AxiNFTExplainer
          featureName="Sovereign Identity"
          featurePath="wallet.did_linking"
          widgetName="DID Linking Widget"
          nftId="WIDGET-WM-007"
          description="Manage your Decentralised Identity — view your DID, link wallets, manage certificates, and control privacy settings. Your DID is the sovereign anchor of everything in SoulBridge."
          isUnlocked={!!publishedWallet}
          setupSteps={[
            'Create or import an XRPL wallet from the Wallets page or DID Manager.',
            'Publish your DID on XRPL mainnet — this makes your identity permanent and verifiable.',
            'Once published, your DID unlocks access to governance, agents, skills, and the Kinetic Grid.',
            'Manage certificates, privacy settings, and activity logs from this hub.',
            'Widget NFTs can gate advanced features like DID linking, custom signatures, and multi-sig.',
          ]}
        />
      </div>
    </div>
  );
}