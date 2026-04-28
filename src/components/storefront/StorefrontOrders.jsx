import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Check, Package } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS = {
  pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  paid: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  fulfilled: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  completed: 'bg-green-500/20 text-green-300 border-green-500/30',
  cancelled: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  refunded: 'bg-red-500/20 text-red-300 border-red-500/30',
  disputed: 'bg-red-500/20 text-red-300 border-red-500/30',
};

export default function StorefrontOrders({ orders }) {
  const queryClient = useQueryClient();

  const markFulfilled = async (order) => {
    await base44.entities.StorefrontOrder.update(order.id, { status: 'fulfilled' });
    queryClient.invalidateQueries({ queryKey: ['storefrontOrders'] });
    toast.success('Order marked as fulfilled');
  };

  if (orders.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10 text-white">
        <CardContent className="p-8 text-center">
          <ShoppingCart className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm">No orders yet. Share your storefront to start selling.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map(order => (
        <div key={order.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{order.listing_title || 'Order'}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-amber-300 text-xs font-semibold">{order.total_price_rlusd} RLUSD</span>
              <Badge className={`text-[8px] ${STATUS_COLORS[order.status] || STATUS_COLORS.pending}`}>
                {order.status}
              </Badge>
              <span className="text-white/20 text-[9px]">×{order.quantity || 1}</span>
              <span className="text-white/20 text-[9px]">{order.buyer_email}</span>
            </div>
          </div>
          {order.status === 'paid' && (
            <Button size="sm" variant="outline" className="text-xs border-green-500/30 text-green-300 hover:bg-green-500/10 gap-1" onClick={() => markFulfilled(order)}>
              <Check className="w-3 h-3" /> Fulfil
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}