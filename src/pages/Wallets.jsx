import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePageSignal } from '@/hooks/usePageSignal';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Wallet, ArrowLeft, Loader2, QrCode, CheckCircle, RefreshCw, Globe, FlaskConical } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AskAxiButton from '@/components/AskAxiButton';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { logAdminAction } from '@/lib/adminAuditLog';
import WalletCard from '../components/WalletCard';
import TransactionAlerts from '../components/TransactionAlerts';
import { Badge } from "@/components/ui/badge";
import WidgetPageNavBar from '@/components/widgets/WidgetPageNavBar';
import AxiNFTExplainer from '@/components/widgets/AxiNFTExplainer';

export default function WalletsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [addMode, setAddMode] = useState('xumm'); // 'xumm' | 'manual' | 'generate'
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
      const allWallets = await base44.entities.Wallet.list('-created_date', 100);
      // Sync live balances for treasury wallet
      const updated = await Promise.all(allWallets.map(async (w) => {
        if (w.classic_address === 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h') {
          try {
            const res = await base44.functions.invoke('getBalance', { wallet_id: w.id });
            if (res.data?.balance !== undefined) {
              return { ...w, balance: res.data.balance };
            }
          } catch (e) {}
        }
        return w;
      }));
      return updated;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const createWallet = useMutation({
    mutationFn: async ({ name, network }) => {
      const res = await base44.functions.invoke('createWallet', { name, network });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast.success('Wallet generated successfully');
      logAdminAction({ action: 'wallet_create', target_entity: 'Wallet', details: { name, network } });
      resetForm();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || 'Failed to generate wallet');
    }
  });

  const handleCreate = () => {
    const walletName = name.trim() || `Wallet ${Date.now().toString(36)}`;
    createWallet.mutate({ name: walletName, network });
  };

  const refreshBalance = async (wallet_id) => {
    try {
      const response = await base44.functions.invoke('getBalance', { wallet_id });
      if (response.data.success || response.data.balance !== undefined) {
        queryClient.invalidateQueries({ queryKey: ['wallets'] });
        toast.success('Balance synced: ' + response.data.balance + ' XRP');
      }
    } catch (error) {
      toast.error('Failed to sync balance');
      console.error(error);
    }
  };

  const handleAddExisting = async () => {
    if (!name.trim() || !classicAddress.trim()) {
      toast.error('Please enter a wallet name and address');
      return;
    }
    // Check if wallet with this address already exists
    const existing = await base44.entities.Wallet.filter({ classic_address: classicAddress.trim() });
    if (existing && existing.length > 0) {
      toast.info(`Wallet already registered: ${existing[0].name || classicAddress}`);
      resetForm();
      return;
    }
    base44.entities.Wallet.create({
     name,
     classic_address: classicAddress,
     encrypted_seed: seed || undefined,
     network: addMode === 'manual' ? network : 'mainnet',
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
          const account = res.data.account;
          setClassicAddress(account);
          // Auto-save the wallet immediately on XUMM resolve
          autoSaveXummWallet(account);
        } else if (res.data?.expired || attempts >= 60) {
          clearInterval(iv);
          setXummPolling(false);
          toast.error('QR expired — please try again');
          setXummQr(null);
        }
      } catch { clearInterval(iv); setXummPolling(false); }
    }, 2000);
  };

  const autoSaveXummWallet = async (account) => {
    const walletName = name.trim() || `XUMM Wallet (${account.slice(0, 8)}...)`;
    try {
      // Check if wallet with this address already exists
      const existing = await base44.entities.Wallet.filter({ classic_address: account });
      if (existing && existing.length > 0) {
        toast.info(`Wallet already registered: ${existing[0].name || account}`);
        setTimeout(() => resetForm(), 1500);
        return;
      }
      await base44.entities.Wallet.create({
        owner_id: user?.id || user?.email || '',
        name: walletName,
        classic_address: account,
        network: 'mainnet',
        balance: 0,
      });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast.success(`Wallet "${walletName}" added successfully!`);
      // Clear state immediately to prevent manual add after auto-save
      setXummResolved(false);
      setXummQr(null);
      setClassicAddress('');
      setTimeout(() => resetForm(), 1800);
    } catch (err) {
      toast.error('Wallet imported but failed to save — please click Add Wallet');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <WidgetPageNavBar
        title="XRPL Wallets"
        subtitle="Manage your DIDs & XRPL wallets"
        icon={Wallet}
      />
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
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
               onClick={() => { setNetwork('mainnet'); setAddMode('generate'); setShowCreate(true); }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Generate New
              </Button>
              <Button
                variant="outline"
                onClick={() => { setNetwork('mainnet'); setAddMode('xumm'); setShowCreate(true); setXummQr(null); setXummResolved(false); }}
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-light text-white">
                {addMode === 'generate' ? 'Generate New Wallet' : 'Add Existing Wallet'}
              </CardTitle>
              {addMode !== 'generate' && (
                <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
                  <button onClick={() => setAddMode('xumm')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${addMode === 'xumm' ? 'bg-purple-600 text-white' : 'text-white/50 hover:text-white'}`}>
                    <QrCode className="w-3 h-3" /> XUMM QR
                  </button>
                  <button onClick={() => setAddMode('manual')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${addMode === 'manual' ? 'bg-purple-600 text-white' : 'text-white/50 hover:text-white'}`}>
                    <Wallet className="w-3 h-3" /> Manual
                  </button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-purple-200/90">Wallet Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Wallet" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
                {addMode === 'generate' ? (
                  <div className="space-y-2">
                    <Label className="text-purple-200/90">Network</Label>
                    <Select value={network} onValueChange={setNetwork}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mainnet">Mainnet</SelectItem>
                        <SelectItem value="testnet">Testnet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-purple-200/90">Network</Label>
                    <div className="h-10 rounded-md border border-white/10 bg-white/5 px-3 flex items-center justify-between text-sm text-white">
                      <span>Mainnet</span>
                      <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20">Xumm</Badge>
                    </div>
                    <p className="text-xs text-white/40">Xumm imports are saved as mainnet wallets.</p>
                  </div>
                )}
              </div>

              {/* XUMM QR mode */}
              {addMode === 'xumm' && (
                <div className="space-y-4">
                  {!xummQr && !xummResolved && (
                    <Button onClick={initiateXumm} disabled={xummLoading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-11">
                      {xummLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating QR...</> : <><QrCode className="w-4 h-4 mr-2" />Generate XUMM QR Code</>}
                    </Button>
                  )}
                  {xummQr && !xummResolved && (
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-white p-3 rounded-xl shadow-xl">
                        <img src={xummQr} alt="XUMM QR" className="w-48 h-48 object-contain" />
                      </div>
                      <p className="text-sm text-purple-300/70 flex items-center gap-2">
                        {xummPolling && <Loader2 className="w-3 h-3 animate-spin" />}
                        {xummPolling ? 'Waiting for scan...' : 'Open XUMM and scan'}
                      </p>
                      <Button variant="outline" size="sm" onClick={initiateXumm} className="border-white/20 text-white/50 hover:text-white gap-1.5">
                        <RefreshCw className="w-3 h-3" /> Refresh QR
                      </Button>
                    </div>
                  )}
                  {xummResolved && (
                   <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
                     <CheckCircle className="w-5 h-5 text-green-400" />
                     <div>
                       <p className="text-green-300 text-sm font-medium">Wallet saved — closing form...</p>
                       <p className="text-green-400/70 text-xs font-mono mt-0.5">{classicAddress}</p>
                     </div>
                     <Loader2 className="ml-auto w-4 h-4 text-green-400 animate-spin" />
                   </div>
                  )}
                </div>
              )}

              {/* Manual mode */}
              {addMode === 'manual' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-purple-200/90">Classic Address <span className="text-red-400">*</span></Label>
                    <Input value={classicAddress} onChange={(e) => setClassicAddress(e.target.value)} placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXX" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-purple-200/90">Seed <span className="text-white/30 text-xs">(optional)</span></Label>
                    <Input type="password" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="sXXXXXXXXXXXXXXXXXXXXXXXXXXXX" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono text-sm" />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {addMode === 'generate' && (
                  <Button onClick={handleCreate} disabled={createWallet.isPending} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    {createWallet.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : 'Generate Wallet'}
                  </Button>
                )}
                {addMode === 'manual' && (
                  <Button onClick={handleAddExisting} disabled={!classicAddress} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    Add Wallet
                  </Button>
                )}
                {addMode === 'xumm' && !xummResolved && xummQr && !xummResolved && (
                  <Button onClick={handleAddExisting} disabled={!classicAddress} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    Add Wallet Manually
                  </Button>
                )}
                <Button variant="outline" onClick={resetForm} className="border-white/10 text-white hover:bg-white/5">Cancel</Button>
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
            <AxiNFTExplainer
              featureName="XRPL Wallets"
              featurePath="wallet.create"
              widgetName="Create New Wallet Widget"
              nftId="WIDGET-WM-005"
              description="Create, import, and manage XRPL wallets. Each wallet can hold XRP, RLUSD, and serve as a DID anchor for your sovereign identity in the Village."
              isUnlocked={true}
              setupSteps={[
                'Your DID must be published on XRPL mainnet — this is your sovereign identity anchor.',
                'You can generate new wallets or import existing ones via Xaman (Xumm) QR scanning.',
                'Each wallet is encrypted and stored securely — only you control the keys.',
                'Publish a wallet as a DID to anchor your identity on-chain permanently.',
                'Widget NFTs can gate advanced wallet features like multi-sig and custom signatures.',
              ]}
            />
            <Tabs defaultValue="all" className="space-y-5">
              <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl flex gap-1 h-auto w-fit">
                {[
                  { value: 'all', label: 'All Wallets', count: wallets.length, gradient: 'from-purple-600 to-pink-600' },
                  { value: 'mainnet', label: 'Mainnet', count: wallets.filter(w => w.network === 'mainnet').length, icon: Globe, gradient: 'from-emerald-500 to-teal-600' },
                  { value: 'testnet', label: 'Testnet', count: wallets.filter(w => w.network === 'testnet').length, icon: FlaskConical, gradient: 'from-amber-500 to-orange-500' },
                ].map(({ value, label, count, icon: Icon, gradient }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      text-white/50 hover:text-white/80
                      data-[state=active]:bg-gradient-to-r data-[state=active]:${gradient}
                      data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-900/40`}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    {label}
                    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-white/20 text-xs">
                      {count}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {['all', 'mainnet', 'testnet'].map(tab => (
                <TabsContent key={tab} value={tab}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {wallets
                      .filter(w => tab === 'all' || w.network === tab)
                      .map(wallet => (
                        <WalletCard key={wallet.id} wallet={wallet} onRefresh={refreshBalance} />
                      ))}
                  </div>
                  {wallets.filter(w => tab === 'all' || w.network === tab).length === 0 && (
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                      <CardContent className="text-center py-10">
                        <p className="text-white/40 text-sm">No {tab} wallets found</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}