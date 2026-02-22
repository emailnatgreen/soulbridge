import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, Loader2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function SendRLUSDPage() {
  const [formData, setFormData] = useState({
    from_wallet_id: '',
    recipient_address: '',
    recipient_name: '',
    amount: '',
    note: '',
    destination_tag: ''
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: wallets = [], isLoading: walletsLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      return await base44.entities.Wallet.list('-created_date', 100);
    },
    enabled: !!user,
  });

  const selectedWallet = wallets.find(w => w.id === formData.from_wallet_id);

  const sendRLUSD = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('sendRLUSD', {
        wallet_id: data.from_wallet_id,
        recipient_address: data.recipient_address,
        amount: parseFloat(data.amount),
        destination_tag: data.destination_tag ? parseInt(data.destination_tag) : undefined,
        note: data.note
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast.success('RLUSD sent successfully!');
      setFormData({
        from_wallet_id: '',
        recipient_address: '',
        recipient_name: '',
        amount: '',
        note: '',
        destination_tag: ''
      });
    },
    onError: (error) => {
      toast.error('Failed to send RLUSD: ' + (error.response?.data?.error || error.message));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.from_wallet_id || !formData.recipient_address || !formData.amount) {
      toast.error('Please fill in required fields');
      return;
    }
    if (!selectedWallet?.metadata?.has_rlusd_trustline) {
      toast.error('Selected wallet does not have RLUSD trustline enabled');
      return;
    }
    sendRLUSD.mutate(formData);
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
            Send <span className="font-semibold">RLUSD</span>
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
              <div className="space-y-2">
                <Label htmlFor="from_wallet" className="text-purple-200/90">
                  From Wallet <span className="text-red-400">*</span>
                </Label>
                <Select value={formData.from_wallet_id} onValueChange={(value) => setFormData({ ...formData, from_wallet_id: value })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map(wallet => (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        {wallet.name} ({wallet.network})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedWallet && !selectedWallet?.metadata?.has_rlusd_trustline && (
                <div className="p-3 bg-amber-900/20 border border-amber-500/20 rounded-lg flex gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <p className="text-xs text-amber-200">This wallet does not have RLUSD trustline enabled yet.</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="recipient_name" className="text-purple-200/90">
                  Recipient Name
                </Label>
                <Input
                  id="recipient_name"
                  value={formData.recipient_name}
                  onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                  placeholder="John Doe"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:ring-purple-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient_address" className="text-purple-200/90">
                  XRP Address <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="recipient_address"
                  value={formData.recipient_address}
                  onChange={(e) => setFormData({ ...formData, recipient_address: e.target.value })}
                  placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:ring-purple-500/20 font-mono text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-purple-200/90">
                  Amount (RLUSD) <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.000001"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:ring-purple-500/20 text-2xl font-light"
                  required
                />
              </div>

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
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:ring-purple-500/20"
                />
                <p className="text-xs text-purple-300/50">Required by some exchanges and wallets</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note" className="text-purple-200/90">
                  Note (Optional)
                </Label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Add a message..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:ring-purple-500/20 h-24 resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={sendRLUSD.isPending || !selectedWallet?.metadata?.has_rlusd_trustline}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg shadow-purple-500/25 transition-all duration-300 h-12 text-base disabled:opacity-50"
              >
                {sendRLUSD.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send RLUSD
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