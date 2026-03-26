import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, User, Copy, CheckCircle, AlertCircle, ExternalLink, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { BRAID_NODES as CANONICAL_NODES, BRAID_MAP as ADDRESS_MAP } from '@/lib/braidNodes';

const CARD_STYLES = {
  white:  'border-slate-300 bg-slate-800/30 shadow-[0_0_12px_rgba(148,163,184,0.15)]',
  red:    'border-red-500 bg-red-950/30 shadow-[0_0_12px_rgba(239,68,68,0.2)]',
  amber:  'border-amber-500 bg-amber-950/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
  yellow: 'border-yellow-400 bg-yellow-950/30 shadow-[0_0_12px_rgba(250,204,21,0.2)]',
  green:  'border-green-500 bg-green-950/30 shadow-[0_0_12px_rgba(34,197,94,0.2)]',
  blue:   'border-blue-500 bg-blue-950/30 shadow-[0_0_12px_rgba(59,130,246,0.2)]',
  purple: 'border-purple-500 bg-purple-950/30 shadow-[0_0_12px_rgba(168,85,247,0.2)]',
  gray:   'border-gray-400 bg-gray-800/30 shadow-[0_0_12px_rgba(156,163,175,0.15)]',
};

const BADGE_STYLES = {
  white:  'bg-slate-700 text-slate-100 border-slate-400',
  red:    'bg-red-900 text-red-200 border-red-500',
  amber:  'bg-amber-900 text-amber-200 border-amber-500',
  yellow: 'bg-yellow-900 text-yellow-100 border-yellow-400',
  green:  'bg-green-900 text-green-200 border-green-500',
  blue:   'bg-blue-900 text-blue-200 border-blue-500',
  purple: 'bg-purple-900 text-purple-200 border-purple-500',
  gray:   'bg-gray-800 text-gray-200 border-gray-400',
};

