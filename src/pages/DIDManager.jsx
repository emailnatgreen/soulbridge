import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, AlertCircle, RefreshCw, ArrowLeft, Copy, Eye, EyeOff, Plus, Zap, Link2, Zap as ZapIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function DIDManager() {
  const [creating, setCreating] = useState(false);
  const [publishing, setPublishing] = useState(null);
  const [showSeed, setShowSeed] = useState({});
  const [walletName, setWalletName] = useState('Agent01');
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [trustlineLoading, setTrustlineLoading] = useState(null);

  const walletNameOptions = ['Agent01', 'Agent02', 'Agent03', 'Agent04', 'Agent05', 'Guardian01', 'Creator01', 'Trader01', 'Treasury'];

  const { data: wallets = [], isLoading, refetch } = useQuery({
    queryKey: ['did-wallets'],
    queryFn: () => base44.entities.Wallet.list('-created_date', 100),
  });

  const { data: balances = {}, isLoading: balancesLoading } = useQuery({
    queryKey: ['wallet-balances', wallets.map(w => w.id)],
    queryFn: async () => {
      if (wallets.length === 0) return {};
      const result = {};
      await Promise.all(wallets.map(async (wallet) => {
        try {
          const res = await base44.functions.invoke('getBalanceEnhanced', { wallet_id: wallet.id });
          result[wallet.id] = res.data;
        } catch (e) {
          result[wallet.id] = { xrp: 0, rlusd: 0, has_rlusd_trustline: false, trustlines: [], error: true };
        }
      }));
      return result;
    },
    enabled: wallets.length > 0,
  });

  const handleCreateWallet = async () => {
    if (!walletName.trim()) {
      toast.error('Please select a wallet name');
      return;
    }
    setCreating(true);
    try {
      await base44.functions.invoke('createWallet', { name: walletName });
      toast.success(`${walletName} created`);
      setWalletName('Agent01');
      await new Promise(r => setTimeout(r, 500));
      await refetch();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to create wallet');
    } finally {
      setCreating(false);
    }
  };

  const handlePublishDID = async (walletId) => {
    setPublishing(walletId);
    try {
      await base44.functions.invoke('publishDID', { wallet_id: walletId });
      toast.success('DID published successfully');
      await refetch();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to publish DID');
    } finally {
      setPublishing(null);
    }
  };

  const handleAddTrustline = async (walletId, assetCode) => {
    setTrustlineLoading({ walletId, assetCode });
    try {
      await base44.functions.invoke('addRLUSDTrustline', { wallet_id: walletId });
      toast.success(`${assetCode} trustline added`);
      await refetch();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to add trustline');
    } finally {
      setTrustlineLoading(null);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const toggleShowSeed = (walletId) => {
    setShowSeed(prev => ({ ...prev, [walletId]: !prev[walletId] }));
  };

  const publishedCount = wallets.filter(w => w.is_published).length;
  const unpublishedCount = wallets.length - publishedCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <Link to="/home" className="inline-flex items-center text-purple-300 hover:text-purple-200 text-sm mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-purple-400" />
              <h1 className="text-3xl font-bold text-white">DID Manager</h1>
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/60">Total Wallets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{wallets.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-400">DIDs Published</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-400">{publishedCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-400">Pending Publication</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-400">{unpublishedCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Create New Wallet */}
        <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-500/30 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New DID Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <select
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                className="flex-1 bg-white/20 border border-purple-500/50 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-400 focus:bg-white/25"
              >
                {walletNameOptions.map(name => (
                  <option key={name} value={name} className="bg-slate-900">{name}</option>
                ))}
              </select>
              <button
                onClick={handleCreateWallet}
                disabled={creating}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50 font-semibold"
              >
                {creating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap className="w-4 h-4" />}
                Create
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Wallets List */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Wallet DIDs & Management</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            ) : wallets.length === 0 ? (
              <p className="text-white/40 text-center py-8">No wallets found. Create one above.</p>
            ) : (
              <div className="space-y-4">
                {wallets.map(wallet => {
                  const balance = balances[wallet.id] || {};
                  return (
                    <div key={wallet.id} className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-semibold">{wallet.name || 'Unnamed'}</h3>
                            {wallet.is_published ? (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Published
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </div>
                        </div>
                        {!wallet.is_published && (
                          <button
                            onClick={() => handlePublishDID(wallet.id)}
                            disabled={publishing === wallet.id}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                          >
                            {publishing === wallet.id ? 'Publishing...' : 'Publish DID'}
                          </button>
                        )}
                      </div>

                      {/* Address */}
                      <div className="bg-black/30 rounded-lg p-3">
                        <p className="text-white/40 text-xs mb-1">Classic Address (DID)</p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-white/70 text-sm font-mono truncate">{wallet.classic_address}</p>
                          <button
                            onClick={() => copyToClipboard(wallet.classic_address, 'Address')}
                            className="text-purple-400 hover:text-purple-300 transition flex-shrink-0"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Balances */}
                      {!balancesLoading && balance && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-black/30 rounded-lg p-3">
                              <p className="text-white/40 text-xs mb-1">XRP Balance</p>
                              <p className="text-white text-base font-mono font-bold">{balance.xrp || 0}</p>
                              <p className="text-white/40 text-xs mt-1">Available: {balance.available_xrp || 0}</p>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <p className="text-white/40 text-xs mb-1">rLUSD Balance</p>
                              <p className="text-white text-base font-mono font-bold">{balance.rlusd || 0}</p>
                              <p className={`text-xs mt-1 ${balance.has_rlusd_trustline ? 'text-green-400' : 'text-amber-400'}`}>
                                {balance.has_rlusd_trustline ? '✓ Trustline Active' : '✗ No Trustline'}
                              </p>
                            </div>
                          </div>
                          {balance.trustlines && balance.trustlines.length > 0 && (
                            <div className="bg-black/30 rounded-lg p-3">
                              <p className="text-white/40 text-xs mb-2">All Trustlines ({balance.trustlines.length})</p>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {balance.trustlines.map((tl, idx) => (
                                  <div key={idx} className="text-xs text-white/60 font-mono">
                                    <span className="text-white">{tl.currency}</span> • {parseFloat(tl.balance).toFixed(2)} / {parseFloat(tl.limit).toFixed(0)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Trustline Management */}
                      {!balance.has_rlusd_trustline && (
                        <button
                          onClick={() => handleAddTrustline(wallet.id, 'rLUSD')}
                          disabled={trustlineLoading?.walletId === wallet.id}
                          className="w-full flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                        >
                          {trustlineLoading?.walletId === wallet.id ? (
                            <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-300 rounded-full animate-spin" />
                          ) : (
                            <Link2 className="w-4 h-4" />
                          )}
                          Add rLUSD Trustline
                        </button>
                      )}

                      {/* Seed (encrypted) */}
                      {wallet.encrypted_seed && (
                        <div className="bg-black/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-white/40 text-xs">Encrypted Seed</p>
                            <button
                              onClick={() => toggleShowSeed(wallet.id)}
                              className="text-purple-400 hover:text-purple-300 transition"
                            >
                              {showSeed[wallet.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-white/70 text-sm font-mono truncate">
                              {showSeed[wallet.id] ? wallet.encrypted_seed : '••••••••••••••••'}
                            </p>
                            {showSeed[wallet.id] && (
                              <button
                                onClick={() => copyToClipboard(wallet.encrypted_seed, 'Seed')}
                                className="text-purple-400 hover:text-purple-300 transition flex-shrink-0"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Publication Details */}
                      {wallet.is_published && wallet.published_txid && (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                          <p className="text-green-400/60 text-xs mb-1">Published TX Hash</p>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-green-400 text-sm font-mono truncate">{wallet.published_txid}</p>
                            <button
                              onClick={() => copyToClipboard(wallet.published_txid, 'TX Hash')}
                              className="text-green-400 hover:text-green-300 transition flex-shrink-0"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}