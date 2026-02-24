import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, 
  Lock, 
  Users, 
  Briefcase, 
  Shield,
  CheckCircle 
} from 'lucide-react';

const templates = [
  {
    id: 'public_figure',
    name: 'Public Figure',
    description: 'Maximum visibility for influencers and public personalities',
    icon: Globe,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    settings: {
      profile_visibility: 'public',
      message_privacy: 'anyone',
      credential_visibility: 'public',
      endorsement_visibility: 'public',
      reputation_visibility: 'public',
      activity_visibility: 'public',
      connection_list_visibility: 'public',
      allow_indexing: true,
      allow_endorsements: true,
      require_verification_for_messages: false
    }
  },
  {
    id: 'business',
    name: 'Business Professional',
    description: 'Balanced privacy for networking and professional connections',
    icon: Briefcase,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    settings: {
      profile_visibility: 'public',
      message_privacy: 'trusted_only',
      credential_visibility: 'public',
      endorsement_visibility: 'public',
      reputation_visibility: 'public',
      activity_visibility: 'connections_only',
      connection_list_visibility: 'connections_only',
      allow_indexing: true,
      allow_endorsements: true,
      require_verification_for_messages: true
    }
  },
  {
    id: 'private_user',
    name: 'Private User',
    description: 'Maximum privacy for personal use and selective sharing',
    icon: Lock,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    settings: {
      profile_visibility: 'connections_only',
      message_privacy: 'connections_only',
      credential_visibility: 'private',
      endorsement_visibility: 'connections_only',
      reputation_visibility: 'connections_only',
      activity_visibility: 'private',
      connection_list_visibility: 'private',
      allow_indexing: false,
      allow_endorsements: false,
      require_verification_for_messages: true
    }
  },
  {
    id: 'social',
    name: 'Social Networker',
    description: 'Open to connections while maintaining some privacy',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    settings: {
      profile_visibility: 'public',
      message_privacy: 'connections_only',
      credential_visibility: 'selective',
      endorsement_visibility: 'public',
      reputation_visibility: 'public',
      activity_visibility: 'connections_only',
      connection_list_visibility: 'connections_only',
      allow_indexing: true,
      allow_endorsements: true,
      require_verification_for_messages: false
    }
  },
  {
    id: 'stealth',
    name: 'Stealth Mode',
    description: 'Minimum visibility, maximum control and security',
    icon: Shield,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    settings: {
      profile_visibility: 'private',
      message_privacy: 'whitelist_only',
      credential_visibility: 'private',
      endorsement_visibility: 'private',
      reputation_visibility: 'private',
      activity_visibility: 'private',
      connection_list_visibility: 'private',
      allow_indexing: false,
      allow_endorsements: false,
      require_verification_for_messages: true
    }
  }
];

export default function PrivacyTemplates({ currentSettings, onApplyTemplate, disabled = false }) {
  const getCurrentTemplate = () => {
    if (!currentSettings) return null;
    
    return templates.find(template => {
      const settings = template.settings;
      return Object.keys(settings).every(key => {
        return currentSettings[key] === settings[key];
      });
    });
  };

  const currentTemplate = getCurrentTemplate();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => {
          const Icon = template.icon;
          const isActive = currentTemplate?.id === template.id;

          return (
            <Card 
              key={template.id} 
              className={`relative transition-all ${
                isActive ? 'ring-2 ring-indigo-500 bg-indigo-50/50' : 'hover:shadow-md'
              }`}
            >
              {isActive && (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-indigo-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${template.bgColor}`}>
                    <Icon className={`w-6 h-6 ${template.color}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="mt-1">{template.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="text-xs text-gray-600 font-medium">Quick Preview:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Profile:</span>
                      <span className="font-medium capitalize">
                        {template.settings.profile_visibility.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Messages:</span>
                      <span className="font-medium capitalize">
                        {template.settings.message_privacy.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Activity:</span>
                      <span className="font-medium capitalize">
                        {template.settings.activity_visibility.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Indexing:</span>
                      <span className="font-medium">
                        {template.settings.allow_indexing ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => onApplyTemplate(template.settings)}
                  disabled={disabled || isActive}
                  className="w-full"
                  variant={isActive ? 'outline' : 'default'}
                >
                  {isActive ? 'Currently Active' : 'Apply Template'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}