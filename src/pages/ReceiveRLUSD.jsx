import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Copy, Wallet, AlertCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function ReceiveRLUSDPage() {
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [walletStatus, setWalletStatus] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: wallets = [], isLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      return await base44.entities.Wallet.list('-created_date', 100);
    },
    enabled: !!user,
  });

  const selectedWallet = wallets.find(w => w.id === selectedWalletId);

  // Check wallet status when wallet is selected
  React.useEffect(() => {
    if (selectedWalletId) {
      checkWalletStatus();
    }
  }, [selectedWalletId]);

  const checkWalletStatus = async () => {
    if (!selectedWalletId) return;
    setCheckingStatus(true);
    try {
      const response = await base44.functions.invoke('checkRLUSDStatus', {
        wallet_id: selectedWalletId
      });
      setWalletStatus(response.data);
    } catch (error) {
      toast.error('Failed to check wallet status');
    } finally {
      setCheckingStatus(false);
    }
  };

  const copyAddress = (address) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard!');
  };

  const setupTrustline = async () => {
    if (!selectedWallet) return;
    
    setCheckingStatus(true);
    try {
      const response = await base44.functions.invoke('addRLUSDTrustline', {
        wallet_id: selectedWallet.id
      });

      if (response.data.success) {
        toast.success('RLUSD trustline activated!');
        // Refetch wallet data
        window.location.reload();
      } else {
        toast.error(response.data.error || 'Failed to setup trustline');
      }
    } catch (error) {
      toast.error('Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setCheckingStatus(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <Link to={createPageUrl('Home')} className="inline-flex items-center text-purple-300/80 hover:text-purple-200 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-light tracking-tight text-white">
            Receive <span className="font-semibold">RLUSD</span>
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-xl font-light text-white">Select Wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              </div>
            ) : wallets.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <p className="text-white/60 mb-4">No wallets found</p>
                <Link to={createPageUrl('Wallets')}>
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                    Create Wallet
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="wallet" className="text-purple-200/90">
                    Select Wallet to Receive RLUSD
                  </Label>
                  <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Choose a wallet" />
                    </SelectTrigger>
                    <SelectContent>
                      {wallets.map(wallet => (
                        <SelectItem key={wallet.id} value={wallet.id}>
                          {wallet.name || wallet.classic_address?.slice(0, 12)}... ({wallet.network})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedWallet && (
                   <div className="space-y-4">
                     <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
                       <div className="flex items-center justify-between mb-2">
                         <span className="text-sm text-purple-300">Network</span>
                         <span className="text-sm font-medium text-white uppercase">{selectedWallet.network}</span>
                       </div>
                       <div className="flex items-center justify-between mb-2">
                         <span className="text-sm text-purple-300">XRP Balance</span>
                         <span className="text-sm font-medium text-white">{walletStatus?.xrp_balance?.toFixed(2) || '—'} XRP</span>
                       </div>
                       <div className="flex items-center justify-between">
                         <span className="text-sm text-purple-300">RLUSD Trustline</span>
                         {checkingStatus ? (
                           <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                         ) : (
                           <span className={`text-sm font-medium ${walletStatus?.has_rlusd_trustline ? 'text-green-400' : 'text-yellow-400'}`}>
                             {walletStatus?.has_rlusd_trustline ? 'Active' : 'Not Setup'}
                           </span>
                         )}
                       </div>
                     </div>

                     {walletStatus && !walletStatus?.has_rlusd_trustline && (
                      <div className="p-4 bg-amber-900/20 rounded-lg border border-amber-500/20 space-y-3">
                        <div className="flex gap-2">
                          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                          <p className="text-sm text-amber-200">
                            {walletStatus?.can_add_trustline 
                              ? 'This wallet needs to activate an RLUSD trustline before it can receive RLUSD.'
                              : `This wallet needs ${walletStatus?.needs_funding?.toFixed(2)} more XRP to set up an RLUSD trustline.`
                            }
                          </p>
                        </div>
                        <Button
                          onClick={setupTrustline}
                          disabled={checkingStatus || !walletStatus?.can_add_trustline}
                          className="w-full bg-amber-600 hover:bg-amber-700"
                          title={!walletStatus?.can_add_trustline ? 'Wallet needs at least 1.2 XRP' : ''}
                        >
                          {checkingStatus ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Setting up...
                            </>
                          ) : (
                            'Activate RLUSD Trustline'
                          )}
                        </Button>
                      </div>
                      )}

                      {walletStatus?.has_rlusd_trustline && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-purple-200/90">XRP Address</Label>
                          <div className="flex gap-2">
                            <Input
                              value={selectedWallet.classic_address || ''}
                              readOnly
                              className="bg-white/5 border-white/10 text-white font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              onClick={() => copyAddress(selectedWallet.classic_address)}
                              className="border-white/10 text-white hover:bg-white/5"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="p-4 bg-green-900/20 rounded-lg border border-green-500/20">
                          <h4 className="text-sm font-medium text-green-300 mb-2">Ready to Receive RLUSD</h4>
                          <ul className="text-xs text-green-200/70 space-y-1">
                            <li>✓ Your wallet has an active RLUSD trustline</li>
                            <li>✓ Share your address with the sender</li>
                            <li>✓ RLUSD will arrive within seconds</li>
                          </ul>
                        </div>
                      </>
                    )}

                    {selectedWallet.network === 'mainnet' && (
                      <div className="p-4 bg-amber-900/20 rounded-lg border border-amber-500/20">
                        <h4 className="text-sm font-medium text-amber-300 mb-2">Mainnet Reminder</h4>
                        <p className="text-xs text-amber-200/70">
                          This is a mainnet wallet. Ensure you only receive real RLUSD from verified sources.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}