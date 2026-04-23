import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Zap, CreditCard, AlertTriangle } from 'lucide-react';

function formatPrice(service) {
  const pm = service.payment_method;
  const amount = service.unit_amount;

  if (pm === 'PAYPAL_FIAT' && amount != null) {
    return `$${(amount / 100).toFixed(2)} USD`;
  }
  if (pm === 'RLUSD_ON_XRPL' && amount != null) {
    return `${amount} RLUSD`;
  }
  // Legacy: fall back to price_drops
  if (service.price_drops) {
    return `${(service.price_drops / 1000000).toFixed(2)} XRP (legacy)`;
  }
  return 'Free';
}

function isLegacy(service) {
  return service.status === 'legacy' || (!service.payment_method && service.price_drops);
}

export default function ServiceCard({ service }) {
  const legacy = isLegacy(service);

  return (
    <Card className={`bg-white/5 border-white/10 hover:border-purple-500/30 transition-all cursor-pointer ${legacy ? 'opacity-60' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-white text-lg mb-2">{service.title}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                {(service.category || '').replace(/_/g, ' ')}
              </Badge>
              {legacy && (
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Legacy
                </Badge>
              )}
            </div>
          </div>
          <Briefcase className="w-5 h-5 text-purple-400 flex-shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-white/60 text-sm line-clamp-2">{service.description}</p>
        
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            {service.payment_method === 'PAYPAL_FIAT' ? (
              <CreditCard className="w-4 h-4 text-blue-400" />
            ) : (
              <Zap className="w-4 h-4 text-yellow-400" />
            )}
            <span className="text-white font-semibold text-sm">{formatPrice(service)}</span>
          </div>
          <div className="flex items-center gap-2">
            {service.payment_method && (
              <Badge variant="outline" className="text-[9px]">
                {service.payment_method === 'PAYPAL_FIAT' ? 'PayPal' : 'RLUSD'}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {service.delivery_mechanism?.replace(/_/g, ' ')}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}