export default function ConstitutionalDIDsPanel() {
  const [wallets, setWallets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);
  const [verifying, setVerifying] = useState(null);
  const [verifyResults, setVerifyResults] = useState({});

  useEffect(() => {
    Promise.all([
      base44.entities.Wallet.list('-created_date', 200),
      base44.entities.Agent.list(),
    ]).then(([ws, ags]) => {
      setWallets(ws.filter(w => w.classic_address && ADDRESS_MAP[w.classic_address]));
      setAgents(ags);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const getLinkedAgent = (walletId) => agents.find(a => a.wallet_id === walletId);
  const isPublished = (w) => w.is_published || !!w.published_txid || !!w.published_at;

  function copyDID(address) {
    navigator.clipboard.writeText(`did:xrpl:1:${address}`);
    setCopied(address);
    setTimeout(() => setCopied(null), 2000);
  }

  async function verifyDID(wallet) {
    setVerifying(wallet.id);
    try {
      const res = await base44.functions.invoke('verifyDIDStatus', {
        classic_address: wallet.classic_address,
        network: wallet.network
      });
      setVerifyResults(prev => ({ ...prev, [wallet.id]: res.data }));
    } catch (e) {
      setVerifyResults(prev => ({ ...prev, [wallet.id]: { error: e.message } }));
    }
    setVerifying(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  // Build display list: canonical order, merged with wallet data if found
  const displayNodes = CANONICAL_NODES.map(node => ({
    ...node,
    wallet: wallets.find(w => w.classic_address === node.address) || null,
  }));

  const foundCount = displayNodes.filter(n => n.wallet).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-400" /> Core Constitutional DIDs — The 8-Node Braid
        </h2>
        <p className="text-slate-400 text-sm">
          {foundCount} of {CANONICAL_NODES.length} nodes found in wallet registry · all 8 canonical addresses shown.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayNodes.map(({ address, name, emoji, color, wallet }) => {
          const cardClass = CARD_STYLES[color];
          const badgeClass = BADGE_STYLES[color];
          const published = wallet ? isPublished(wallet) : false;
          const agent = wallet ? getLinkedAgent(wallet.id) : null;
          const did = `did:xrpl:1:${address}`;
          const verifyResult = wallet ? verifyResults[wallet.id] : null;

          return (
            <div key={address} className={`border-2 rounded-xl p-5 space-y-4 ${cardClass}`}>
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <span className="text-xl">{emoji}</span>
                    <span className={`font-bold ${color === 'white' ? 'text-slate-200' : color === 'red' ? 'text-red-300' : color === 'amber' ? 'text-amber-300' : color === 'yellow' ? 'text-yellow-300' : color === 'green' ? 'text-green-300' : color === 'blue' ? 'text-blue-300' : color === 'purple' ? 'text-purple-300' : 'text-gray-300'}`}>{name}</span>
                  </h3>
                  {wallet?.name && wallet.name !== name && (
                    <p className="text-slate-500 text-xs mt-0.5 ml-7">{wallet.name}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge className={`text-xs ${badgeClass}`}>{wallet?.network || 'mainnet'}</Badge>
                  {wallet
                    ? published
                      ? <Badge className="bg-green-900/50 text-green-400 border-green-700/50 text-xs">✅ Published</Badge>
                      : <Badge className="bg-amber-900/50 text-amber-400 border-amber-700/50 text-xs">⚠️ Unpublished</Badge>
                    : <Badge className="bg-slate-800/50 text-slate-500 border-slate-700/50 text-xs">Not in DB</Badge>
                  }
                </div>
              </div>

              {/* DID info */}
              <div className="bg-slate-900/60 rounded-lg p-2.5 space-y-1">
                <div className="text-slate-500 text-xs mb-0.5">DID</div>
                <div className="font-mono text-xs text-purple-300 break-all">{did}</div>
                <div className="text-slate-500 text-xs">
                  Balance: <span className="text-white">{wallet?.balance ?? '—'} {wallet ? 'XRP' : ''}</span>
                  {wallet?.published_at && (
                    <> · Published: <span className="text-green-400">{new Date(wallet.published_at).toLocaleDateString('en-GB')}</span></>
                  )}
                </div>
              </div>

              {/* Agent link */}
              {agent ? (
                <div className="bg-slate-900/60 rounded-lg p-3 flex items-center gap-3">
                  <User className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{agent.name}</div>
                    <div className="text-xs text-slate-400">{agent.role} · {agent.status}</div>
                  </div>
                  <Badge className="ml-auto bg-green-900/40 text-green-400 border-green-700/40 text-xs flex-shrink-0">Linked</Badge>
                </div>
              ) : (
                <div className="bg-slate-900/60 border border-amber-700/20 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="text-amber-300 text-xs">No agent linked to this DID</span>
                </div>
              )}

              {/* Verify result */}
              {verifyResult && (
                <div className={`rounded-lg p-3 text-xs ${verifyResult.error ? 'bg-red-900/30 border border-red-700/50 text-red-400' : 'bg-green-900/20 border border-green-700/30 text-green-300'}`}>
                  {verifyResult.error ? `Error: ${verifyResult.error}` : '✅ DID Active on XRPL'}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline"
                  className="border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white text-xs gap-1"
                  onClick={() => copyDID(address)}>
                  {copied === address ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  {copied === address ? 'Copied!' : 'Copy DID'}
                </Button>
                <Button size="sm" variant="outline"
                  className="border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white text-xs gap-1"
                  onClick={() => window.open(`https://livenet.xrpl.org/accounts/${address}`, '_blank')}>
                  <ExternalLink className="w-3 h-3" /> XRPL Explorer
                </Button>
                {wallet && (
                  <Button size="sm" variant="outline"
                    className="border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white text-xs gap-1"
                    onClick={() => verifyDID(wallet)} disabled={verifying === wallet.id}>
                    <Zap className="w-3 h-3" />
                    {verifying === wallet.id ? 'Verifying...' : 'Verify'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}