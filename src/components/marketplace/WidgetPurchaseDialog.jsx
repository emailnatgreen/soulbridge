import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield, Wallet, ExternalLink, CheckCircle2, XCircle, Loader2, QrCode, Clock, AlertTriangle
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

const STEPS = { CONFIRM: 'confirm', SIGNING: 'signing', SUCCESS: 'success', ERROR: 'error' };

export default function WidgetPurchaseDialog({ widget, open, onOpenChange, onPurchaseComplete }) {
  const [step, setStep] = useState(STEPS.CONFIRM);
  const [priceData, setPriceData] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [payloadData, setPayloadData] = useState(null);
  const [txResult, setTxResult] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  // Load price on open
  useEffect(() => {
    if (!open || !widget) return;
    setStep(STEPS.CONFIRM);
    setError(null);
    setTxResult(null);
    setPayloadData(null);
    setLoadingPrice(true);

    base44.functions.invoke('purchaseWidgetNFT', { action: 'get_price', widget_id: widget.id })
      .then(res => setPriceData(res.data))
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoadingPrice(false));

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [open, widget]);

  const handleInitiatePayment = async () => {
    setStep(STEPS.SIGNING);
    setError(null);

    const res = await base44.functions.invoke('purchaseWidgetNFT', {
      action: 'initiate_payment', widget_id: widget.id,
    });

    const data = res.data;
    if (!data.success) {
      setError(data.error || 'Failed to create payment');
      setStep(STEPS.ERROR);
      return;
    }

    setPayloadData(data);

    // Open Xaman sign URL
    if (data.sign_url) {
      window.open(data.sign_url, '_blank', 'noopener');
    }

    // Poll for payment completion
    pollRef.current = setInterval(async () => {
      const checkRes = await base44.functions.invoke('purchaseWidgetNFT', {
        action: 'check_payment', payload_uuid: data.payload_uuid,
      });

      const check = checkRes.data;
      if (check.signed && check.tx_hash) {
        clearInterval(pollRef.current);
        // Confirm purchase
        const confirmRes = await base44.functions.invoke('purchaseWidgetNFT', {
          action: 'confirm_purchase', widget_id: widget.id, tx_hash: check.tx_hash,
        });
        setTxResult({ ...confirmRes.data, tx_hash: check.tx_hash });
        setStep(STEPS.SUCCESS);
        onPurchaseComplete?.();
      } else if (check.cancelled || check.expired) {
        clearInterval(pollRef.current);
        setError(check.cancelled ? 'Payment was cancelled' : 'Payment request expired');
        setStep(STEPS.ERROR);
      }
    }, 3000);
  };

  const handleClose = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-950 border-purple-500/30 text-white max-w-md">
        {step === STEPS.CONFIRM && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Shield className="w-5 h-5 text-purple-400" />
                Purchase NFT
              </DialogTitle>
              <DialogDescription className="text-white/50">
                Pay with RLUSD directly to the SoulBridge Treasury via Xaman
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Widget info */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-start gap-3">
                {widget?.image_url ? (
                  <img src={widget.image_url} alt={widget.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-purple-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm">{widget?.name}</p>
                  <p className="text-white/40 text-[10px] font-mono">{widget?.nft_id}</p>
                </div>
              </div>

              {/* Price */}
              {loadingPrice ? (
                <div className="flex items-center gap-2 justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span className="text-white/40 text-sm">Loading price…</span>
                </div>
              ) : error ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
                  <p className="text-red-300 text-xs">{error}</p>
                </div>
              ) : priceData && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                    <span className="text-white/60 text-sm">Total Cost</span>
                    <span className="text-amber-300 font-bold text-lg">{priceData.price_rlusd} RLUSD</span>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-white/30 text-[10px]">Payment Method</span>
                    <Badge className="bg-blue-500/10 border-blue-500/30 text-blue-300 text-[9px]">RLUSD on XRPL</Badge>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-white/30 text-[10px]">Destination</span>
                    <span className="text-white/50 text-[9px] font-mono">
                      {priceData.treasury_address?.slice(0, 8)}…{priceData.treasury_address?.slice(-6)}
                    </span>
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-purple-300 flex-shrink-0 mt-0.5" />
                <p className="text-purple-200/60 text-[10px] leading-relaxed">
                  This is an on-chain RLUSD payment. You'll sign the transaction in Xaman (Xumm). 
                  Ensure your wallet has an active RLUSD trustline and sufficient balance.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={handleClose} className="text-white/40 hover:text-white">
                Cancel
              </Button>
              <Button
                onClick={handleInitiatePayment}
                disabled={loadingPrice || !!error || !priceData}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white gap-2"
              >
                <Wallet className="w-4 h-4" />
                Pay {priceData?.price_rlusd || '…'} RLUSD
              </Button>
            </DialogFooter>
          </>
        )}

        {step === STEPS.SIGNING && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <QrCode className="w-5 h-5 text-blue-400" />
                Sign in Xaman
              </DialogTitle>
              <DialogDescription className="text-white/50">
                Open Xaman to approve the RLUSD payment
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {payloadData?.qr_url && (
                <div className="flex justify-center">
                  <img src={payloadData.qr_url} alt="Xaman QR" className="w-48 h-48 rounded-xl bg-white p-2" />
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-blue-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Waiting for signature…</span>
              </div>

              <div className="text-center space-y-2">
                <p className="text-white/30 text-[10px]">
                  Sending <span className="text-amber-300 font-semibold">{priceData?.price_rlusd} RLUSD</span> to Treasury
                </p>
                {payloadData?.sign_url && (
                  <Button
                    variant="ghost"
                    onClick={() => window.open(payloadData.sign_url, '_blank')}
                    className="text-blue-400 hover:text-blue-300 text-xs gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Open Xaman
                  </Button>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose} className="text-white/40 hover:text-white">
                Cancel
              </Button>
            </DialogFooter>
          </>
        )}

        {step === STEPS.SUCCESS && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="w-5 h-5" />
                Purchase Complete!
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center space-y-2">
                <p className="text-emerald-300 font-semibold text-sm">{txResult?.name || widget?.name}</p>
                <p className="text-white/50 text-xs">is now yours!</p>
                <p className="text-emerald-200 font-bold text-lg">{txResult?.price_rlusd} RLUSD</p>
              </div>

              {txResult?.tx_hash && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <p className="text-white/30 text-[9px] mb-1">Transaction Hash</p>
                  <a
                    href={`https://livenet.xrpl.org/transactions/${txResult.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 text-[10px] font-mono hover:underline break-all flex items-center gap-1"
                  >
                    {txResult.tx_hash.slice(0, 20)}…{txResult.tx_hash.slice(-10)}
                    <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                  </a>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        )}

        {step === STEPS.ERROR && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-300">
                <XCircle className="w-5 h-5" />
                Payment Failed
              </DialogTitle>
            </DialogHeader>

            <div className="py-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                <p className="text-red-300 text-sm">{error || 'Something went wrong'}</p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={handleClose} className="text-white/40 hover:text-white">
                Close
              </Button>
              <Button onClick={() => { setStep(STEPS.CONFIRM); setError(null); }} className="bg-purple-600 text-white">
                Try Again
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}