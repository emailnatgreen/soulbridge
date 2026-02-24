import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Shield, Globe, Users, Lock, Check } from 'lucide-react';
import { toast } from 'sonner';

const PRIVACY_PRESETS = {
  public: {
    label: 'Public',
    icon: Globe,
    color: 'text-green-600',
    description: 'Everyone can see everything',
    settings: {
      profile_visibility: 'public',
      message_privacy: 'anyone',
      credential_visibility: 'public',
      endorsement_visibility: 'public',
      reputation_visibility: 'public',
      activity_visibility: 'public',
      connection_list_visibility: 'public',
      allow_indexing: true,
      allow_endorsements: true
    }
  },
  balanced: {
    label: 'Balanced',
    icon: Users,
    color: 'text-blue-600',
    description: 'Share with connections only',
    settings: {
      profile_visibility: 'public',
      message_privacy: 'connections_only',
      credential_visibility: 'private',
      endorsement_visibility: 'connections_only',
      reputation_visibility: 'connections_only',
      activity_visibility: 'connections_only',
      connection_list_visibility: 'connections_only',
      allow_indexing: true,
      allow_endorsements: true
    }
  },
  private: {
    label: 'Private',
    icon: Lock,
    color: 'text-red-600',
    description: 'Maximum privacy',
    settings: {
      profile_visibility: 'private',
      message_privacy: 'whitelist_only',
      credential_visibility: 'private',
      endorsement_visibility: 'private',
      reputation_visibility: 'private',
      activity_visibility: 'private',
      connection_list_visibility: 'private',
      allow_indexing: false,
      allow_endorsements: false
    }
  }
};

export default function PrivacyQuickToggle() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['privacy-toggle-wallets'],
    queryFn: () => base44.entities.Wallet.list('-created_date'),
    enabled: !!user
  });

  const userWallet = wallets.find(w => w.owner_id === user?.id);

  const { data: privacySettings } = useQuery({
    queryKey: ['privacy-quick-settings', userWallet?.classic_address],
    queryFn: async () => {
      const settings = await base44.entities.DidPrivacySetting.filter({
        did_address: userWallet.classic_address
      });
      return settings[0] || null;
    },
    enabled: !!userWallet
  });

  const updatePrivacyMutation = useMutation({
    mutationFn: async (preset) => {
      const response = await base44.functions.invoke('updateDidPrivacy', {
        settings: PRIVACY_PRESETS[preset].settings
      });
      return response.data;
    },
    onSuccess: (_, preset) => {
      queryClient.invalidateQueries({ queryKey: ['privacy-quick-settings'] });
      queryClient.invalidateQueries({ queryKey: ['privacy-settings'] });
      toast.success(`Privacy set to ${PRIVACY_PRESETS[preset].label}`);
      setOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to update privacy');
    }
  });

  const getCurrentPreset = () => {
    if (!privacySettings) return null;
    
    for (const [key, preset] of Object.entries(PRIVACY_PRESETS)) {
      const matches = Object.keys(preset.settings).every(
        setting => privacySettings[setting] === preset.settings[setting]
      );
      if (matches) return key;
    }
    return 'custom';
  };

  if (!userWallet) return null;

  const currentPreset = getCurrentPreset();
  const CurrentIcon = currentPreset && PRIVACY_PRESETS[currentPreset] 
    ? PRIVACY_PRESETS[currentPreset].icon 
    : Shield;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CurrentIcon className="w-4 h-4" />
          Privacy
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Quick Privacy Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {Object.entries(PRIVACY_PRESETS).map(([key, preset]) => {
          const Icon = preset.icon;
          const isActive = currentPreset === key;
          
          return (
            <DropdownMenuItem
              key={key}
              onClick={() => updatePrivacyMutation.mutate(key)}
              className="cursor-pointer"
              disabled={updatePrivacyMutation.isPending}
            >
              <div className="flex items-start gap-3 w-full">
                <Icon className={`w-4 h-4 mt-0.5 ${preset.color}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{preset.label}</span>
                    {isActive && <Check className="w-4 h-4 text-green-600" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{preset.description}</p>
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}

        {currentPreset === 'custom' && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 text-xs text-gray-500">
              <Shield className="w-3 h-3 inline mr-1" />
              Custom settings active
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}