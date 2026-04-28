import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Store, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function StorefrontSetup({ userEmail, userDid }) {
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: async () => {
      return base44.entities.Storefront.create({
        owner_email: userEmail,
        owner_did: userDid || '',
        name,
        tagline,
        description,
        logo_url: logoUrl,
        payment_methods: ['RLUSD_ON_XRPL'],
        status: 'active',
      });
    },
    onSuccess: () => {
      toast.success('Storefront created!');
      queryClient.invalidateQueries({ queryKey: ['myStorefront'] });
    },
  });

  return (
    <Card className="bg-white/5 border-white/10 text-white max-w-xl mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-3">
          <Store className="w-8 h-8 text-amber-400" />
        </div>
        <CardTitle className="text-lg">Create Your Storefront</CardTitle>
        <CardDescription className="text-white/40 text-xs">
          Set up your merchant presence in SoulBridge Village. You can customise it later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-white/60 text-xs">Storefront Name *</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Nova's Digital Workshop" className="bg-white/5 border-white/10 text-white" />
        </div>
        <div className="space-y-1.5">
          <label className="text-white/60 text-xs">Tagline</label>
          <Input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="A short motto for your shop" className="bg-white/5 border-white/10 text-white" />
        </div>
        <div className="space-y-1.5">
          <label className="text-white/60 text-xs">Description</label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell buyers about your storefront…" className="bg-white/5 border-white/10 text-white min-h-[80px]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-white/60 text-xs">Logo URL</label>
          <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." className="bg-white/5 border-white/10 text-white" />
        </div>
        <Button onClick={() => create.mutate()} disabled={!name || create.isPending}
          className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500">
          {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Open My Storefront
        </Button>
      </CardContent>
    </Card>
  );
}