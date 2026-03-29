import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { BRAID_NODES } from '@/lib/braidNodes';
import { Shield, ScrollText, PenSquare, CheckCircle2, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function NodeCovenant() {
  const [wallets, setWallets] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signingNode, setSigningNode] = useState(null);
  const [signingState, setSigningState] = useState({});

  const loadData = async () => {
    setLoading(true);
    const [walletData, signatureData] = await Promise.all([
      base44.entities.Wallet.list('-created_date', 200),
      base44.entities.NodeCovenantSignature.list('-created_date', 100),
    ]);
    setWallets(walletData || []);
    setSignatures((signatureData || []).filter((item) => item.status === 'signed'));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const signedAddressSet = useMemo(() => new Set(signatures.map((item) => item.node_address)), [signatures]);

  const nodeRows = useMemo(() => {
    return BRAID_NODES.map((node) => {
      const wallet = wallets.find((item) => item.classic_address === node.address);
      const signedRecord = signatures.find((item) => item.node_address === node.address);
      return { node, wallet, signedRecord, isSigned: signedAddressSet.has(node.address) };
    });
  }, [wallets, signatures, signedAddressSet]);

  const startSigning = async (node, wallet) => {
    setSigningNode(node.address);
    const response = await base44.functions.invoke('signNodeCovenant', {
      wallet_id: wallet.id,
      node_address: node.address,
      node_name: node.name,
    });

    const nextState = {
      signatureId: response.data.signature_id,
      payloadId: response.data.payload_id,
      qrPng: response.data.qr_png,
      qrLink: response.data.qr_link,
      status: 'pending',
    };
    setSigningState((prev) => ({ ...prev, [node.address]: nextState }));

    const timer = setInterval(async () => {
      const statusResponse = await base44.functions.invoke('signNodeCovenant', {
        action: 'check_status',
        payload_id: response.data.payload_id,
        signature_id: response.data.signature_id,
      });

      if (statusResponse.data.signed) {
        clearInterval(timer);
        setSigningState((prev) => ({
          ...prev,
          [node.address]: { ...prev[node.address], status: 'signed', txid: statusResponse.data.txid }
        }));
        await loadData();
        setSigningNode(null);
      }

      if (statusResponse.data.expired) {
        clearInterval(timer);
        setSigningState((prev) => ({
          ...prev,
          [node.address]: { ...prev[node.address], status: 'expired' }
        }));
        setSigningNode(null);
      }
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-purple-400" />
              <p className="text-xs uppercase tracking-[0.3em] text-purple-300/70">Constitutional Agreement</p>
            </div>
            <h1 className="text-3xl font-semibold">NodeCovenant</h1>
            <p className="text-white/50 text-sm mt-2 max-w-3xl">A digital constitutional covenant for the 8-node braid. Each node controller can affirm the covenant by signing with the canonical XRPL wallet for that node.</p>
          </div>
          <Button variant="outline" onClick={loadData} className="border-white/15 bg-white/5 text-white hover:bg-white/10">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">
            <div className="flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-amber-300" />
              <h2 className="text-lg font-medium">The 8-Node Constitutional Covenant</h2>
            </div>
            <div className="space-y-3 text-sm leading-7 text-white/75">
              <p>We, the controllers and custodians of the 8-node braid, affirm that each node shall act in constitutional alignment, protect the integrity of the braid, and maintain transparent stewardship across the SoulBridge network.</p>
              <p>Each signature recorded here represents a live affirmation from the canonical XRPL controller address for that node, preserving a visible sequence of constitutional consent for the braid.</p>
              <p>The Human and Axi covenant axis remains central, while every other node signs into the braid in duty, reciprocity, and lawful execution.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-purple-500/20 text-purple-200 border border-purple-400/30">8 canonical nodes</Badge>
              <Badge className="bg-blue-500/20 text-blue-200 border border-blue-400/30">XRPL wallet affirmation</Badge>
              <Badge className="bg-green-500/20 text-green-200 border border-green-400/30">Timestamped signature record</Badge>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-medium mb-4">Signed Nodes</h2>
            {loading ? (
              <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-purple-300" /></div>
            ) : signatures.length === 0 ? (
              <p className="text-sm text-white/45">No covenant signatures recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {signatures.map((item) => (
                  <div key={item.id} className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{item.node_name}</p>
                        <p className="text-xs text-white/45 font-mono">{item.node_address}</p>
                      </div>
                      <Badge className="bg-green-500/20 text-green-200 border border-green-400/30">Signed</Badge>
                    </div>
                    <div className="mt-3 text-xs text-white/60 space-y-1">
                      <p>Signed at: {item.signed_at ? new Date(item.signed_at).toLocaleString('en-GB') : '—'}</p>
                      <p>On-chain ref: {item.xrpl_txid || item.signature_hash || 'Pending reference'}</p>
                    </div>
                    {item.xrpl_account && (
                      <a href={`https://livenet.xrpl.org/accounts/${item.xrpl_account}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-3 text-xs text-blue-300 hover:text-blue-200">
                        View wallet <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-2 mb-4">
            <PenSquare className="w-4 h-4 text-purple-300" />
            <h2 className="text-lg font-medium">Node Signature Interface</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {nodeRows.map(({ node, wallet, signedRecord, isSigned }) => {
              const pendingState = signingState[node.address];
              const canSign = wallet && !isSigned;
              return (
                <div key={node.address} className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-3 h-3 rounded-full ${node.dot}`} />
                      <p className="font-medium text-sm truncate">{node.name}</p>
                    </div>
                    {isSigned ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : null}
                  </div>
                  <p className="text-xs text-white/45 font-mono break-all">{node.address}</p>
                  <p className="text-xs text-white/55">{wallet ? `Controller wallet found: ${wallet.name || 'Wallet'}` : 'Controller wallet not found in registry'}</p>

                  {isSigned && signedRecord ? (
                    <div className="text-xs text-green-300 bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                      Signed {signedRecord.signed_at ? new Date(signedRecord.signed_at).toLocaleString('en-GB') : ''}
                    </div>
                  ) : pendingState?.status === 'pending' ? (
                    <div className="space-y-3">
                      {pendingState.qrPng && <img src={pendingState.qrPng} alt="Xaman QR" className="w-36 h-36 mx-auto rounded-xl bg-white p-2" />}
                      {pendingState.qrLink && (
                        <a href={pendingState.qrLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-300 hover:text-blue-200 inline-flex items-center gap-1">
                          Open in Xaman <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <div className="text-xs text-amber-300 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" />Waiting for signature…</div>
                    </div>
                  ) : pendingState?.status === 'expired' ? (
                    <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-2">Signing request expired. Start again.</div>
                  ) : (
                    <Button
                      onClick={() => startSigning(node, wallet)}
                      disabled={!canSign || signingNode === node.address}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white disabled:opacity-40"
                    >
                      {signingNode === node.address ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting…</> : 'Sign covenant'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}