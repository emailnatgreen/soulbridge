import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Settings, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function StorefrontSettings({ storefront }) {
  const [form, setForm] = useState({
    name: storefront.name || '',
    tagline: storefront.tagline || '',
    description: storefront.description || '',
    logo_url: storefront.logo_url || '',
    banner_url: storefront.banner_url || '',
    status: storefront.status || 'active',
  });
  const queryClient = useQueryClient();
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const save = useMutation({
    mutationFn: () => base44.entities.Storefront.update(storefront.id, form),
    onSuccess: () => {
      toast.success('Storefront updated');
      queryClient.invalidateQueries({ queryKey: ['myStorefront'] });
    },
  });

  return (
    <Card className="bg-white/5 border-white/10 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm"><Settings className="w-4 h-4 text-purple-400" /> Storefront Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Store Name</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Tagline</Label>
            <Input value={form.tagline} onChange={e => set('tagline', e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-white/60 text-xs">Description</Label>
          <Textarea value={form.description} onChange={e => set('description', e.target.value)} className="bg-white/5 border-white/10 text-white min-h-[80px]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Logo URL</Label>
            <Input value={form.logo_url} onChange={e => set('logo_url', e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs">Banner URL</Label>
            <Input value={form.banner_url} onChange={e => set('banner_url', e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
        </div>
        <div className="space-y-1.5 max-w-[200px]">
          <Label className="text-white/60 text-xs">Status</Label>
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => save.mutate()} disabled={!form.name || save.isPending} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 gap-1">
          {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}