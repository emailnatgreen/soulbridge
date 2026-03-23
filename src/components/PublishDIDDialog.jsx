import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, QrCode, AlertCircle, ExternalLink, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function PublishDIDDialog({ wallet, open, onOpenChange, onSuccess }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('form'); // form | qr | waiting | done | error
  const [didUri, setDidUri] = useState('');
  const [qrData, setQrData] = useState(null);
  const [result, setResult] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);

  useEffect(() => {
    if (wallet && open) {
      setDidUri(`https://soulbridge.base44.app/SharedDidView?address=${wallet.classic_address}`);
      setStep('form');
      setQrData(null);
      setResult(null);
    }
  }, [wallet, open]);

  useEffect(() => {
    return () => { if (pollingInterval) clearInterval(pollingInterval); };
  }, [pollingInterval]);

  const handleClose = () => {
    if (pollingInterval) clearInterval(pollingInterval);
    onOpenChange(false);
  };

  const handlePublish = async () => {
    setStep('loading');
    let data;
    try {
      const response = await base44.functions.invoke('publishDID', {
        wallet_id: wallet.id,
        did_uri: didUri
      });
      data = response.data;
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.details || err.message || 'Failed to create signing request';
      toast.error(msg);
      setStep('form');
      return;
    }

    if (!data?.success) {
      toast.error(data?.error || 'Failed to create signing request');
      setStep('form');
      return;
    }

    setQrData(data);
    setStep('qr');

    // Start polling
    const interval = setInterval(async () => {
      try {
        const statusRes = await base44.functions.invoke('publishDID', {
          action: 'check_status',
          uuid: data.uuid,
          wallet_id: wallet.id
        });
        const status = statusRes.data;

        if (status.signed) {
          clearInterval(interval);
          setPollingInterval(null);
          // Sync wallet to DB — signed means tx was submitted
          base44.entities.Wallet.update(wallet.id, {
            is_published: true,
            published_at: new Date().toISOString(),
            published_txid: status.txid || 'pending'
          }).catch(err => console.error('Failed to save publication status:', err));

          setResult({ success: true, txid: status.txid, account: status.account });
          setStep('done');
          toast.success('✅ DID published on XRPL!');
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['wallets'] });
            queryClient.invalidateQueries({ queryKey: ['dh-wallets'] });
            queryClient.invalidateQueries({ queryKey: ['user-wallets'] });
          }, 500);
          if (onSuccess) onSuccess();
        } else if (status.resolved && !status.signed) {
          clearInterval(interval);
          setPollingInterval(null);
          setResult({ success: false, message: 'Signing request was rejected or expired' });
          setStep('error');
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 3000);

    setPollingInterval(interval);
    setTimeout(() => { clearInterval(interval); }, 600000);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600" />
            Publish DID On-Chain
          </DialogTitle>
          <DialogDescription>
            Submit a DIDSet transaction to XRPL via Xaman to publish your DID document
          </DialogDescription>
        </DialogHeader>

        {/* FORM STEP */}
        {(step === 'form' || step === 'loading') && (
          <div className="space-y-4 py-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-medium mb-1">Account: <code className="text-xs">{wallet?.classic_address}</code></p>
              <p className="text-xs mt-1">Network: <Badge variant="outline" className="text-xs">{wallet?.network}</Badge></p>
            </div>

            <div>
              <Label htmlFor="did-uri">DID Document URI</Label>
              <Input
                id="did-uri"
                value={didUri}
                onChange={(e) => setDidUri(e.target.value)}
                placeholder="https://..."
                className="mt-1 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">This URI points to your DID document and will be stored on-chain.</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              A small XRP reserve (~0.2 XRP) will be locked on-chain for the DID object.
            </div>

            <Button
              className="w-full"
              onClick={handlePublish}
              disabled={!didUri || step === 'loading'}
            >
              {step === 'loading' ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating QR Code...</>
              ) : (
                <><QrCode className="w-4 h-4 mr-2" /> Generate Signing QR</>
              )}
            </Button>
          </div>
        )}

        {/* QR STEP */}
        {step === 'qr' && qrData && (
          <div className="space-y-4 py-2">
            <div className="bg-white border-2 border-indigo-200 rounded-lg p-4 flex justify-center">
              <img src={qrData.qr_png} alt="Xaman QR Code" className="w-56 h-56" />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-800 mb-2">Instructions:</p>
              <ol className="list-decimal ml-4 text-xs text-blue-700 space-y-1">
                <li>Open the Xaman app on your mobile device</li>
                <li>Tap the scan button and scan the QR code</li>
                <li>Review the DIDSet transaction and approve</li>
              </ol>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Waiting for your signature...
              </div>
              {qrData.expires && <span>Expires: {new Date(qrData.expires).toLocaleTimeString()}</span>}
            </div>

            <Button variant="outline" className="w-full" onClick={() => window.open(qrData.qr_link, '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" /> Open in Xaman App
            </Button>
          </div>
        )}

        {/* SUCCESS STEP */}
        {step === 'done' && result?.success && (
          <div className="space-y-4 py-2">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <CheckCircle className="w-14 h-14 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-green-900 mb-1">DID Published on XRPL!</h3>
              <p className="text-sm text-green-700">Your DID is now live on the blockchain.</p>
            </div>
            {result.txid && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Transaction ID:</div>
                <code className="text-xs break-all">{result.txid}</code>
                <a
                  href={`https://xrpscan.com/tx/${result.txid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 flex items-center gap-1 mt-2"
                >
                  View on XRPScan <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* ERROR STEP */}
        {step === 'error' && (
          <div className="py-2">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <XCircle className="w-14 h-14 text-red-600 mx-auto mb-3" />
              <h3 className="font-semibold text-red-900 mb-1">Publication Failed</h3>
              <p className="text-sm text-red-700">{result?.message || 'Transaction was not completed'}</p>
            </div>
          </div>
        )}

        <DialogFooter>
          {(step === 'done' || step === 'error') && (
            <Button variant="outline" onClick={() => setStep('form')}>Try Again</Button>
          )}
          <Button onClick={handleClose} variant={step === 'done' ? 'default' : 'outline'}>
            {step === 'done' ? 'Done' : 'Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}