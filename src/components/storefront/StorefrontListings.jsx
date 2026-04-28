import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Package, Edit, Archive, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const STATUS_COLORS = {
  active: 'bg-green-500/20 text-green-300 border-green-500/30',
  draft: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  paused: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  sold_out: 'bg-red-500/20 text-red-300 border-red-500/30',
  archived: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const LISTING_TYPES = ['product', 'service', 'digital_asset', 'nft', 'subscription'];
const DELIVERY_METHODS = ['digital_download', 'api_key', 'manual_transfer', 'instant_access', 'physical_shipping'];

const EMPTY_LISTING = {
  title: '', description: '', listing_type: 'product', category: '',
  price_rlusd: '', quantity_available: '', delivery_method: 'instant_access',
  tags: '', status: 'draft',
};

export default function StorefrontListings({ storefront, listings }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_LISTING });
  const queryClient = useQueryClient();
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_LISTING });
    setShowForm(true);
  };

  const openEdit = (listing) => {
    setEditing(listing);
    setForm({
      title: listing.title || '',
      description: listing.description || '',
      listing_type: listing.listing_type || 'product',
      category: listing.category || '',
      price_rlusd: String(listing.price_rlusd || ''),
      quantity_available: listing.quantity_available === -1 ? '' : String(listing.quantity_available || ''),
      delivery_method: listing.delivery_method || 'instant_access',
      tags: (listing.tags || []).join(', '),
      status: listing.status || 'draft',
    });
    setShowForm(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const data = {
        storefront_id: storefront.id,
        seller_email: storefront.owner_email,
        seller_did: storefront.owner_did || '',
        title: form.title,
        description: form.description,
        listing_type: form.listing_type,
        category: form.category,
        price_rlusd: parseFloat(form.price_rlusd) || 0,
        quantity_available: form.quantity_available ? parseInt(form.quantity_available) : -1,
        delivery_method: form.delivery_method,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        status: form.status,
        payment_method: 'RLUSD_ON_XRPL',
      };
      if (editing) {
        return base44.entities.StorefrontListing.update(editing.id, data);
      }
      return base44.entities.StorefrontListing.create(data);
    },
    onSuccess: () => {
      toast.success(editing ? 'Listing updated' : 'Listing created');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['storefrontListings'] });
    },
  });

  const deleteListing = async (id) => {
    if (!confirm('Delete this listing permanently?')) return;
    await base44.entities.StorefrontListing.delete(id);
    queryClient.invalidateQueries({ queryKey: ['storefrontListings'] });
    toast.success('Listing deleted');
  };

  const toggleStatus = async (listing) => {
    const newStatus = listing.status === 'active' ? 'paused' : 'active';
    await base44.entities.StorefrontListing.update(listing.id, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['storefrontListings'] });
    toast.success(`Listing ${newStatus === 'active' ? 'activated' : 'paused'}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white/50 text-xs">{listings.length} listing{listings.length !== 1 ? 's' : ''}</p>
        <Button onClick={openNew} size="sm" className="bg-amber-600 hover:bg-amber-500 gap-1 text-xs">
          <Plus className="w-3.5 h-3.5" /> New Listing
        </Button>
      </div>

      {listings.length === 0 && (
        <Card className="bg-white/5 border-white/10 text-white">
          <CardContent className="p-8 text-center">
            <Package className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No listings yet. Create your first product or service.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {listings.map(listing => (
          <div key={listing.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3 hover:border-white/20 transition">
            {listing.image_urls?.[0] ? (
              <img src={listing.image_urls[0]} alt={listing.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-amber-400/60" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{listing.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-amber-300 text-xs font-semibold">{listing.price_rlusd} RLUSD</span>
                <Badge className={`text-[8px] ${STATUS_COLORS[listing.status] || STATUS_COLORS.draft}`}>
                  {listing.status}
                </Badge>
                <span className="text-white/20 text-[9px]">{listing.listing_type}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white" onClick={() => toggleStatus(listing)}>
                {listing.status === 'active' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white" onClick={() => openEdit(listing)}>
                <Edit className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400/50 hover:text-red-300" onClick={() => deleteListing(listing.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-slate-950 border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{editing ? 'Edit Listing' : 'New Listing'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label className="text-white/60 text-xs">Title *</Label>
              <Input value={form.title} onChange={e => set('title', e.target.value)} className="bg-white/5 border-white/10 text-white" placeholder="Product or service name" />
            </div>
            <div className="space-y-1">
              <Label className="text-white/60 text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => set('description', e.target.value)} className="bg-white/5 border-white/10 text-white min-h-[60px]" placeholder="Detailed description…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-white/60 text-xs">Price (RLUSD) *</Label>
                <Input type="number" value={form.price_rlusd} onChange={e => set('price_rlusd', e.target.value)} className="bg-white/5 border-white/10 text-white" placeholder="10" />
              </div>
              <div className="space-y-1">
                <Label className="text-white/60 text-xs">Quantity (-1 = unlimited)</Label>
                <Input type="number" value={form.quantity_available} onChange={e => set('quantity_available', e.target.value)} className="bg-white/5 border-white/10 text-white" placeholder="Unlimited" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-white/60 text-xs">Type</Label>
                <Select value={form.listing_type} onValueChange={v => set('listing_type', v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{LISTING_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-white/60 text-xs">Delivery</Label>
                <Select value={form.delivery_method} onValueChange={v => set('delivery_method', v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{DELIVERY_METHODS.map(d => <SelectItem key={d} value={d}>{d.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-white/60 text-xs">Category</Label>
                <Input value={form.category} onChange={e => set('category', e.target.value)} className="bg-white/5 border-white/10 text-white" placeholder="e.g. Digital Art" />
              </div>
              <div className="space-y-1">
                <Label className="text-white/60 text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-white/60 text-xs">Tags (comma-separated)</Label>
              <Input value={form.tags} onChange={e => set('tags', e.target.value)} className="bg-white/5 border-white/10 text-white" placeholder="art, digital, nft" />
            </div>

            <div className="flex items-center gap-2 pt-2 text-[10px] text-white/30">
              <span>1% Village fee applies to all sales (Law 6: Exchange)</span>
            </div>

            <Button onClick={() => save.mutate()} disabled={!form.title || !form.price_rlusd || save.isPending}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500">
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editing ? 'Update Listing' : 'Create Listing'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}