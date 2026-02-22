import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function TrustlineReissueDialog({ open, onClose, wallets }) {
  const [selectedWallets, setSelectedWallets] = useState([]);
  const [reissueResults, setReissueResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const reissueMutation = useMutation({
    mutationFn: async (wallet_ids) => {
      const response = await base44.functions.invoke('reissueTrustlines', { wallet_ids });
      return response.data;
    },
    onSuccess: (data) => {
      setReissueResults(data);
      setIsProcessing(false);
      toast.success(`${data.summary.successful} trustlines reissued, ${data.summary.failed} failed`);
    },
    onError: (error) => {
      setIsProcessing(false);
      toast.error(`Reissue failed: ${error.message}`);
    }
  });

  const handleSelectWallet = (walletId) => {
    setSelectedWallets(prev => 
      prev.includes(walletId)
        ? prev.filter(id => id !== walletId)
        : [...prev, walletId]
    );
  };

  const handleSelectAll = () => {
    const eligibleWallets = wallets.filter(w => w.encrypted_seed && w.classic_address);
    setSelectedWallets(eligibleWallets.map(w => w.id));
  };

  const handleDeselectAll = () => {
    setSelectedWallets([]);
  };

  const handleReissue = () => {
    if (selectedWallets.length === 0) {
      toast.error('Please select at least one wallet');
      return;
    }
    setIsProcessing(true);
    setReissueResults(null);
    reissueMutation.mutate(selectedWallets);
  };

  const handleClose = () => {
    setSelectedWallets([]);
    setReissueResults(null);
    setIsProcessing(false);
    onClose();
  };

  const eligibleWallets = wallets.filter(w => w.encrypted_seed && w.classic_address);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Reissue RLUSD Trustlines
          </DialogTitle>
          <DialogDescription>
            Select wallets to reissue their RLUSD trustlines. This will remove old trustlines and create new ones with the current issuer.
          </DialogDescription>
        </DialogHeader>

        {!reissueResults ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {selectedWallets.length} of {eligibleWallets.length} wallets selected
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleSelectAll}
                  disabled={isProcessing}
                >
                  Select All
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleDeselectAll}
                  disabled={isProcessing}
                >
                  Deselect All
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[400px] border rounded-lg p-4">
              <div className="space-y-3">
                {eligibleWallets.map(wallet => (
                  <div
                    key={wallet.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedWallets.includes(wallet.id)}
                      onCheckedChange={() => handleSelectWallet(wallet.id)}
                      disabled={isProcessing}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{wallet.name}</p>
                      <p className="text-sm text-muted-foreground font-mono">{wallet.classic_address}</p>
                    </div>
                    <Badge variant="secondary">{wallet.balance.toFixed(2)} XRP</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button 
                onClick={handleReissue} 
                disabled={selectedWallets.length === 0 || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reissue Selected
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{reissueResults.summary.total}</p>
                </div>
                <div className="p-4 bg-green-500/10 rounded-lg">
                  <p className="text-sm text-green-700">Successful</p>
                  <p className="text-2xl font-bold text-green-700">{reissueResults.summary.successful}</p>
                </div>
                <div className="p-4 bg-red-500/10 rounded-lg">
                  <p className="text-sm text-red-700">Failed</p>
                  <p className="text-2xl font-bold text-red-700">{reissueResults.summary.failed}</p>
                </div>
              </div>

              <ScrollArea className="h-[350px] border rounded-lg p-4">
                <div className="space-y-2">
                  {reissueResults.results.map((result, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        result.success ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
                      }`}
                    >
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{result.wallet_name}</p>
                        <p className="text-sm text-muted-foreground font-mono truncate">{result.address}</p>
                        {result.success ? (
                          <>
                            <p className="text-sm text-green-700 mt-1">{result.message}</p>
                            <p className="text-xs text-muted-foreground">Attempts: {result.attempts}</p>
                          </>
                        ) : (
                          <p className="text-sm text-red-700 mt-1">{result.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}