import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Wallet, QrCode, CheckCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

const XUMM_API_KEY = 'c75c5a71-8c25-4d74-b78a-5b98b8b5b7c9'; // public key for sign-in only

export default function CreateManualWallet() {
  const [name, setName] = useState('');
  const [classicAddress, setClassicAddress] = useState('');
  const [encryptedSeed, setEncryptedSeed] = useState('');
  const [network, setNetwork] = useState('mainnet');
  const [notes, setNotes] = useState('');
  const [tab, setTab] = useState('xumm'); // 'xumm' | 'manual'

  // XUMM QR state
  const [xummLoading, setXummLoading] = useState(false);
  const [xummQr, setXummQr] = useState(null);
  const [xummPayloadId, setXummPayloadId] = useState(null);
  const [xummResolved, setXummResolved] = useState(false);
  const [xummPolling, setXummPolling] = useState(false);

  const queryClient = useQueryClient();

  const createWallet = useMutation({
    mutationFn: (data) => base44.entities.Wallet.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast.success('Wallet added successfully');
      setName('');
      setClassicAddress('');
      setEncryptedSeed('');
      setNotes('');
      setXummQr(null);
      setXummPayloadId(null);
      setXummResolved(false);
    },
    onError: () => toast.error('Failed to add wallet'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !classicAddress.trim()) {
      toast.error('Please fill in wallet name and address');
      return;
    }
    createWallet.mutate({
      name,
      classic_address: classicAddress,
      encrypted_seed: encryptedSeed || undefined,
      network,
      balance: 0,
      notes: notes || undefined,
    });
  };

  // --- XUMM flow ---
  const initiateXumm = async () => {
    setXummLoading(true);
    setXummQr(null);
    setXummPayloadId(null);
    setXummResolved(false);
    try {
      const res = await base44.functions.invoke('xummSignIn', {});
      if (res.data?.qr_png && res.data?.payload_id) {
        setXummQr(res.data.qr_png);
        setXummPayloadId(res.data.payload_id);
        pollXummResult(res.data.payload_id);
      } else {
        toast.error('Failed to generate XUMM QR. Please use manual entry.');
        setTab('manual');
      }
    } catch (err) {
      console.error(err);
      toast.error('XUMM unavailable. Please use manual entry.');
      setTab('manual');
    } finally {
      setXummLoading(false);
    }
  };

  const pollXummResult = (payloadId) => {
    setXummPolling(true);
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await base44.functions.invoke('xummCheckPayload', { payload_id: payloadId });
        if (res.data?.resolved && res.data?.account) {
          clearInterval(interval);
          setXummPolling(false);
          setXummResolved(true);
          setClassicAddress(res.data.account);
          toast.success(`Wallet detected: ${res.data.account.slice(0, 10)}...`);
        } else if (res.data?.expired || attempts >= maxAttempts) {
          clearInterval(interval);
          setXummPolling(false);
          toast.error('QR expired. Please try again.');
          setXummQr(null);
        }
      } catch {
        clearInterval(interval);
        setXummPolling(false);
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <Link to={createPageUrl('Wallets')} className="inline-flex items-center text-purple-300/80 hover:text-purple-200 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Wallets
          </Link>
          <div className="flex items-center gap-3">
            <Wallet className="w-8 h-8 text-purple-400" />
            <div>
              <h1 className="text-3xl font-light tracking-tight text-white mb-1">
                Add Existing <span className="font-semibold">Wallet</span>
              </h1>
              <p className="text-sm text-purple-300/60">Import your XRPL wallet via XUMM QR or manually</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">

        {/* Tab switcher */}
        <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
          <button
            onClick={() => setTab('xumm')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === 'xumm' ? 'bg-purple-600 text-white shadow' : 'text-white/50 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            Scan with XUMM
          </button>
          <button
            onClick={() => setTab('manual')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === 'manual' ? 'bg-purple-600 text-white shadow' : 'text-white/50 hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4" />
            Manual Entry
          </button>
        </div>

        {/* XUMM QR Panel */}
        {tab === 'xumm' && (
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-lg font-light text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-purple-400" />
                Scan with XUMM App
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-white/50 text-sm">
                Open your XUMM app and scan the QR code below. Your classic address will be automatically imported.
              </p>

              {!xummQr && !xummResolved && (
                <Button
                  onClick={initiateXumm}
                  disabled={xummLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12"
                >
                  {xummLoading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating QR...</>
                  ) : (
                    <><QrCode className="w-5 h-5 mr-2" />Generate XUMM QR Code</>
                  )}
                </Button>
              )}

              {xummQr && !xummResolved && (
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-white p-4 rounded-2xl shadow-xl">
                    <img src={xummQr} alt="XUMM QR Code" className="w-56 h-56 object-contain" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-purple-300/80">
                    {xummPolling && <Loader2 className="w-4 h-4 animate-spin" />}
                    {xummPolling ? 'Waiting for scan...' : 'QR ready — open XUMM and scan'}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={initiateXumm}
                    className="border-white/20 text-white/60 hover:text-white gap-2"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh QR
                  </Button>
                </div>
              )}

              {xummResolved && (
                <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-green-300 text-sm font-medium">Address imported!</p>
                    <p className="text-green-400/70 text-xs font-mono mt-0.5">{classicAddress}</p>
                  </div>
                  <Badge className="ml-auto bg-green-500/20 text-green-300 border-green-500/30">✓ Ready</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Wallet details form — shown always */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-lg font-light text-white">Wallet Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-purple-200/90">Wallet Name <span className="text-red-400">*</span></Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Main Wallet"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-purple-200/90">
                  Classic Address <span className="text-red-400">*</span>
                  {xummResolved && <Badge className="ml-2 bg-green-500/20 text-green-300 border-green-500/30 text-xs">From XUMM ✓</Badge>}
                </Label>
                <Input
                  value={classicAddress}
                  onChange={(e) => setClassicAddress(e.target.value)}
                  placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  className={`bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono text-sm ${xummResolved ? 'border-green-500/40' : ''}`}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-purple-200/90">
                  Seed <span className="text-white/30 text-xs">(optional — for signing transactions)</span>
                </Label>
                <Input
                  type="password"
                  value={encryptedSeed}
                  onChange={(e) => setEncryptedSeed(e.target.value)}
                  placeholder="sXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono text-sm"
                />
                <p className="text-xs text-white/30">Leave blank for watch-only wallet</p>
              </div>

              <div className="space-y-2">
                <Label className="text-purple-200/90">Network</Label>
                <Select value={network} onValueChange={setNetwork}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mainnet">Mainnet</SelectItem>
                    <SelectItem value="testnet">Testnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-purple-200/90">Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-20 resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={createWallet.isPending}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-12"
              >
                {createWallet.isPending ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Adding Wallet...</>
                ) : (
                  'Add Wallet'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}