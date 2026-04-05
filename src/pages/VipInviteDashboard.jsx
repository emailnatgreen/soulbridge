import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { hasAdminAccess } from '@/lib/adminAccess';
import { Link } from 'react-router-dom';
import { Shield, Globe, Wallet, ArrowRight, Sparkles, ExternalLink, RefreshCw, Plus, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VipWalletAssigner from '@/components/vip/VipWalletAssigner';
import VipWalletCard from '@/components/vip/VipWalletCard';

export default function VipInviteDashboard() {
  const { user } = useAuth();
  const [identity] = useState(() => {
    try { return JSON.parse(localStorage.getItem('soulbridge_identity') || 'null'); } catch(_) { return null; }
  });
  const identityDid = identity?.did;
  const isAdmin = hasAdminAccess({ user, identityDid });

  const [inviteTokens, setInviteTokens] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [tokens, allWallets] = await Promise.all([
      base44.entities.InvitationToken.list('-created_date', 50).catch(() => []),
      base44.entities.Wallet.list('-created_date', 100).catch(() => []),
    ]);
    setInviteTokens(tokens || []);
    setWallets(allWallets || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Match wallets to invite tokens by name/notes
  const getWalletForToken = (token) => {
    return wallets.find(w =>
      w.name?.toLowerCase().includes(token.recipient_nickname?.toLowerCase() || '___') ||
      w.notes?.includes(token.id)
    );
  };

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
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl px-4 sm:px-6 py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between gap-3 max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h1 className="text-white font-semibold text-sm sm:text-base">VIP Invite Dashboard</h1>
              <p className="text-amber-400/60 text-[10px] sm:text-xs">Admin · Manage VIP wallets, DIDs & invite access</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditMode(!editMode)}
              className="text-xs border-white/20 bg-white/5 text-white hover:bg-white/10 gap-1.5">
              {editMode ? <Eye className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {editMode ? 'View Mode' : 'Edit Mode'}
            </Button>
            <Button size="sm" variant="outline" onClick={loadData}
              className="text-xs border-white/20 bg-white/5 text-white hover:bg-white/10 gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'VIP Invites', value: inviteTokens.length, color: 'amber' },
            { label: 'Wallets Assigned', value: wallets.filter(w => w.notes?.includes('VIP') || w.name?.toLowerCase().includes('vip')).length, color: 'purple' },
            { label: 'DIDs Published', value: wallets.filter(w => w.is_published).length, color: 'green' },
            { label: 'Total Balance', value: `${wallets.reduce((s, w) => s + (w.balance || 0), 0).toFixed(2)} XRP`, color: 'blue' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <p className="text-lg sm:text-xl font-bold text-white">{s.value}</p>
              <p className="text-white/40 text-[10px] sm:text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Admin: Add Wallet to VIP */}
        {editMode && (
          <VipWalletAssigner
            inviteTokens={inviteTokens}
            wallets={wallets}
            onComplete={loadData}
          />
        )}

        {/* Live VIP Wallets */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-purple-400" /> Live VIP Wallets
            </h2>
            <span className="text-white/30 text-xs">{wallets.length} total wallets</span>
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
                  editMode={editMode}
                  onRefresh={loadData}
                />
              ))}
            </div>
          )}
        </div>

        {/* Invite Tokens List */}
        <div>
          <h2 className="text-white font-semibold text-sm flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-amber-400" /> Invite Tokens
          </h2>
          {inviteTokens.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">No invite tokens found.</p>
          ) : (
            <div className="space-y-2">
              {inviteTokens.slice(0, 20).map(token => {
                const linkedWallet = getWalletForToken(token);
                return (
                  <div key={token.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">{token.recipient_nickname || 'Unnamed'}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${
                          token.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          token.status === 'used' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          'bg-white/10 text-white/40 border-white/15'
                        }`}>{token.status || 'pending'}</span>
                      </div>
                      <p className="text-white/30 text-[10px] font-mono">{token.id}</p>
                    </div>
                    {linkedWallet && (
                      <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg">
                        Wallet linked
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}