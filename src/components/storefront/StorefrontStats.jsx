import React from 'react';
import { Package, ShoppingCart, DollarSign, Star } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
    <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
    <p className="text-white font-bold text-lg">{value}</p>
    <p className="text-white/30 text-[10px]">{label}</p>
  </div>
);

export default function StorefrontStats({ storefront, listings, orders }) {
  const activeListings = listings.filter(l => l.status === 'active').length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const totalRevenue = orders
    .filter(o => ['completed', 'fulfilled'].includes(o.status))
    .reduce((sum, o) => sum + (o.seller_receives_rlusd || 0), 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <StatCard icon={Package} label="Active Listings" value={activeListings} color="text-amber-400" />
      <StatCard icon={ShoppingCart} label="Completed Sales" value={completedOrders} color="text-blue-400" />
      <StatCard icon={DollarSign} label="Revenue (RLUSD)" value={totalRevenue.toFixed(2)} color="text-green-400" />
      <StatCard icon={Star} label="Rating" value={storefront.average_rating > 0 ? storefront.average_rating.toFixed(1) : '—'} color="text-pink-400" />
    </div>
  );
}