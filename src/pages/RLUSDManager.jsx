import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import TrustlineReissueDialog from '../components/TrustlineReissueDialog';

export default function RLUSDManager() {
  const [walletStatuses, setWalletStatuses] = useState({});
  const [reissueDialogOpen, setReissueDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: wallets = [], isLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => base44.entities.Wallet.list()
  });

  const checkStatusMutation = useMutation({
    mutationFn: async (wallet_id) => {
      const response = await base44.functions.invoke('checkRLUSDStatus', { wallet_id });
      return { wallet_id, status: response.data };
    },
    onSuccess: ({ wallet_id, status }) => {
      setWalletStatuses(prev => ({ ...prev, [wallet_id]: status }));
    }
  });

  const addTrustlineMutation = useMutation({
    mutationFn: (wallet_id) => base44.functions.invoke('addRLUSDTrustline', { wallet_id }),
    onSuccess: (response, wallet_id) => {
      if (response.data?.success) {
        toast.success(response.data.message || 'RLUSD trustline added');
      } else if (response.data?.already_exists) {
        toast.info('RLUSD trustline already exists');
      } else {
        toast.error(response.data?.error || 'Failed to add trustline');
      }
      checkStatusMutation.mutate(wallet_id);
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });

  const batchAddMutation = useMutation({
    mutationFn: (wallet_ids) => base44.functions.invoke('batchAddRLUSD', { wallet_ids }),
    onSuccess: (response) => {
      toast.dismiss();
      const summary = response.data?.summary;
      if (summary) {
        toast.success(`✅ ${summary.successful} trustlines added, ${summary.already_existed} already existed, ${summary.failed} failed`);
      } else {
        toast.success('RLUSD trustlines processed');
      }
      wallets.forEach(w => checkStatusMutation.mutate(w.id));
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(`Failed to add trustlines: ${error.message}`);
    }
  });

  const checkAllStatuses = () => {
    wallets.forEach(wallet => checkStatusMutation.mutate(wallet.id));
  };

  const addToAllWallets = () => {
    const eligibleWallets = wallets
      .filter(w => {
        const status = walletStatuses[w.id];
        return status && !status.has_rlusd_trustline && status.can_add_trustline;
      })
      .map(w => w.id);
    
    if (eligibleWallets.length > 0) {
      toast.loading(`Adding RLUSD to ${eligibleWallets.length} wallets...`);
      batchAddMutation.mutate(eligibleWallets);
    } else {
      toast.error('No eligible wallets found. Wallets need ≥1.2 XRP and no existing RLUSD trustline.');
    }
  };

  React.useEffect(() => {
    if (wallets.length > 0 && Object.keys(walletStatuses).length === 0) {
      checkAllStatuses();
    }
  }, [wallets]);

  const stats = {
    total: wallets.length,
    ready: Object.values(walletStatuses).filter(s => s.has_rlusd_trustline).length,
    needsSetup: Object.values(walletStatuses).filter(s => !s.has_rlusd_trustline && s.can_add_trustline).length,
    needsFunding: Object.values(walletStatuses).filter(s => !s.can_add_trustline).length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-light text-white">RLUSD Manager</h1>
                <p className="text-sm text-purple-300/60">Manage RLUSD trustlines for all wallets</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={checkAllStatuses}
                disabled={checkStatusMutation.isPending}
                className="border-white/10 text-white"
              >
                {checkStatusMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh All
              </Button>
              <Button 
                variant="outline"
                onClick={() => setReissueDialogOpen(true)}
                className="border-white/10 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reissue Trustlines
              </Button>
              <Button 
                onClick={addToAllWallets}
                disabled={batchAddMutation.isPending || stats.needsSetup === 0}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title={stats.needsSetup === 0 ? 'No eligible wallets (need ≥1.2 XRP and no existing trustline)' : 'Add RLUSD trustlines to all eligible wallets'}
              >
                {batchAddMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  `Add RLUSD to All (${stats.needsSetup})`
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/80">Total Wallets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light text-white">{stats.total}</p>
              <p className="text-xs text-white/50 mt-1">All mainnet wallets</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-green-300/80 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                RLUSD Ready
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light text-white">{stats.ready}</p>
              <p className="text-xs text-white/50 mt-1">Already has trustline</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-yellow-300/80 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Needs Setup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light text-white">{stats.needsSetup}</p>
              <p className="text-xs text-white/50 mt-1">Has ≥1.2 XRP, ready to add</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-red-300/80 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Needs Funding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light text-white">{stats.needsFunding}</p>
              <p className="text-xs text-white/50 mt-1">Needs more XRP (1.2 min)</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Wallet Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-3 pr-4">
                {isLoading ? (
                  <div className="text-center py-8 text-white/60">Loading wallets...</div>
                ) : wallets.length === 0 ? (
                  <div className="text-center py-8 text-white/60">No wallets found</div>
                ) : (
                  wallets.map(wallet => {
                    const status = walletStatuses[wallet.id];
                    const isChecking = checkStatusMutation.isPending;
                    const isAdding = addTrustlineMutation.isPending;

                    return (
                      <div
                        key={wallet.id}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-white font-medium">
                              {wallet.name || wallet.agent_name || 'Unnamed Wallet'}
                            </h3>
                            {status?.has_rlusd_trustline ? (
                              <Badge className="bg-green-500/20 text-green-300">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                RLUSD Ready
                              </Badge>
                            ) : status?.can_add_trustline ? (
                              <Badge className="bg-yellow-500/20 text-yellow-300">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Needs Setup
                              </Badge>
                            ) : status ? (
                              <Badge className="bg-red-500/20 text-red-300">
                                <XCircle className="w-3 h-3 mr-1" />
                                Needs Funding
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-500/20 text-slate-300">
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Checking...
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-white/50 font-mono mb-2">{wallet.classic_address}</p>
                          {status && (
                            <div className="flex items-center gap-4 text-sm text-white/60">
                              <span>XRP: {status.xrp_balance.toFixed(2)}</span>
                              {status.has_rlusd_trustline && (
                                <span>RLUSD: {status.rlusd_balance.toFixed(2)}</span>
                              )}
                              {status.needs_funding > 0 && (
                                <span className="text-red-300">
                                  Needs {status.needs_funding.toFixed(2)} XRP
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {status && !status.has_rlusd_trustline && status.can_add_trustline && (
                            <Button
                              size="sm"
                              onClick={() => addTrustlineMutation.mutate(wallet.id)}
                              disabled={isAdding}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              {isAdding ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                'Add RLUSD'
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => checkStatusMutation.mutate(wallet.id)}
                            disabled={isChecking}
                            className="border-white/10 text-white"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <TrustlineReissueDialog
        open={reissueDialogOpen}
        onClose={() => {
          setReissueDialogOpen(false);
          checkAllStatuses();
        }}
        wallets={wallets}
      />
    </div>
  );
}