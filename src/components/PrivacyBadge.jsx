import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Globe, Users, Lock, Shield } from 'lucide-react';

export default function PrivacyBadge({ level, size = 'default' }) {
  const getPrivacyConfig = (level) => {
    switch (level) {
      case 'public':
      case 'anyone':
        return {
          icon: Globe,
          label: 'Public',
          className: 'bg-green-100 text-green-700 border-green-200',
          iconColor: 'text-green-600'
        };
      case 'connections_only':
      case 'trusted_only':
        return {
          icon: Users,
          label: 'Connections',
          className: 'bg-blue-100 text-blue-700 border-blue-200',
          iconColor: 'text-blue-600'
        };
      case 'private':
      case 'whitelist_only':
        return {
          icon: Lock,
          label: 'Private',
          className: 'bg-red-100 text-red-700 border-red-200',
          iconColor: 'text-red-600'
        };
      default:
        return {
          icon: Shield,
          label: 'Protected',
          className: 'bg-gray-100 text-gray-700 border-gray-200',
          iconColor: 'text-gray-600'
        };
    }
  };

  const config = getPrivacyConfig(level);
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <Badge variant="outline" className={`${config.className} flex items-center gap-1`}>
      <Icon className={`${iconSize} ${config.iconColor}`} />
      {config.label}
    </Badge>
  );
}