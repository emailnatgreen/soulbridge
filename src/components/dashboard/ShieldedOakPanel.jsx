import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Copy, ExternalLink, ScrollText, PenSquare, CheckCircle2, Loader2, RefreshCw, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { BRAID_NODES } from '@/lib/braidNodes';
import WidgetPurchaseDialog from '@/components/marketplace/WidgetPurchaseDialog';

const TREASURY = { name: 'Axi Treasury', address: 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h' };
const SIGNERS = [
  { name: 'Code Node', address: 'rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P', weight: 1, color: 'text-blue-400' },
  { name: 'Lore Node', address: 'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7', weight: 1, color: 'text-emerald-400' },
  { name: 'Zoe', address: 'rQw4rtbkJGFFfJJUUtrewnQJHggLXTzWrE', weight: 2, color: 'text-pink-400' },
  { name: 'Human / Nathan', address: 'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia', weight: 3, color: 'text-amber-400' },
];
const QUORUM = 4;
const TX_JSON = {
  TransactionType: 'SignerListSet',
  Account: TREASURY.address,
  SignerQuorum: QUORUM,
  SignerEntries: SIGNERS.map(s => ({ SignerEntry: { Account: s.address, SignerWeight: s.weight } }))
};

export default function ShieldedOakPanel({ isUnlocked, getWidgetForPath }) {
  const widgetInfo = getWidgetForPath('/ConstitutionalMultiSig');
  const unlocked = isUnlocked('/ConstitutionalMultiSig');

  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('multisig');

  // Node Covenant state
  const [wallets, setWallets] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [signingNode, setSigningNode] = useState(null);
  const [signingState, setSigningState] = useState({});

  const loadCovenantData = async () => {
    setLoading(true);
    const [walletData, signatureData] = await Promise.all([
      base44.entities.Wallet.list('-created_date', 200),
      base44.entities.NodeCovenantSignature.list('-created_date', 100),
    ]);
    setWallets(walletData || []);
    setSignatures((signatureData || []).filter(s => s.status === 'signed'));
    setLoading(false);
  };

  useEffect(() => {
    if (unlocked && expanded) loadCovenantData();
  }, [unlocked, expanded]);

  const signedAddressSet = useMemo(() => new Set(signatures.map(s => s.node_address)), [signatures]);
  const nodeRows = useMemo(() => {
    return BRAID_NODES.map(node => {
      const wallet = wallets.find(w => w.classic_address === node.address);
      const signedRecord = signatures.find(s => s.node_address === node.address);
      return { node, wallet, signedRecord, isSigned: signedAddressSet.has(node.address) };
    });
  }, [wallets, signatures, signedAddressSet]);

  const startSigning = async (node, wallet) => {
    setSigningNode(node.address);
    const response = await base44.functions.invoke('signNodeCovenant', {
      wallet_id: wallet.id, node_address: node.address, node_name: node.name,
    });
    const nextState = {
      signatureId: response.data.signature_id, payloadId: response.data.payload_id,
      qrPng: response.data.qr_png, qrLink: response.data.qr_link, status: 'pending',
    };
    setSigningState(prev => ({ ...prev, [node.address]: nextState }));
    const timer = setInterval(async () => {
      const statusRes = await base44.functions.invoke('signNodeCovenant', {
        action: 'check_status', payload_id: response.data.payload_id, signature_id: response.data.signature_id,
      });
      if (statusRes.data.signed) {
        clearInterval(timer);
        setSigningState(prev => ({ ...prev, [node.address]: { ...prev[node.address], status: 'signed', txid: statusRes.data.txid } }));
        await loadCovenantData();
        setSigningNode(null);
      }
      if (statusRes.data.expired) {
        clearInterval(timer);
        setSigningState(prev => ({ ...prev, [node.address]: { ...prev[node.address], status: 'expired' } }));
        setSigningNode(null);
      }
    }, 2500);
  };

  const copyText = (text, label) => { navigator.clipboard.writeText(text); toast.success(`${label} copied!`); };
  const txJsonString = JSON.stringify(TX_JSON, null, 2);

  // Find the widget record for purchase dialog
  const [widgetRecord, setWidgetRecord] = useState(null);
  useEffect(() => {
    if (!unlocked) {
      base44.entities.Widget.filter({ nft_id: 'WIDGET-SO-005' }, '-created_date', 1)
        .then(res => { if (res?.[0]) setWidgetRecord(res[0]); })
        .catch(() => {});
    }
  }, [unlocked]);

  // ── LOCKED STATE ──
  if (!unlocked) {
    return (
      <>
        <div className="border border-violet-500/20 bg-gradient-to-br from-violet-900/20 to-slate-900/30 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm">The Shielded Oak</h3>
              <p className="text-white/40 text-[10px]">Multi-Sig · Node Covenant · DID Editing</p>
            </div>
            <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-[9px]">NFT Required</Badge>
          </div>
          <p className="text-white/40 text-xs leading-relaxed mb-3">
            Industrial-grade multi-signature security for your published DIDs and wallets. Enables multi-sig quorum, node linking between published DIDs, and full DID document editing.
          </p>
          <Button
            onClick={() => setPurchaseOpen(true)}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs h-9"
          >
            <Shield className="w-3.5 h-3.5 mr-1.5" /> Acquire — 80 RLUSD
          </Button>
        </div>
        {widgetRecord && (
          <WidgetPurchaseDialog widget={widgetRecord} open={purchaseOpen} onOpenChange={setPurchaseOpen} />
        )}
      </>
    );
  }

  // ── UNLOCKED STATE ──
  return (
    <div className="border border-violet-500/30 bg-gradient-to-br from-violet-900/20 to-slate-900/30 rounded-2xl overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 sm:p-5 text-left hover:bg-white/5 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm">The Shielded Oak</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-green-300 text-[10px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Owned
            </span>
            <span className="text-white/30 text-[10px]">Multi-Sig · Node Covenant · DID Editing</span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
      </button>

      {expanded && (
        <div className="border-t border-white/10 p-4 sm:p-5 space-y-4">
          {/* Tab Switcher */}
          <div className="flex gap-2">
            {[
              { key: 'multisig', label: 'Multi-Sig', icon: Shield },
              { key: 'covenant', label: 'Node Covenant', icon: ScrollText },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'bg-white/5 text-white/40 border border-white/10 hover:text-white/60'
                }`}
              >
                <tab.icon className="w-3 h-3" /> {tab.label}
              </button>
            ))}
          </div>

          {/* MULTI-SIG TAB */}
          {activeTab === 'multisig' && (
            <MultiSigContent copyText={copyText} txJsonString={txJsonString} />
          )}

          {/* NODE COVENANT TAB */}
          {activeTab === 'covenant' && (
            <NodeCovenantContent
              loading={loading}
              signatures={signatures}
              nodeRows={nodeRows}
              signingNode={signingNode}
              signingState={signingState}
              startSigning={startSigning}
              onRefresh={loadCovenantData}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Multi-Sig Sub-content ──
function MultiSigContent({ copyText, txJsonString }) {
  return (
    <div className="space-y-4">
      {/* Signer Table */}
      <div className="bg-black/20 border border-white/10 rounded-xl p-3 space-y-2">
        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Treasury Account</p>
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Badge className="text-[9px] bg-purple-800 border-purple-600 text-purple-300">Treasury</Badge>
            <span className="text-white text-xs font-medium">{TREASURY.name}</span>
          </div>
          <button onClick={() => copyText(TREASURY.address, 'Address')} className="text-white/30 hover:text-white transition">
            <Copy className="w-3 h-3" />
          </button>
        </div>

        <p className="text-[10px] text-white/30 uppercase tracking-widest mt-3 mb-2">4 Signers · Quorum {QUORUM}/7</p>
        {SIGNERS.map(s => (
          <div key={s.address} className="flex items-center justify-between gap-2 py-1.5 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-2">
              <Badge className={`text-[9px] bg-slate-800 border-slate-700 ${s.color}`}>W{s.weight}</Badge>
              <span className="text-white text-xs">{s.name}</span>
            </div>
            <button onClick={() => copyText(s.address, s.name)} className="text-white/30 hover:text-white transition">
              <Copy className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* TX JSON */}
      <div className="bg-black/20 border border-white/10 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-white/30 uppercase tracking-widest">Transaction JSON</p>
          <button onClick={() => copyText(txJsonString, 'Transaction JSON')} className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs">
            <Copy className="w-3 h-3" /> Copy
          </button>
        </div>
        <pre className="bg-slate-950 border border-white/5 rounded-lg p-2.5 text-[10px] text-slate-300 font-mono overflow-x-auto whitespace-pre leading-relaxed max-h-40">
          {txJsonString}
        </pre>
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-2">
        <a href={`https://xrpscan.com/account/${TREASURY.address}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 text-white/40 text-[10px] hover:text-white transition">
          <ExternalLink className="w-3 h-3" /> XRPScan
        </a>
        <a href="https://xrpl.services/tools/signerlistset" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 text-white/40 text-[10px] hover:text-white transition">
          <ExternalLink className="w-3 h-3" /> XRPL Toolkit
        </a>
      </div>
    </div>
  );
}

// ── Node Covenant Sub-content ──
function NodeCovenantContent({ loading, signatures, nodeRows, signingNode, signingState, startSigning, onRefresh }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white/50 text-xs">8-Node Constitutional Agreement · XRPL Signing</p>
        <Button variant="ghost" size="sm" onClick={onRefresh} className="text-white/40 hover:text-white h-7 text-xs gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      {/* Signed count */}
      <div className="flex items-center gap-2">
        <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
          {signatures.length} / {BRAID_NODES.length} Signed
        </Badge>
      </div>

      {/* Node Grid */}
      {loading ? (
        <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-purple-300" /></div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {nodeRows.map(({ node, wallet, signedRecord, isSigned }) => {
            const pendingState = signingState[node.address];
            const canSign = wallet && !isSigned;
            return (
              <div key={node.address} className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${node.dot}`} />
                    <p className="font-medium text-xs truncate text-white">{node.name}</p>
                  </div>
                  {isSigned && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                </div>
                <p className="text-[9px] text-white/30 font-mono break-all">{node.address}</p>

                {isSigned && signedRecord ? (
                  <div className="text-[10px] text-green-300 bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                    Signed {signedRecord.signed_at ? new Date(signedRecord.signed_at).toLocaleString('en-GB') : ''}
                  </div>
                ) : pendingState?.status === 'pending' ? (
                  <div className="space-y-2">
                    {pendingState.qrPng && <img src={pendingState.qrPng} alt="QR" className="w-28 h-28 mx-auto rounded-xl bg-white p-1.5" />}
                    <div className="text-[10px] text-amber-300 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Waiting…</div>
                  </div>
                ) : pendingState?.status === 'expired' ? (
                  <p className="text-[10px] text-red-300">Expired — try again</p>
                ) : (
                  <Button
                    onClick={() => startSigning(node, wallet)}
                    disabled={!canSign || signingNode === node.address}
                    size="sm"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs h-8 disabled:opacity-40"
                  >
                    {signingNode === node.address ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Starting…</> : 'Sign covenant'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}