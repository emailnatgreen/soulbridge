import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, Rocket, CheckCircle2, AlertTriangle, ExternalLink, Zap } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export default function MintActionButton({ widget }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('idle'); // idle | preparing | prepared | minting | signing | success | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [xummPayload, setXummPayload] = useState(null);
  const queryClient = useQueryClient();

  const canPrepare = ['draft', 'failed'].includes(widget.mint_status);
  const canMint = ['prepared', 'simulated'].includes(widget.mint_status);
  const alreadyMinted = widget.mint_status === 'minted_mainnet';

  const handlePrepare = async () => {
    setStep('preparing');
    setError('');
    try {
      const res = await base44.functions.invoke('prepareMainnetMint', { widget_id: widget.id });
      setResult(res.data);
      setStep('prepared');
      queryClient.invalidateQueries({ queryKey: ['myMintedNFTs'] });
      toast.success('Widget prepared — simulation passed');
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Preparation failed';
      setError(msg);
      setStep('error');
      toast.error(msg);
    }
  };

  const handleMintOnChain = async () => {
    setStep('minting');
    setError('');
    try {
      const res = await base44.functions.invoke('xummMintNFT', { widget_id: widget.id });
      const data = res.data;
      const signingUrl = data?.next?.always || data?.deeplink;
      if (signingUrl) {
        setXummPayload({ ...data, next: { always: signingUrl } });
        setStep('signing');
        // Open Xumm signing in new tab
        window.open(signingUrl, '_blank');
      } else if (data?.success) {
        setStep('success');
        queryClient.invalidateQueries({ queryKey: ['myMintedNFTs'] });
        toast.success('NFT minted on XRPL mainnet!');
      } else {
        setError(data?.error || 'Unexpected response from minting service');
        setStep('error');
      }
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Minting failed';
      setError(msg);
      setStep('error');
      toast.error(msg);
    }
  };

  const handleCheckStatus = async () => {
    if (!xummPayload?.uuid) return;
    try {
      const res = await base44.functions.invoke('xummCheckPayload', { payload_id: xummPayload.uuid });
      const data = res.data;
      if (data?.signed) {
        // Update widget to minted_mainnet
        try {
          await base44.entities.Widget.update(widget.id, {
            mint_status: 'minted_mainnet',
            xrpl_tx_hash: data.txid || null,
          });
        } catch (_) {}
        setStep('success');
        queryClient.invalidateQueries({ queryKey: ['myMintedNFTs'] });
        toast.success('NFT minted successfully on XRPL!');
      } else if (data?.expired) {
        setError('Signing request expired. Try again.');
        setStep('error');
      } else if (data?.resolved && !data?.signed) {
        setError('Transaction was rejected or cancelled.');
        setStep('error');
      } else {
        toast.info('Still waiting for signature — check Xaman app');
      }
    } catch (e) {
      toast.error('Could not check status');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setStep('idle');
    setResult(null);
    setError('');
    setXummPayload(null);
  };

  if (alreadyMinted) {
    return (
      <div className="flex items-center gap-1.5">
        <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[9px] gap-1">
          <CheckCircle2 className="w-3 h-3" /> Minted
        </Badge>
        {widget.xrpl_tx_hash && (
          <a
            href={`https://xrpscan.com/tx/${widget.xrpl_tx_hash}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 text-[9px] text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 border border-cyan-500/30 rounded px-1.5 py-0.5 transition-colors"
            title="Verify on XRPScan"
          >
            <ExternalLink className="w-2.5 h-2.5" /> XRPScan
          </a>
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        size="sm"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className={`text-[10px] h-7 px-2.5 gap-1 ${canMint
          ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white'
          : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
        }`}
      >
        {canMint ? <><Rocket className="w-3 h-3" /> Mint</> : <><Zap className="w-3 h-3" /> Prepare</>}
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-slate-950 border-white/10 text-white max-w-md" onClick={e => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Rocket className="w-5 h-5 text-purple-400" />
              {canMint ? 'Mint to XRPL Mainnet' : 'Prepare for Minting'}
            </DialogTitle>
            <DialogDescription className="text-white/50 text-xs">
              {widget.name} · {widget.nft_id || 'No NFT ID'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Widget summary */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-[10px]">Name</span>
                <span className="text-white text-xs font-medium">{widget.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-[10px]">Type</span>
                <span className="text-white text-xs">{widget.widget_type} · {widget.category?.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-[10px]">Status</span>
                <Badge className="text-[9px] bg-white/10 text-white/60 border-white/10">{widget.mint_status}</Badge>
              </div>
              {widget.feature_path && (
                <div className="flex items-center justify-between">
                  <span className="text-white/40 text-[10px]">Feature Path</span>
                  <span className="text-purple-300 text-xs font-mono">{widget.feature_path}</span>
                </div>
              )}
              {widget.xrpl_tx_hash && (
                <div className="flex items-center justify-between">
                  <span className="text-white/40 text-[10px]">XRPL Proof</span>
                  <a
                    href={`https://xrpscan.com/tx/${widget.xrpl_tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200 text-xs transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> XRPScan
                  </a>
                </div>
              )}
              {widget.transferable === false && (
                <div className="flex items-center gap-1.5 text-amber-300/80 text-[10px]">
                  <AlertTriangle className="w-3 h-3" /> Soul-bound (non-transferable)
                </div>
              )}
            </div>

            {/* Step: Preparing */}
            {step === 'preparing' && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                <div>
                  <p className="text-white text-xs font-semibold">Preparing mint payload…</p>
                  <p className="text-white/40 text-[10px]">Validating metadata, governance rules, and XRPL payload</p>
                </div>
              </div>
            )}

            {/* Step: Prepared (show simulation results) */}
            {step === 'prepared' && result && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-green-300 text-xs font-semibold">Simulation Passed</p>
                    <p className="text-green-200/50 text-[10px]">{result.simulation?.summary}</p>
                  </div>
                </div>
                {result.simulation?.warnings?.length > 0 && (
                  <div className="space-y-1">
                    {result.simulation.warnings.map((w, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-amber-300/80 text-[10px]">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {w}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-white/30 text-[10px]">Hash: {result.metadata_hash}</p>
              </div>
            )}

            {/* Step: Minting */}
            {step === 'minting' && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <Loader2 className="w-5 h-5 text-green-400 animate-spin" />
                <div>
                  <p className="text-white text-xs font-semibold">Submitting to XRPL…</p>
                  <p className="text-white/40 text-[10px]">Waiting for Xaman signing request</p>
                </div>
              </div>
            )}

            {/* Step: Signing (Xumm) */}
            {step === 'signing' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  <div>
                    <p className="text-cyan-300 text-xs font-semibold">Waiting for Xaman Signature</p>
                    <p className="text-cyan-200/50 text-[10px]">Sign the transaction in your Xaman (Xumm) app</p>
                  </div>
                </div>
                {xummPayload?.next?.always && (
                  <a href={xummPayload.next.always} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-xs text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-3 py-2">
                    <ExternalLink className="w-3 h-3" /> Open in Xaman
                  </a>
                )}
              </div>
            )}

            {/* Step: Success */}
            {step === 'success' && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-green-300 text-xs font-semibold">Minted on XRPL Mainnet! 🎉</p>
                    <p className="text-green-200/50 text-[10px]">Your NFT is now live on the XRP Ledger</p>
                  </div>
                </div>
                {widget.xrpl_tx_hash && (
                  <a
                    href={`https://xrpscan.com/tx/${widget.xrpl_tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-xs text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-3 py-2 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Verify on XRPScan
                  </a>
                )}
              </div>
            )}

            {/* Step: Error */}
            {step === 'error' && error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-300 text-xs font-semibold">Error</p>
                  <p className="text-red-200/60 text-[10px] leading-relaxed">{error}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {/* Idle + draft: Show Prepare button */}
            {step === 'idle' && canPrepare && (
              <Button onClick={handlePrepare} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 gap-2">
                <Zap className="w-4 h-4" /> Prepare & Simulate
              </Button>
            )}

            {/* Idle + already prepared: Show Mint button */}
            {step === 'idle' && canMint && (
              <div className="w-full space-y-2">
                <Button onClick={handleMintOnChain} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 gap-2">
                  <Rocket className="w-4 h-4" /> Mint on XRPL Mainnet
                </Button>
                <Button onClick={handlePrepare} variant="outline" className="w-full border-white/20 text-white/60 hover:bg-white/10 gap-2 text-xs">
                  <Zap className="w-3.5 h-3.5" /> Re-prepare & Simulate
                </Button>
              </div>
            )}

            {/* Prepared: Show Mint button */}
            {step === 'prepared' && (
              <Button onClick={handleMintOnChain} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 gap-2">
                <Rocket className="w-4 h-4" /> Mint on XRPL Mainnet
              </Button>
            )}

            {/* Signing: Show Check Status */}
            {step === 'signing' && (
              <Button onClick={handleCheckStatus} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 gap-2">
                <CheckCircle2 className="w-4 h-4" /> Check Signing Status
              </Button>
            )}

            {/* Error: Retry */}
            {step === 'error' && (
              <Button onClick={canMint ? handleMintOnChain : handlePrepare} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 gap-2">
                Retry
              </Button>
            )}

            {/* Success: Close */}
            {step === 'success' && (
              <Button onClick={handleClose} className="w-full bg-white/10 hover:bg-white/20 text-white">
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}