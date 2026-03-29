import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Send, Loader2, Wallet, ArrowRight, Globe, FlaskConical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function SendPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedWalletId = urlParams.get('from_wallet_id') || '';

  const [network, setNetwork] = useState('mainnet');
  const [formData, setFormData] = useState({
    from_wallet_id: preselectedWalletId,
    recipient_name: '',
    recipient_address: '',
    from_address: '',
    amount: '',
    note: '',
    destination_tag: ''
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => base44.entities.Wallet.list('-created_date', 100),
    enabled: !!user
  });

  const activeWallets = wallets.filter(w => w.network === network);
  const selectedFromWallet = activeWallets.find(w => w.classic_address === formData.from_address) || activeWallets.find(w => w.id === formData.from_wallet_id);


  const createTransaction = useMutation({
    mutationFn: async (data) => {
      const transaction = await base44.entities.Transaction.create({
        from_wallet_id: data.from_wallet_id,
        recipient_name: data.recipient_name,
        recipient_address: data.recipient_address,
        amount: parseFloat(data.amount),
        note: data.note,
        destination_tag: data.destination_tag ? parseInt(data.destination_tag) : undefined,
        status: 'pending'
      });

      const response = await base44.functions.invoke('sendXRP', {
        transaction_id: transaction.id
      });

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast.success(`XRP sent! TX: ${data.hash?.substring(0, 16)}...`);
      setFormData({
        from_wallet_id: preselectedWalletId,
        recipient_name: '', recipient_address: '', amount: '', note: '', destination_tag: ''
      });
    },
    onError: (error) => {
      toast.error('Failed to send XRP: ' + (error.response?.data?.error || error.message));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.from_address) {
      toast.error('Please enter a sending address');
      return;
    }
    // Try to match from_address to a wallet id
    const matchedWallet = activeWallets.find(w => w.classic_address === formData.from_address);
    if (matchedWallet) formData.from_wallet_id = matchedWallet.id;
    if (!formData.recipient_address || !formData.amount) {
      toast.error('Please fill in recipient address and amount');
      return;
    }
    if (parseFloat(formData.amount) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    createTransaction.mutate(formData);
  };

  const handlePickRecipientWallet = (walletId) => {
    const w = activeWallets.find(x => x.id === walletId);
    if (w) setFormData({ ...formData, recipient_address: w.classic_address, recipient_name: w.name });
  };

  const remainingBalance = selectedFromWallet && formData.amount
    ? (selectedFromWallet.balance || 0) - parseFloat(formData.amount || 0)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <Link to={createPageUrl('Wallets')} className="inline-flex items-center text-purple-300/80 hover:text-purple-200 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Wallets
          </Link>
          <h1 className="text-3xl font-light tracking-tight text-white">
            Send <span className="font-semibold">XRP</span>
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-xl font-light text-white">Payment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Network Toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setNetwork('mainnet'); setFormData(f => ({ ...f, from_address: '', from_wallet_id: '' })); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    network === 'mainnet'
                      ? 'bg-green-500/20 border-green-500/50 text-green-300'
                      : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
                  }`}
                >
                  <Globe className="w-4 h-4" /> Mainnet
                </button>
                <button
                  type="button"
                  onClick={() => { setNetwork('testnet'); setFormData(f => ({ ...f, from_address: '', from_wallet_id: '' })); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    network === 'testnet'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
                  }`}
                >
                  <FlaskConical className="w-4 h-4" /> Testnet
                </button>
              </div>

              {/* From Address */}
              <div className="space-y-2">
                <Label className="text-purple-200/90">From Address <span className="text-red-400">*</span></Label>
                <Input
                  value={formData.from_address}
                  onChange={(e) => {
                    const val = e.target.value;
                    const matched = activeWallets.find(w => w.classic_address === val);
                    setFormData(f => ({ ...f, from_address: val, from_wallet_id: matched?.id || '' }));
                  }}
                  placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono text-sm"
                />
                {selectedFromWallet && (
                  <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                    <Wallet className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span className="text-xs text-purple-300 font-semibold">{selectedFromWallet.name}</span>
                    <span className="ml-auto text-xs text-green-300 font-semibold">{selectedFromWallet.balance?.toFixed(4)} XRP</span>
                  </div>
                )}
              </div>

              {/* Arrow divider */}
              {selectedFromWallet && (
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-purple-400" />
                </div>
              )}

              {/* To Address */}
              <div className="space-y-2">
                <Label htmlFor="recipient_address" className="text-purple-200/90">To Address <span className="text-red-400">*</span></Label>
                <Input
                  id="recipient_address"
                  value={formData.recipient_address}
                  onChange={(e) => setFormData({ ...formData, recipient_address: e.target.value })}
                  placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono text-sm"
                  required
                />
              </div>

              {/* Recipient Name */}
              <div className="space-y-2">
                <Label htmlFor="recipient_name" className="text-purple-200/90">
                  Recipient Name (Optional)
                </Label>
                <Input
                  id="recipient_name"
                  value={formData.recipient_name}
                  onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                  placeholder="e.g. SoulBridge Wallet"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>

              {/* Amount */}
              <div className="space-y-3">
                <Label htmlFor="amount" className="text-purple-200/90">
                  Amount (XRP) <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.000001"
                  min="0.000001"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-2xl font-light"
                  required
                />
                {selectedFromWallet && (selectedFromWallet.balance || 0) > 0 && (
                  <div className="space-y-1">
                    <Slider
                      min={0}
                      max={Math.max(0, (selectedFromWallet.balance || 0) - 10)}
                      step={0.01}
                      value={[parseFloat(formData.amount) || 0]}
                      onValueChange={([val]) => setFormData({ ...formData, amount: val.toFixed(6) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-white/30">
                      <span>0 XRP</span>
                      <span className="text-purple-300/60">max sendable: {Math.max(0, (selectedFromWallet.balance || 0) - 10).toFixed(2)} XRP</span>
                    </div>
                  </div>
                )}
                {remainingBalance !== null && (
                  <p className={`text-xs ${remainingBalance < 0 ? 'text-red-400' : 'text-purple-300/50'}`}>
                    Balance after send: ~{remainingBalance.toFixed(4)} XRP
                    {remainingBalance < 10 && remainingBalance >= 0 && ' (Note: XRPL requires ~10 XRP reserve)'}
                    {remainingBalance < 0 && ' ⚠️ Insufficient balance'}
                  </p>
                )}
              </div>

              {/* Destination Tag */}
              <div className="space-y-2">
                <Label htmlFor="destination_tag" className="text-purple-200/90">
                  Destination Tag (Optional)
                </Label>
                <Input
                  id="destination_tag"
                  type="number"
                  value={formData.destination_tag}
                  onChange={(e) => setFormData({ ...formData, destination_tag: e.target.value })}
                  placeholder="e.g., 123456789"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
                <p className="text-xs text-purple-300/50">Required by some exchanges</p>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label htmlFor="note" className="text-purple-200/90">
                  Note (Optional)
                </Label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Add a message..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-20 resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={createTransaction.isPending || (remainingBalance !== null && remainingBalance < 0)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg shadow-purple-500/25 transition-all duration-300 h-12 text-base"
              >
                {createTransaction.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending on XRPL...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send Payment
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}