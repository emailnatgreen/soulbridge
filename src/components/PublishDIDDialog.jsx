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
      // Use a JSON endpoint that serves the actual DID document, not a webpage
      setDidUri(`https://soulbridge.base44.app/api/dids/${wallet.classic_address}`);
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
          // Delay success callback to allow XRPL ledger to propagate before verification
          setTimeout(() => {
            if (onSuccess) onSuccess();
          }, 12000);
          } else if (status.resolved && !status.signed) {
          clearInterval(interval);
          setPollingInterval(null);
          setResult({ success: false, message: 'Signing request was rejected or expired' });
          setStep('error');
        }
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

        {/* Testnet unfunded warning */}


        {/* FORM STEP */}
        {(step === 'form' || step === 'loading') && (
         <div className="space-y-4 py-2">
           <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
             <div className="mb-3">
               <p className="text-xs font-semibold text-blue-900 mb-1">XRPL Account</p>
               <code className="text-xs text-blue-800 break-all block mb-2">{wallet?.classic_address}</code>
               <a
                 href={`https://xrpscan.com/account/${wallet?.classic_address}`}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
               >
                 View on XRPScan <ExternalLink className="w-3 h-3" />
               </a>
             </div>
             <div className="grid grid-cols-2 gap-3 text-xs">
               <div>
                 <p className="text-blue-700 font-medium">Network</p>
                 <Badge variant="outline" className="text-xs mt-1">{wallet?.network}</Badge>
               </div>
               <div>
                 <p className="text-blue-700 font-medium">Balance</p>
                 <p className="text-blue-800 mt-1">{wallet?.balance || 0} XRP</p>
               </div>
             </div>
           </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              A small XRP reserve (~0.2 XRP) will be locked on-chain for the DID object.
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs">
              <p className="text-gray-700 font-medium mb-2">DID Document URI</p>
              <code className="text-xs text-gray-800 break-all block bg-white p-2 rounded border border-gray-200">{didUri}</code>
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
              {qrData?.expires && <span>Expires: {new Date(qrData.expires).toLocaleTimeString()}</span>}
            </div>
            <div className="space-y-3">
              {result.txid && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-xs font-medium text-gray-700 mb-2">Transaction Hash</div>
                  <code className="text-xs text-gray-800 break-all block bg-white p-2 rounded border border-gray-200 mb-2">{result.txid}</code>
                  <a
                    href={`https://xrpscan.com/tx/${result.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    View Transaction on XRPScan <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {result.account && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-xs font-medium text-gray-700 mb-2">Account Address</div>
                  <code className="text-xs text-gray-800 break-all block bg-white p-2 rounded border border-gray-200 mb-2">{result.account}</code>
                  <a
                    href={`https://xrpscan.com/account/${result.account}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    View Account on XRPScan <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-xs font-medium text-blue-900 mb-2">DID Document URI</div>
                <code className="text-xs text-blue-800 break-all block bg-white p-2 rounded border border-blue-200">{didUri}</code>
              </div>
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