import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Store, Package, ShoppingCart, Settings, Star } from 'lucide-react';
import StorefrontListings from './StorefrontListings';
import StorefrontOrders from './StorefrontOrders';
import StorefrontSettings from './StorefrontSettings';
import StorefrontStats from './StorefrontStats';

export default function StorefrontDashboard({ storefront }) {
  const [tab, setTab] = useState('listings');

  const { data: listings = [] } = useQuery({
    queryKey: ['storefrontListings', storefront.id],
    queryFn: () => base44.entities.StorefrontListing.filter({ storefront_id: storefront.id }, '-created_date', 100),
    staleTime: 10000,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['storefrontOrders', storefront.id],
    queryFn: () => base44.entities.StorefrontOrder.filter({ storefront_id: storefront.id }, '-created_date', 100),
    staleTime: 10000,
  });

  const activeListings = listings.filter(l => l.status === 'active');
  const pendingOrders = orders.filter(o => ['pending', 'paid'].includes(o.status));

  return (
    <div className="space-y-6">
      {/* Storefront Header */}
      <div className="flex items-center gap-4 bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-500/30 rounded-2xl p-4 sm:p-5">
        {storefront.logo_url ? (
          <img src={storefront.logo_url} alt={storefront.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <Store className="w-7 h-7 text-amber-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-white font-bold text-lg truncate">{storefront.name}</h2>
            <Badge className={`text-[9px] ${storefront.status === 'active' ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
              {storefront.status}
            </Badge>
          </div>
          {storefront.tagline && <p className="text-white/40 text-xs mt-0.5 truncate">{storefront.tagline}</p>}
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/30">
            <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {activeListings.length} listings</span>
            <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> {orders.length} orders</span>
            {storefront.average_rating > 0 && (
              <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> {storefront.average_rating.toFixed(1)}</span>
            )}
          </div>
        </div>
      </div>

      <StorefrontStats storefront={storefront} listings={listings} orders={orders} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white/5 border border-white/10 w-full flex h-auto gap-1 p-1">
          <TabsTrigger value="listings" className="flex-1 gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white">
            <Package className="w-3.5 h-3.5" /> Listings
            {activeListings.length > 0 && <Badge variant="outline" className="text-[8px] border-white/20 ml-1">{activeListings.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex-1 gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white">
            <ShoppingCart className="w-3.5 h-3.5" /> Orders
            {pendingOrders.length > 0 && <Badge variant="outline" className="text-[8px] border-amber-400/40 text-amber-300 ml-1">{pendingOrders.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
            <Settings className="w-3.5 h-3.5" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="mt-4">
          <StorefrontListings storefront={storefront} listings={listings} />
        </TabsContent>
        <TabsContent value="orders" className="mt-4">
          <StorefrontOrders orders={orders} />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <StorefrontSettings storefront={storefront} />
        </TabsContent>
      </Tabs>
    </div>
  );
}