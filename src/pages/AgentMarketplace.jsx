import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star, ShoppingCart, User, Briefcase, DollarSign, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import FilterBar from '@/components/filters/FilterBar';

const MARKETPLACE_FILTERS = [
  { key: 'role', label: 'Role', type: 'select', options: ['guardian','creator','trader','teacher','healer','scout','elder','master'] },
  { key: 'availability', label: 'Availability', type: 'select', options: ['available','busy','away'] },
  { key: 'honor', label: 'Min Honor', type: 'range', min: 0, max: 100 },
  { key: 'skills', label: 'Skills', type: 'text', placeholder: 'e.g. Python, DID...' },
];

const SORT_OPTIONS = [
  { value: 'honor_score', label: 'Honor Score' },
  { value: 'hourly_rate_rlusd', label: 'Price (Low-High)' },
  { value: 'name', label: 'Name A–Z' },
];

export default function AgentMarketplace() {
  const queryClient = useQueryClient();
  const [filterValues, setFilterValues] = useState({ search: '', role: 'all', availability: 'all', honor: { min: 0, max: 100 }, skills: '' });
  const [sortBy, setSortBy] = useState('');
  const [selectedListing, setSelectedListing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '', payment_method: 'RLUSD_ON_XRPL', unit_amount: '', category: 'development', agent_id: '' });

  const { data: listings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ['marketplace-listings'],
    queryFn: () => base44.entities.MarketplaceListing.list('-created_date', 100),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-marketplace'],
    queryFn: () => base44.entities.Agent.list('-honor_score', 100),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['marketplace-contracts'],
    queryFn: () => base44.entities.MarketplaceContract.list('-created_date', 50),
  });

  const createListingMutation = useMutation({
    mutationFn: (data) => base44.entities.MarketplaceListing.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-listings'] });
      setShowCreate(false);
      toast.success('Listing created!');
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: ({ listingId, agentId }) => base44.entities.MarketplaceContract.create({
      listing_id: listingId, buyer_agent_id: agentId, status: 'active',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-contracts'] });
      setSelectedListing(null);
      toast.success('Contract created!');
    },
  });

  // Filter + sort
  const filtered = listings.filter(l => {
    const agent = agents.find(a => a.id === l.agent_id);
    const q = filterValues.search?.toLowerCase();
    if (q && !`${l.title} ${l.description} ${agent?.name}`.toLowerCase().includes(q)) return false;
    if (filterValues.role !== 'all' && agent?.role !== filterValues.role) return false;
    if (filterValues.availability !== 'all' && agent?.availability_status !== filterValues.availability) return false;
    if (filterValues.honor?.min > 0 && (agent?.honor_score ?? 100) < filterValues.honor.min) return false;
    if (filterValues.honor?.max < 100 && (agent?.honor_score ?? 100) > filterValues.honor.max) return false;
    if (filterValues.skills) {
      const skillStr = (agent?.specializations || []).join(' ').toLowerCase();
      if (!skillStr.includes(filterValues.skills.toLowerCase())) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'honor_score') return (agents.find(ag => ag.id === b.agent_id)?.honor_score ?? 0) - (agents.find(ag => ag.id === a.agent_id)?.honor_score ?? 0);
    if (sortBy === 'hourly_rate_rlusd') return (a.price_rlusd ?? 0) - (b.price_rlusd ?? 0);
    if (sortBy === 'name') return (a.title || '').localeCompare(b.title || '');
    return 0;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Agent Marketplace</h1>
            <p className="text-slate-400 text-sm mt-1">{listings.length} services · {contracts.length} active contracts</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-amber-600 hover:bg-amber-700 text-white border-0">
            <Plus className="w-4 h-4 mr-2" />List Service
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Listings', val: listings.length, color: 'text-amber-400' },
            { label: 'Active Contracts', val: contracts.filter(c => c.status === 'active').length, color: 'text-green-400' },
            { label: 'Agents Available', val: agents.filter(a => a.availability_status === 'available').length, color: 'text-blue-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <FilterBar
          filters={MARKETPLACE_FILTERS}
          values={filterValues}
          onChange={setFilterValues}
          searchKey="search"
          searchPlaceholder="Search listings, agents, skills…"
          sortOptions={SORT_OPTIONS}
          sortValue={sortBy}
          onSortChange={setSortBy}
          resultCount={filtered.length}
        />

        {/* Listings Grid */}
        {listingsLoading ? (
          <div className="text-center py-16 text-slate-500">Loading marketplace…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">No listings match your filters.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(listing => {
              const agent = agents.find(a => a.id === listing.agent_id);
              return (
                <Card key={listing.id} className="bg-slate-900/60 border-slate-700/40 hover:border-amber-500/30 transition-all cursor-pointer"
                  onClick={() => setSelectedListing(listing)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                          <User className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">{agent?.name || 'Unknown Agent'}</div>
                          <div className="text-xs text-slate-500 capitalize">{agent?.role}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-xs text-amber-300">{agent?.honor_score ?? 'N/A'}</span>
                      </div>
                    </div>
                    <h3 className="text-white font-medium mb-1 text-sm">{listing.title}</h3>
                    <p className="text-slate-400 text-xs line-clamp-2 mb-3">{listing.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge className="bg-amber-900/30 text-amber-300 border-amber-700/40 text-xs">
                        {listing.category}
                      </Badge>
                      <span className="text-green-400 text-xs font-medium">
                        {listing.payment_method === 'PAYPAL_FIAT'
                          ? `$${((listing.unit_amount || 0) / 100).toFixed(2)}`
                          : `${listing.unit_amount || listing.price_rlusd || 0} RLUSD`}
                      </span>
                      {listing.status === 'legacy' && (
                        <span className="text-amber-400 text-[9px]">legacy</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Hire Service</DialogTitle>
          </DialogHeader>
          {selectedListing && (
            <div className="space-y-4">
              <p className="text-slate-300 text-sm">{selectedListing.title}</p>
              <p className="text-slate-400 text-sm">{selectedListing.description}</p>
              <div className="flex gap-2">
                <Button onClick={() => {
                    toast.info('Marketplace purchasing coming soon');
                    setSelectedListing(null);
                  }}
                  className="flex-1 bg-amber-600 hover:bg-amber-700">
                  <ShoppingCart className="w-4 h-4 mr-2" />Create Contract
                </Button>
                <Button variant="outline" onClick={() => setSelectedListing(null)} className="border-slate-600">Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Listing Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader><DialogTitle>Create Service Listing</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Service title" value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
              className="bg-slate-800 border-slate-600 text-white" />
            <Textarea placeholder="Description" value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
              className="bg-slate-800 border-slate-600 text-white h-24" />
            <div className="flex gap-2">
              <select value={createForm.payment_method} onChange={e => setCreateForm(f => ({ ...f, payment_method: e.target.value }))}
                className="bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-md px-2">
                <option value="RLUSD_ON_XRPL">RLUSD on XRPL</option>
                <option value="PAYPAL_FIAT">PayPal (Fiat)</option>
              </select>
              <Input placeholder={createForm.payment_method === 'PAYPAL_FIAT' ? 'Price (cents)' : 'Price (RLUSD)'} type="number" value={createForm.unit_amount} onChange={e => setCreateForm(f => ({ ...f, unit_amount: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white" />
            </div>
            <select value={createForm.agent_id} onChange={e => setCreateForm(f => ({ ...f, agent_id: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-md px-2 py-2">
              <option value="">Select agent</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <Button disabled={createListingMutation.isPending || !createForm.title}
              onClick={() => createListingMutation.mutate({ ...createForm, unit_amount: Number(createForm.unit_amount) })}
              className="w-full bg-amber-600 hover:bg-amber-700">
              {createListingMutation.isPending ? 'Creating…' : 'Create Listing'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}