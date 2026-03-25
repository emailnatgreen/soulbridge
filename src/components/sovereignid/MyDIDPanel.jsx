import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, Copy, CheckCircle, ExternalLink, AlertCircle, Globe, Key, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function MyDIDPanel({ user, wallets, onRefresh }) {
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(null);
  const [verifyResult, setVerifyResult] = useState({});

  const publishedWallets = wallets.filter(w => w.is_published);
  const unpublishedWallets = wallets.filter(w => !w.is_published);

  function copyDID(address) {
    const did = `did:xrpl:1:${address}`;
    navigator.clipboard.writeText(did);
    setCopied(address);
    setTimeout(() => setCopied(false), 2000);
  }

  async function verifyDID(wallet) {
    setVerifying(wallet.id);
    try {
      const res = await base44.functions.invoke('verifyDIDStatus', {
        classic_address: wallet.classic_address,
        network: wallet.network
      });
      setVerifyResult(prev => ({ ...prev, [wallet.id]: res.data }));
    } catch (e) {
      setVerifyResult(prev => ({ ...prev, [wallet.id]: { error: e.message } }));
    }
    setVerifying(null);
  }

  if (wallets.length === 0) {
    return (
      <div className="text-center py-16">
        <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No DID Found</h3>
        <p className="text-slate-400 mb-6">You haven't created a Decentralised Identifier yet. Your sovereign identity starts here.</p>
        <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => {}}>
          Create My First DID
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{wallets.length}</div>
          <div className="text-slate-400 text-sm">Total Wallets</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{publishedWallets.length}</div>
          <div className="text-slate-400 text-sm">Published DIDs</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{unpublishedWallets.length}</div>
          <div className="text-slate-400 text-sm">Unpublished</div>
        </div>
      </div>

      {/* Published DIDs */}
      {publishedWallets.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" /> Active Published DIDs
          </h2>
          <div className="space-y-4">
            {publishedWallets.map(wallet => (
              <WalletDIDCard
                key={wallet.id}
                wallet={wallet}
                copied={copied}
                onCopy={copyDID}
                onVerify={verifyDID}
                verifying={verifying === wallet.id}
                verifyResult={verifyResult[wallet.id]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unpublished */}
      {unpublishedWallets.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" /> Wallets Without Published DID
          </h2>
          <div className="space-y-3">
            {unpublishedWallets.map(wallet => (
              <div key={wallet.id} className="bg-slate-900 border border-amber-800/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">{wallet.name || 'Unnamed Wallet'}</div>
                  <div className="text-sm text-slate-400 font-mono">{wallet.classic_address}</div>
                  <Badge variant="outline" className="mt-1 border-amber-600/50 text-amber-400 text-xs">Not Published</Badge>
                </div>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-xs">
                  Publish DID
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WalletDIDCard({ wallet, copied, onCopy, onVerify, verifying, verifyResult }) {
  const did = `did:xrpl:1:${wallet.classic_address}`;
  const didUrl = `https://soulbridge.base44.app/SharedDidView?address=${wallet.classic_address}`;

  return (
    <div className="bg-slate-900 border border-green-800/30 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="font-semibold text-white">{wallet.name || 'Primary Wallet'}</span>
            <Badge className="bg-green-900/50 text-green-400 border-green-700/50 text-xs">
              {wallet.network}
            </Badge>
          </div>
          <div className="font-mono text-sm text-purple-300 break-all">{did}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="bg-slate-800 rounded-lg p-3">
          <div className="text-slate-400 text-xs mb-1">Classic Address</div>
          <div className="font-mono text-white text-xs break-all">{wallet.classic_address}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-3">
          <div className="text-slate-400 text-xs mb-1">XRP Balance</div>
          <div className="text-white font-semibold">{wallet.balance || 0} XRP</div>
        </div>
        {wallet.published_at && (
          <div className="bg-slate-800 rounded-lg p-3">
            <div className="text-slate-400 text-xs mb-1">Published</div>
            <div className="text-white text-xs">{new Date(wallet.published_at).toLocaleDateString()}</div>
          </div>
        )}
        {wallet.published_txid && (
          <div className="bg-slate-800 rounded-lg p-3">
            <div className="text-slate-400 text-xs mb-1">TX ID</div>
            <div className="font-mono text-white text-xs truncate">{wallet.published_txid}</div>
          </div>
        )}
      </div>

      {verifyResult && (
        <div className={`rounded-lg p-3 text-sm ${verifyResult.error ? 'bg-red-900/30 border border-red-700/50 text-red-400' : 'bg-green-900/30 border border-green-700/50 text-green-300'}`}>
          {verifyResult.error ? `Error: ${verifyResult.error}` : (
            <div className="space-y-1">
              <div>✅ DID Active on XRPL</div>
              {verifyResult.balance && <div>Balance: {verifyResult.balance} XRP</div>}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:text-white text-xs gap-1"
          onClick={() => onCopy(wallet.classic_address)}>
          {copied === wallet.classic_address ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copied === wallet.classic_address ? 'Copied!' : 'Copy DID'}
        </Button>
        <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:text-white text-xs gap-1"
          onClick={() => window.open(didUrl, '_blank')}>
          <Globe className="w-3 h-3" /> View Public Profile
        </Button>
        <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:text-white text-xs gap-1"
          onClick={() => onVerify(wallet)} disabled={verifying}>
          <Zap className="w-3 h-3" /> {verifying ? 'Verifying...' : 'Verify On-Chain'}
        </Button>
      </div>
    </div>
  );
}