import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, User, Globe, Copy, CheckCircle, AlertCircle, ExternalLink, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const NODE_COLORS = {
  white: 'border-slate-700/40 bg-slate-900/10',
  red: 'border-red-700/40 bg-red-900/10',
  orange: 'border-orange-700/40 bg-orange-900/10',
  yellow: 'border-yellow-700/40 bg-yellow-900/10',
  green: 'border-green-700/40 bg-green-900/10',
  blue: 'border-blue-700/40 bg-blue-900/10',
  purple: 'border-purple-700/40 bg-purple-900/10',
  gray: 'border-gray-700/40 bg-gray-900/10',
  cyan: 'border-cyan-700/40 bg-cyan-900/10',
  indigo: 'border-indigo-700/40 bg-indigo-900/10',
  teal: 'border-teal-700/40 bg-teal-900/10',
  amber: 'border-amber-700/40 bg-amber-900/10',
  rose: 'border-rose-700/40 bg-rose-900/10',
};

const BADGE_COLORS = {
  white: 'bg-slate-900/50 text-slate-300 border-slate-700/50',
  red: 'bg-red-900/50 text-red-300 border-red-700/50',
  orange: 'bg-orange-900/50 text-orange-300 border-orange-700/50',
  yellow: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50',
  green: 'bg-green-900/50 text-green-300 border-green-700/50',
  blue: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
  purple: 'bg-purple-900/50 text-purple-300 border-purple-700/50',
  gray: 'bg-gray-900/50 text-gray-300 border-gray-700/50',
  cyan: 'bg-cyan-900/50 text-cyan-300 border-cyan-700/50',
  indigo: 'bg-indigo-900/50 text-indigo-300 border-indigo-700/50',
  teal: 'bg-teal-900/50 text-teal-300 border-teal-700/50',
  amber: 'bg-amber-900/50 text-amber-300 border-amber-700/50',
  rose: 'bg-rose-900/50 text-rose-300 border-rose-700/50',
};

const PUBLISHED_DID_ADDRESSES = [
  'rPPtBrN5TxAcAShhDMWe2eQzmhG1f6aWBg',  // Node 0
  'rHJM1bH9dE3EbvwSR2zFSHrjooS6H3xb32',  // Sentinel
  'r4NtWS355ZKViGyFuECrk1dbkizpbF4Mny',  // DID IT
  'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7',  // Lore
  'r4QgW8kVhzdLhS9xj16DLdXc42x5xrESjV',  // Truth
  'rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P',   // Code
  'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h',  // Treasury
  'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia',  // Human
];

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
      const constitutional = ws.filter(w =>
        w.classic_address && PUBLISHED_DID_ADDRESSES.includes(w.classic_address)
      );
      setWallets(constitutional);
      setAgents(ags);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function getLinkedAgent(walletId) {
    return agents.find(a => a.wallet_id === walletId);
  }

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

  const isPublished = (w) => w.is_published || !!w.published_txid || !!w.published_at;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="text-center py-16">
        <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No Constitutional DIDs Found</h3>
        <p className="text-slate-400 text-sm">Wallets need <code className="text-purple-300">metadata.is_constitutional_node: true</code> to appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-400" /> Core Constitutional DIDs
        </h2>
        <p className="text-slate-400 text-sm">
          {wallets.length} of {PUBLISHED_DID_ADDRESSES.length} published constitutional nodes active on XRPL mainnet.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {wallets.map(wallet => {
          const agent = getLinkedAgent(wallet.id);
          const color = wallet.metadata?.color || 'purple';
          const cardClass = NODE_COLORS[color] || NODE_COLORS.purple;
          const badgeClass = BADGE_COLORS[color] || BADGE_COLORS.purple;
          const published = isPublished(wallet);
          const did = `did:xrpl:1:${wallet.classic_address}`;
          const verifyResult = verifyResults[wallet.id];

          return (
            <div key={wallet.id} className={`border rounded-xl p-5 space-y-4 ${cardClass}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-white text-sm">{wallet.name || 'Unnamed Node'}</h3>
                  {wallet.metadata?.description && (
                    <p className="text-slate-400 text-xs mt-0.5">{wallet.metadata.description}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge className={`text-xs ${badgeClass}`}>{wallet.network || 'mainnet'}</Badge>
                  {published
                    ? <Badge className="bg-green-900/50 text-green-400 border-green-700/50 text-xs">✅ Published</Badge>
                    : <Badge className="bg-amber-900/50 text-amber-400 border-amber-700/50 text-xs">⚠️ Unpublished</Badge>
                  }
                </div>
              </div>

              <div className="bg-slate-900/60 rounded-lg p-2.5 space-y-1">
                <div className="text-slate-500 text-xs mb-0.5">DID</div>
                <div className="font-mono text-xs text-purple-300 break-all">{did}</div>
                <div className="text-slate-500 text-xs">Balance: <span className="text-white">{wallet.balance ?? 0} XRP</span> · Published: <span className="text-green-400">{wallet.published_at ? new Date(wallet.published_at).toLocaleDateString('en-GB') : '—'}</span></div>
              </div>

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

              {verifyResult && (
                <div className={`rounded-lg p-3 text-xs ${verifyResult.error ? 'bg-red-900/30 border border-red-700/50 text-red-400' : 'bg-green-900/20 border border-green-700/30 text-green-300'}`}>
                  {verifyResult.error ? `Error: ${verifyResult.error}` : '✅ DID Active on XRPL'}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline"
                  className="border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white text-xs gap-1"
                  onClick={() => copyDID(wallet.classic_address)}>
                  {copied === wallet.classic_address ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  {copied === wallet.classic_address ? 'Copied!' : 'Copy DID'}
                </Button>
                <Button size="sm" variant="outline"
                  className="border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white text-xs gap-1"
                  onClick={() => window.open(`https://livenet.xrpl.org/accounts/${wallet.classic_address}`, '_blank')}>
                  <ExternalLink className="w-3 h-3" /> XRPL Explorer
                </Button>
                <Button size="sm" variant="outline"
                  className="border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white text-xs gap-1"
                  onClick={() => verifyDID(wallet)} disabled={verifying === wallet.id}>
                  <Zap className="w-3 h-3" />
                  {verifying === wallet.id ? 'Verifying...' : 'Verify'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-sm text-slate-400">
        <p><span className="text-purple-300 font-medium">Note:</span> To mark a wallet as a constitutional node, set <code className="text-purple-300">metadata.is_constitutional_node: true</code> on the Wallet entity. Optionally add <code className="text-purple-300">metadata.color</code> (purple, green, blue, amber, rose, cyan, indigo, teal) and <code className="text-purple-300">metadata.description</code> for richer display.</p>
      </div>
    </div>
  );
}