import React from 'react';
import { Wallet, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BRAID_MAP } from '@/lib/braidNodes';

export default function UserWalletsPanel({ wallets }) {
  if (wallets.length === 0) {
    return (
      <div className="text-center py-16">
        <Wallet className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No Wallets Linked</h3>
        <p className="text-slate-400">Your linked wallets will appear here.</p>
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
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs">Balance hidden</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
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
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}