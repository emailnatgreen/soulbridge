import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, Star, Award, CheckCircle } from 'lucide-react';

export default function ReputationBadge({ reputation, size = 'default' }) {
  if (!reputation) {
    return (
      <Badge variant="outline" className={size === 'sm' ? 'text-xs' : ''}>
        <Shield className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
        No Reputation
      </Badge>
    );
  }

  const getTrustConfig = (level) => {
    const configs = {
      unverified: { 
        color: 'bg-gray-400', 
        icon: Shield, 
        label: 'Unverified' 
      },
      new: { 
        color: 'bg-blue-500', 
        icon: Star, 
        label: 'New' 
      },
      established: { 
        color: 'bg-green-500', 
        icon: Award, 
        label: 'Established' 
      },
      trusted: { 
        color: 'bg-purple-600', 
        icon: CheckCircle, 
        label: 'Trusted' 
      },
      verified: { 
        color: 'bg-amber-500', 
        icon: CheckCircle, 
        label: 'Verified' 
      }
    };
    return configs[level] || configs.unverified;
  };

  const config = getTrustConfig(reputation.trust_level);
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} ${size === 'sm' ? 'text-xs' : ''}`}>
      <Icon className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
      {config.label} ({reputation.overall_score})
    </Badge>
  );
}