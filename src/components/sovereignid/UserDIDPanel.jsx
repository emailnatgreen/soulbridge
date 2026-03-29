import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, Copy, CheckCircle, AlertCircle, Globe, Zap, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DidVerificationBadge from '@/components/sovereignid/DidVerificationBadge';
import DidVerificationCertificate from '@/components/sovereignid/DidVerificationCertificate';

export default function UserDIDPanel({ wallets }) {
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(null);
  const [verifyResult, setVerifyResult] = useState({});
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    base44.entities.Agent.list().then(setAgents).catch(() => {});
  }, []);

  const isPublished = (w) => w.is_published || !!w.published_txid || !!w.published_at;
  const publishedWallets = wallets.filter(w => isPublished(w));
  const unpublishedWallets = wallets.filter(w => !isPublished(w));

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

  const getLinkedAgent = (walletId) => agents.find(a => a.wallet_id === walletId);

  if (wallets.length === 0) {
    return (
      <div className="text-center py-16">
        <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No DID Found</h3>
        <p className="text-slate-400">Your sovereign identity will appear here once set up.</p>
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

      {publishedWallets.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" /> Active Published DIDs
          </h2>
          <div className="space-y-4">
            {publishedWallets.map(wallet => {
              const linkedAgent = getLinkedAgent(wallet.id);
              const didUrl = `https://soulbridge.base44.app/SharedDidView?address=${wallet.classic_address}`;
              const currentVerifyResult = verifyResult[wallet.id];
              const isVerified = !!currentVerifyResult && !currentVerifyResult.error && currentVerifyResult.verification?.did_active;
              return (
                <div key={wallet.id} className="bg-slate-900 border border-green-800/30 rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="font-semibold text-white">{wallet.name || 'Primary Wallet'}</span>
                        <Badge className="bg-green-900/50 text-green-400 border-green-700/50 text-xs">{wallet.network}</Badge>
                        {isVerified && <DidVerificationBadge />}
                      </div>
                      <div className="font-mono text-sm text-purple-300 break-all">did:xrpl:1:{wallet.classic_address}</div>
                    </div>
                    <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs">Balance hidden</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="bg-slate-800 rounded-lg p-3">
                      <div className="text-slate-400 text-xs mb-1">Classic Address</div>
                      <div className="font-mono text-white text-xs break-all">{wallet.classic_address}</div>
                    </div>
                    {wallet.published_at && (
                      <div className="bg-slate-800 rounded-lg p-3">
                        <div className="text-slate-400 text-xs mb-1">Published</div>
                        <div className="text-white text-xs">{new Date(wallet.published_at).toLocaleDateString()}</div>
                      </div>
                    )}
                  </div>

                  {linkedAgent ? (
                    <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-3 flex items-center gap-3">
                      <User className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-purple-300">{linkedAgent.name}</div>
                        <div className="text-xs text-slate-400">{linkedAgent.role} · {linkedAgent.status}</div>
                      </div>
                      <Badge className="ml-auto bg-purple-900/50 text-purple-400 border-purple-700/50 text-xs">Agent Linked</Badge>
                    </div>
                  ) : (
                    <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      <span className="text-sm text-amber-300">No agent linked to this DID</span>
                    </div>
                  )}

                  {currentVerifyResult && (
                    <div className={`rounded-lg p-3 text-sm ${currentVerifyResult.error ? 'bg-red-900/30 border border-red-700/50 text-red-400' : 'bg-green-900/30 border border-green-700/50 text-green-300'}`}>
                      {currentVerifyResult.error ? `Error: ${currentVerifyResult.error}` : '✅ DID Active on XRPL'}
                    </div>
                  )}

                  {isVerified && <DidVerificationCertificate wallet={wallet} verification={currentVerifyResult.verification} />}

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs gap-1" onClick={() => copyDID(wallet.classic_address)}>
                      {copied === wallet.classic_address ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      {copied === wallet.classic_address ? 'Copied!' : 'Copy DID'}
                    </Button>
                    <Button size="sm" variant="outline" className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs gap-1" onClick={() => window.open(didUrl, '_blank')}>
                      <Globe className="w-3 h-3" /> View Public Profile
                    </Button>
                    <Button size="sm" variant="outline" className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs gap-1" onClick={() => verifyDID(wallet)} disabled={verifying === wallet.id}>
                      <Zap className="w-3 h-3" /> {verifying === wallet.id ? 'Verifying...' : 'Verify On-Chain'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {unpublishedWallets.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" /> Wallets Without Published DID
          </h2>
          <div className="space-y-3">
            {unpublishedWallets.map(wallet => (
              <div key={wallet.id} className="bg-slate-900 border border-amber-800/30 rounded-xl p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-white">{wallet.name || 'Unnamed Wallet'}</div>
                  <div className="text-sm text-slate-400 font-mono">{wallet.classic_address}</div>
                  <Badge variant="outline" className="mt-1 border-amber-600/50 text-amber-400 text-xs">Not Published</Badge>
                </div>
                <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs">Balance hidden</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}