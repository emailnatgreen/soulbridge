import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Shield, Wallet, Plus, Activity, Lock, ChevronRight, ArrowLeft, Home } from 'lucide-react';
import MyDIDPanel from '@/components/sovereignid/MyDIDPanel';
import MyWalletsPanel from '@/components/sovereignid/MyWalletsPanel';
import CreateLinkDIDPanel from '@/components/sovereignid/CreateLinkDIDPanel';
import SecurityPrivacyPanel from '@/components/sovereignid/SecurityPrivacyPanel';
import ActivityLogPanel from '@/components/sovereignid/ActivityLogPanel';

const TABS = [
  { id: 'did', label: 'My DID', icon: Shield },
  { id: 'wallets', label: 'My Wallets', icon: Wallet },
  { id: 'create', label: 'Create / Link DID', icon: Plus },
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
      const ws = await base44.entities.Wallet.filter({ owner_id: me.id }, '-created_date', 50);
      setWallets(ws);
    }
    setLoading(false);
  }

  const publishedWallet = wallets.find(w => w.is_published);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
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
                <p className="text-slate-400 text-sm">Your self-sovereign DID & XRPL wallet management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/dashboard"
                className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
                <ArrowLeft className="w-4 h-4" /> SoulBridge Dashboard
              </Link>
              <Link to="/Home"
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
                <Home className="w-4 h-4" /> Village Home
              </Link>
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
            {TABS.map(tab => {
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
        {activeTab === 'did' && <MyDIDPanel user={user} wallets={wallets} onRefresh={loadData} />}
        {activeTab === 'wallets' && <MyWalletsPanel user={user} wallets={wallets} onRefresh={loadData} />}
        {activeTab === 'create' && <CreateLinkDIDPanel user={user} wallets={wallets} onRefresh={loadData} onTabChange={setActiveTab} />}
        {activeTab === 'security' && <SecurityPrivacyPanel user={user} wallets={wallets} />}
        {activeTab === 'activity' && <ActivityLogPanel user={user} wallets={wallets} />}
      </div>
    </div>
  );
}