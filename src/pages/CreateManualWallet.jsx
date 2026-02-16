import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function CreateManualWallet() {
  const [name, setName] = useState('');
  const [classicAddress, setClassicAddress] = useState('');
  const [encryptedSeed, setEncryptedSeed] = useState('');
  const [network, setNetwork] = useState('testnet');
  const [notes, setNotes] = useState('');
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
    },
    onError: (error) => {
      toast.error('Failed to add wallet');
      console.error(error);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !classicAddress.trim() || !encryptedSeed.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    createWallet.mutate({
      name,
      classic_address: classicAddress,
      encrypted_seed: encryptedSeed,
      network,
      balance: 0,
      notes: notes || undefined
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-6 py-6">
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
              <p className="text-sm text-purple-300/60">Import your XRPL wallet</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-xl font-light text-white">Wallet Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-purple-200/90">
                  Wallet Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Wallet"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-purple-200/90">
                  Classic Address <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="address"
                  value={classicAddress}
                  onChange={(e) => setClassicAddress(e.target.value)}
                  placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seed" className="text-purple-200/90">
                  Seed <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="seed"
                  type="password"
                  value={encryptedSeed}
                  onChange={(e) => setEncryptedSeed(e.target.value)}
                  placeholder="sXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono text-sm"
                  required
                />
                <p className="text-xs text-white/40">Your seed will be stored securely</p>
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

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-purple-200/90">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this wallet..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-24 resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={createWallet.isPending}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-12"
              >
                {createWallet.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Adding Wallet...
                  </>
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