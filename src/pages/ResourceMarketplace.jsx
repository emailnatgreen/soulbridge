import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShoppingCart, Package, TrendingUp, Layers } from 'lucide-react';
import { toast } from 'sonner';
import FilterBar from '@/components/filters/FilterBar';

const RESOURCE_FILTERS = [
  { key: 'category', label: 'Category', type: 'select', options: ['material','energy','knowledge','token','service','data'] },
  { key: 'priceRange', label: 'Price (XRP)', type: 'range', min: 0, max: 10000 },
  { key: 'seller', label: 'Seller Name', type: 'text', placeholder: 'Agent name…' },
];

const SORT_OPTIONS = [
  { value: 'price_asc', label: 'Price (Low–High)' },
  { value: 'price_desc', label: 'Price (High–Low)' },
  { value: '-created_date', label: 'Newest' },
  { value: 'quantity_desc', label: 'Most Stock' },
];

export default function ResourceMarketplace() {
  const queryClient = useQueryClient();
  const [filterValues, setFilterValues] = useState({ search: '', category: 'all', priceRange: { min: 0, max: 10000 }, seller: '' });
  const [sortBy, setSortBy] = useState('-created_date');
  const [selected, setSelected] = useState(null);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['resource-listings'],
    queryFn: () => base44.entities.ResourceListing.list('-created_date', 200),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-resource'],
    queryFn: () => base44.entities.Agent.list(),
  });

  const purchaseMutation = useMutation({
    mutationFn: (data) => base44.entities.ResourcePurchase.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-listings'] });
      setSelected(null);
      toast.success('Purchase completed!');
    },
  });

  const getAgent = (id) => agents.find(a => a.id === id);

  const filtered = listings.filter(l => {
    const seller = getAgent(l.seller_agent_id);
    const q = filterValues.search?.toLowerCase();
    if (q && !`${l.resource_name} ${l.description} ${seller?.name}`.toLowerCase().includes(q)) return false;
    if (filterValues.category !== 'all' && l.category !== filterValues.category) return false;
    if (filterValues.priceRange?.min > 0 && (l.price_per_unit ?? 0) < filterValues.priceRange.min) return false;
    if (filterValues.priceRange?.max < 10000 && (l.price_per_unit ?? 0) > filterValues.priceRange.max) return false;
    if (filterValues.seller && !seller?.name?.toLowerCase().includes(filterValues.seller.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return (a.price_per_unit ?? 0) - (b.price_per_unit ?? 0);
    if (sortBy === 'price_desc') return (b.price_per_unit ?? 0) - (a.price_per_unit ?? 0);
    if (sortBy === 'quantity_desc') return (b.quantity_available ?? 0) - (a.quantity_available ?? 0);
    return new Date(b.created_date) - new Date(a.created_date);
  });

  const totalListings = listings.length;
  const avgPrice = listings.length > 0 ? (listings.reduce((s, l) => s + (l.price_per_unit ?? 0), 0) / listings.length).toFixed(2) : 0;
  const categories = [...new Set(listings.map(l => l.category).filter(Boolean))].length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950/20 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-teal-400" />Resource Marketplace
          </h1>
          <p className="text-slate-400 text-sm mt-1">{totalListings} listings across {categories} categories</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Listings', val: totalListings, color: 'text-teal-400' },
            { label: 'Categories', val: categories, color: 'text-blue-400' },
            { label: 'Avg Price', val: `${avgPrice} XRP`, color: 'text-amber-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <FilterBar
          filters={RESOURCE_FILTERS}
          values={filterValues}
          onChange={setFilterValues}
          searchKey="search"
          searchPlaceholder="Search resources, sellers…"
          sortOptions={SORT_OPTIONS}
          sortValue={sortBy}
          onSortChange={setSortBy}
          resultCount={filtered.length}
        />

        {isLoading ? (
          <div className="text-center py-16 text-slate-500">Loading marketplace…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">No resources match your filters.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(listing => {
              const seller = getAgent(listing.seller_agent_id);
              return (
                <Card key={listing.id} className="bg-slate-900/60 border-slate-700/40 hover:border-teal-500/30 transition-all cursor-pointer"
                  onClick={() => setSelected(listing)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg bg-teal-600/20 border border-teal-500/30 flex items-center justify-center">
                        <Layers className="w-4 h-4 text-teal-400" />
                      </div>
                      {listing.category && (
                        <Badge className="bg-teal-900/40 text-teal-300 border-teal-700/40 text-xs capitalize">{listing.category}</Badge>
                      )}
                    </div>
                    <h3 className="text-white font-medium mb-1 text-sm">{listing.resource_name || 'Unnamed Resource'}</h3>
                    <p className="text-slate-400 text-xs line-clamp-2 mb-3">{listing.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">By {seller?.name || 'Unknown'}</span>
                      <div className="text-right">
                        <div className="text-green-400 font-semibold text-sm">{listing.price_per_unit ?? 0} XRP</div>
                        {listing.quantity_available !== undefined && (
                          <div className="text-xs text-slate-600">×{listing.quantity_available} avail.</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Purchase Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader><DialogTitle>Purchase Resource</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-slate-300 text-sm font-medium">{selected.resource_name}</p>
              <p className="text-slate-400 text-sm">{selected.description}</p>
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <span className="text-slate-400 text-sm">Price</span>
                <span className="text-green-400 font-semibold">{selected.price_per_unit ?? 0} XRP/unit</span>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => purchaseMutation.mutate({ listing_id: selected.id, quantity: 1, status: 'completed' })}
                  disabled={purchaseMutation.isPending}
                  className="flex-1 bg-teal-600 hover:bg-teal-700">
                  <ShoppingCart className="w-4 h-4 mr-2" />Buy Now
                </Button>
                <Button variant="outline" onClick={() => setSelected(null)} className="border-slate-600">Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}