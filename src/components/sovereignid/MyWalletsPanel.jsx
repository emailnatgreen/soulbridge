import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Wallet, RefreshCw, Trash2, ExternalLink, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BRAID_MAP } from '@/lib/braidNodes';

export default function MyWalletsPanel({ user, wallets, onRefresh }) {
  const [refreshing, setRefreshing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  async function refreshBalance(wallet) {
    setRefreshing(wallet.id);
    try {
      await base44.functions.invoke('getBalance', { wallet_id: wallet.id });
      await onRefresh();
    } catch (e) {}
    setRefreshing(null);
  }

  async function removeWallet(wallet) {
    setRemoving(wallet.id);
    try {
      await base44.entities.Wallet.delete(wallet.id);
      await onRefresh();
    } catch (e) {}
    setRemoving(null);
    setConfirmRemove(null);
  }

  if (wallets.length === 0) {
    return (
      <div className="text-center py-16">
        <Wallet className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No Wallets Linked</h3>
        <p className="text-slate-400">Create or link your first XRPL wallet to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-white">My XRPL Wallets</h2>
        <span className="text-sm text-slate-400">{wallets.length} wallet{wallets.length !== 1 ? 's' : ''}</span>
      </div>

      {wallets.map(wallet => {
        const node = BRAID_MAP[wallet.classic_address];
        return (
          <div key={wallet.id} className={`bg-slate-900 border rounded-xl overflow-hidden ${node ? 'border-purple-600/40' : 'border-slate-800'}`}>
            {node && (
              <div className="px-5 pt-3 flex items-center gap-2 border-b border-slate-800/60 pb-2">
                <span className="text-base">{node.emoji}</span>
                <span className="text-sm font-semibold text-slate-200">{node.name}</span>
                <Badge className="bg-purple-900/40 text-purple-300 border-purple-700/40 text-xs">Constitutional Node</Badge>
              </div>
            )}
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{wallet.name || 'Unnamed Wallet'}</h3>
                    <Badge className={wallet.network === 'mainnet'
                      ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50 text-xs'
                      : 'bg-amber-900/50 text-amber-400 border-amber-700/50 text-xs'}>
                      {wallet.network}
                    </Badge>
                    {wallet.is_published && (
                      <Badge className="bg-purple-900/50 text-purple-400 border-purple-700/50 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />DID Published
                      </Badge>
                    )}
                  </div>
                  <div className="font-mono text-sm text-slate-400 break-all">{wallet.classic_address}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-white">{wallet.balance || 0}</div>
                  <div className="text-xs text-slate-400">XRP</div>
                </div>
              </div>

              {wallet.notes && (
                <div className="text-sm text-slate-400 mb-4 bg-slate-800/50 rounded-lg p-3">{wallet.notes}</div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {wallet.published_at && (
                  <div className="bg-slate-800 rounded-lg p-2">
                    <div className="text-slate-500 mb-0.5">Published</div>
                    <div className="text-white">{new Date(wallet.published_at).toLocaleDateString()}</div>
                  </div>
                )}
                {wallet.last_accessed && (
                  <div className="bg-slate-800 rounded-lg p-2">
                    <div className="text-slate-500 mb-0.5">Last Access</div>
                    <div className="text-white">{new Date(wallet.last_accessed).toLocaleDateString()}</div>
                  </div>
                )}
                <div className="bg-slate-800 rounded-lg p-2">
                  <div className="text-slate-500 mb-0.5">DID Status</div>
                  <div className={wallet.is_published ? 'text-green-400' : 'text-amber-400'}>
                    {wallet.is_published ? 'Active' : 'Not Published'}
                  </div>
                </div>
                {wallet.published_txid && (
                  <div className="bg-slate-800 rounded-lg p-2">
                    <div className="text-slate-500 mb-0.5">TX ID</div>
                    <div className="text-white truncate">{wallet.published_txid.slice(0, 10)}...</div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-800 px-5 py-3 flex flex-wrap gap-2 bg-slate-900/50">
              <Button size="sm" variant="outline" className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs gap-1"
                onClick={() => refreshBalance(wallet)} disabled={refreshing === wallet.id}>
                <RefreshCw className={`w-3 h-3 ${refreshing === wallet.id ? 'animate-spin' : ''}`} />
                Refresh Balance
              </Button>
              <Button size="sm" variant="outline" className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs gap-1"
                onClick={() => window.open(`https://livenet.xrpl.org/accounts/${wallet.classic_address}`, '_blank')}>
                <ExternalLink className="w-3 h-3" /> View on XRPL
              </Button>
              {confirmRemove === wallet.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-400">Confirm removal?</span>
                  <Button size="sm" variant="destructive" className="text-xs h-7"
                    onClick={() => removeWallet(wallet)} disabled={removing === wallet.id}>
                    {removing === wallet.id ? 'Removing...' : 'Yes, Remove'}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs h-7 text-slate-400"
                    onClick={() => setConfirmRemove(null)}>Cancel</Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/20 text-xs gap-1"
                  onClick={() => setConfirmRemove(wallet.id)}>
                  <Trash2 className="w-3 h-3" /> Remove
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}