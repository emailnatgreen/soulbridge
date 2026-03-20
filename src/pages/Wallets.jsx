import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePageSignal } from '@/hooks/usePageSignal';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Wallet, ArrowLeft, Loader2, QrCode, CheckCircle, RefreshCw } from 'lucide-react';
import AskAxiButton from '@/components/AskAxiButton';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import WalletCard from '../components/WalletCard';
import TransactionAlerts from '../components/TransactionAlerts';
import { Badge } from "@/components/ui/badge";

export default function WalletsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [addMode, setAddMode] = useState('xumm'); // 'xumm' | 'manual'
  const [name, setName] = useState('');
  const [network, setNetwork] = useState('mainnet');
  const [classicAddress, setClassicAddress] = useState('');
  const [seed, setSeed] = useState('');

  // XUMM state
  const [xummLoading, setXummLoading] = useState(false);
  const [xummQr, setXummQr] = useState(null);
  const [xummPolling, setXummPolling] = useState(false);
  const [xummResolved, setXummResolved] = useState(false);

  const queryClient = useQueryClient();
  usePageSignal();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: wallets = [], isLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      // Fetch all wallets in the system
      return await base44.entities.Wallet.list('-created_date', 100);
    },
    enabled: !!user,
  });

  const createWallet = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('createWallet', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast.success('Wallet created successfully');
      setShowCreate(false);
      setName('');
      setNetwork('testnet');
    },
    onError: (error) => {
      toast.error('Failed to create wallet');
      console.error(error);
    }
  });

  const refreshBalance = async (wallet_id) => {
    try {
      const response = await base44.functions.invoke('getBalance', { wallet_id });
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['wallets'] });
        toast.success('Balance updated: ' + response.data.balance + ' XRP');
      }
    } catch (error) {
      toast.error('Failed to refresh balance');
      console.error(error);
    }
  };

  const handleCreate = () => {
    if (!name.trim()) { toast.error('Please enter a wallet name'); return; }
    createWallet.mutate({ name, network });
  };

  const handleAddExisting = () => {
    if (!name.trim() || !classicAddress.trim()) {
      toast.error('Please enter a wallet name and address');
      return;
    }
    base44.entities.Wallet.create({
      name,
      classic_address: classicAddress,
      encrypted_seed: seed || undefined,
      network,
      balance: 0,
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast.success('Wallet added successfully');
      resetForm();
    });
  };

  const resetForm = () => {
    setShowCreate(false);
    setName('');
    setClassicAddress('');
    setSeed('');
    setXummQr(null);
    setXummResolved(false);
    setXummPolling(false);
  };

  const initiateXumm = async () => {
    setXummLoading(true);
    setXummQr(null);
    setXummResolved(false);
    try {
      const res = await base44.functions.invoke('xummSignIn', {});
      if (res.data?.qr_png && res.data?.payload_id) {
        setXummQr(res.data.qr_png);
        pollXumm(res.data.payload_id);
      } else {
        toast.error('Could not generate XUMM QR — use manual entry');
        setAddMode('manual');
      }
    } catch {
      toast.error('XUMM unavailable — use manual entry');
      setAddMode('manual');
    } finally {
      setXummLoading(false);
    }
  };

  const pollXumm = (payloadId) => {
    setXummPolling(true);
    let attempts = 0;
    const iv = setInterval(async () => {
      attempts++;
      try {
        const res = await base44.functions.invoke('xummCheckPayload', { payload_id: payloadId });
        if (res.data?.resolved && res.data?.account) {
          clearInterval(iv);
          setXummPolling(false);
          setXummResolved(true);
          setClassicAddress(res.data.account);
          toast.success('Wallet address imported from XUMM!');
        } else if (res.data?.expired || attempts >= 60) {
          clearInterval(iv);
          setXummPolling(false);
          toast.error('QR expired — please try again');
          setXummQr(null);
        }
      } catch { clearInterval(iv); setXummPolling(false); }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Link to={createPageUrl('Home')} className="inline-flex items-center text-purple-300/80 hover:text-purple-200 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light tracking-tight text-white mb-1">
                XRPL <span className="font-semibold">Wallets</span>
              </h1>
              <p className="text-sm text-purple-300/60">Manage your DIDs</p>
            </div>
            <div className="flex gap-3">
              <AskAxiButton
                label="Ask Axi"
                context="You are reviewing the XRPL Wallets dashboard for SoulBridge Village. As financial steward and Mother Boss, please assess: current wallet balances across all wallets, any wallets with critically low balances, whether testnet vs mainnet distribution is appropriate, and whether the wallet infrastructure adequately supports current Village operations. Flag any financial risks."
              />
              <Button 
                onClick={() => { setShowCreate(!showCreate); setAddMode('generate'); }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Generate New
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowCreate(!showCreate); setAddMode('xumm'); }}
                className="border-white/10 text-white hover:bg-white/5"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Add Existing
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {showCreate && (
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 mb-8">
            <CardHeader>
              <CardTitle className="text-xl font-light text-white">Create New Wallet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-purple-200/90">Wallet Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Wallet"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="network" className="text-purple-200/90">Network</Label>
                <Select value={network} onValueChange={setNetwork}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="testnet">Testnet</SelectItem>
                    <SelectItem value="mainnet">Mainnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={handleCreate}
                  disabled={createWallet.isPending}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {createWallet.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create'
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowCreate(false)}
                  className="border-white/10 text-white hover:bg-white/5"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse bg-white/5 rounded-xl h-64" />
            ))}
          </div>
        ) : wallets.length === 0 ? (
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="text-center py-16">
              <Wallet className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-light text-white mb-2">No Wallets Yet</h3>
              <p className="text-white/60 text-sm mb-6">Create your first XRPL wallet to get started</p>
              <Button 
                onClick={() => setShowCreate(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Wallet
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <TransactionAlerts wallets={wallets} pollInterval={60000} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {wallets.map(wallet => (
                <WalletCard key={wallet.id} wallet={wallet} onRefresh={refreshBalance} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}