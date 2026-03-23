import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Zap } from 'lucide-react';

export default function ServiceCard({ service }) {
  const drops = service.price_drops || 0;
  const xrp = (drops / 1000000).toFixed(2);

  return (
    <Card className="bg-white/5 border-white/10 hover:border-purple-500/30 transition-all cursor-pointer">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-white text-lg mb-2">{service.title}</CardTitle>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
              {service.category.replace(/_/g, ' ')}
            </Badge>
          </div>
          <Briefcase className="w-5 h-5 text-purple-400 flex-shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-white/60 text-sm line-clamp-2">{service.description}</p>
        
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-white font-semibold">{xrp} XRP</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {service.delivery_mechanism?.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}