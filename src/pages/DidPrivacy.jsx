import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Shield,
  Lock,
  Eye,
  EyeOff,
  Globe,
  Users,
  UserCheck,
  Ban,
  Settings,
  AlertCircle,
  CheckCircle,
  Save,
  BarChart3
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import PrivacyTemplates from '../components/PrivacyTemplates';
import TemporaryAccessGrant from '../components/TemporaryAccessGrant';
import PrivacyShareLinks from '../components/PrivacyShareLinks';

export default function DidPrivacy() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['privacy-wallets'],
    queryFn: () => base44.entities.Wallet.list('-created_date'),
    enabled: !!user
  });

  const userWallet = wallets.find(w => w.owner_id === user?.id);

  const { data: privacySettings, isLoading } = useQuery({
    queryKey: ['privacy-settings', userWallet?.classic_address],
    queryFn: async () => {
      const settings = await base44.entities.DidPrivacySetting.filter({
        did_address: userWallet.classic_address
      });
      return settings[0] || null;
    },
    enabled: !!userWallet
  });

  const [settings, setSettings] = useState({
    profile_visibility: 'public',
    message_privacy: 'anyone',
    credential_visibility: 'private',
    endorsement_visibility: 'public',
    reputation_visibility: 'public',
    activity_visibility: 'connections_only',
    connection_list_visibility: 'connections_only',
    allow_indexing: true,
    allow_endorsements: true,
    require_verification_for_messages: false
  });

  const [blockedDID, setBlockedDID] = useState('');
  const [whitelistedDID, setWhitelistedDID] = useState('');

  React.useEffect(() => {
    if (privacySettings) {
      setSettings({
        profile_visibility: privacySettings.profile_visibility || 'public',
        message_privacy: privacySettings.message_privacy || 'anyone',
        credential_visibility: privacySettings.credential_visibility || 'private',
        endorsement_visibility: privacySettings.endorsement_visibility || 'public',
        reputation_visibility: privacySettings.reputation_visibility || 'public',
        activity_visibility: privacySettings.activity_visibility || 'connections_only',
        connection_list_visibility: privacySettings.connection_list_visibility || 'connections_only',
        allow_indexing: privacySettings.allow_indexing ?? true,
        allow_endorsements: privacySettings.allow_endorsements ?? true,
        require_verification_for_messages: privacySettings.require_verification_for_messages ?? false,
        blocked_dids: privacySettings.blocked_dids || [],
        whitelisted_dids: privacySettings.whitelisted_dids || []
      });
    }
  }, [privacySettings]);

  const updatePrivacyMutation = useMutation({
    mutationFn: async (newSettings) => {
      const response = await base44.functions.invoke('updateDidPrivacy', {
        settings: newSettings
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacy-settings'] });
      toast.success('Privacy settings updated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update settings');
    }
  });

  const handleSaveSettings = () => {
    updatePrivacyMutation.mutate(settings);
  };

  const handleAddBlocked = () => {
    if (!blockedDID.startsWith('did:xrpl:')) {
      toast.error('Invalid DID format');
      return;
    }
    if (settings.blocked_dids?.includes(blockedDID)) {
      toast.error('DID already blocked');
      return;
    }
    setSettings({
      ...settings,
      blocked_dids: [...(settings.blocked_dids || []), blockedDID]
    });
    setBlockedDID('');
  };

  const handleRemoveBlocked = (did) => {
    setSettings({
      ...settings,
      blocked_dids: settings.blocked_dids.filter(d => d !== did)
    });
  };

  const handleAddWhitelisted = () => {
    if (!whitelistedDID.startsWith('did:xrpl:')) {
      toast.error('Invalid DID format');
      return;
    }
    if (settings.whitelisted_dids?.includes(whitelistedDID)) {
      toast.error('DID already whitelisted');
      return;
    }
    setSettings({
      ...settings,
      whitelisted_dids: [...(settings.whitelisted_dids || []), whitelistedDID]
    });
    setWhitelistedDID('');
  };

  const handleRemoveWhitelisted = (did) => {
    setSettings({
      ...settings,
      whitelisted_dids: settings.whitelisted_dids.filter(d => d !== did)
    });
  };

  const handleApplyTemplate = (templateSettings) => {
    setSettings({
      ...settings,
      ...templateSettings
    });
    toast.success('Template applied - remember to save your changes');
  };

  const getVisibilityIcon = (level) => {
    if (level === 'public' || level === 'anyone') return <Globe className="w-4 h-4 text-green-600" />;
    if (level === 'connections_only' || level === 'trusted_only') return <Users className="w-4 h-4 text-blue-600" />;
    if (level === 'private' || level === 'whitelist_only') return <Lock className="w-4 h-4 text-red-600" />;
    return <Eye className="w-4 h-4 text-gray-600" />;
  };

  const getVisibilityColor = (level) => {
    if (level === 'public' || level === 'anyone') return 'bg-green-100 text-green-800';
    if (level === 'connections_only' || level === 'trusted_only') return 'bg-blue-100 text-blue-800';
    if (level === 'private' || level === 'whitelist_only') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">Loading privacy settings...</div>
        </div>
      </div>
    );
  }

  if (!userWallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <p className="text-gray-600">No wallet found. Create a DID first.</p>
              <Link to={createPageUrl('Wallets')}>
                <Button className="mt-4">Go to Wallets</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to={createPageUrl('Home')}>
            <Button variant="outline" className="mb-4">
              ← Back to Home
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Shield className="w-10 h-10 text-indigo-600" />
                Privacy & Security
              </h1>
              <p className="text-gray-600">Control who can access your DID information</p>
              <Badge className="mt-2 bg-purple-600">Advanced Privacy Controls</Badge>
            </div>
            <div className="flex gap-2">
              <Link to={createPageUrl('DidPrivacyAnalytics')}>
                <Button variant="outline">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
              </Link>
              <Button
                onClick={handleSaveSettings}
                disabled={updatePrivacyMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {updatePrivacyMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>

        {/* Current Privacy Summary */}
        <Card className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-gray-700">Your DID</div>
              <Badge variant="outline">
                {userWallet.classic_address}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-lg text-center">
                <div className="flex items-center justify-center mb-2">
                  {getVisibilityIcon(settings.profile_visibility)}
                </div>
                <div className="text-xs text-gray-600">Profile</div>
                <div className="text-xs font-medium capitalize">{settings.profile_visibility}</div>
              </div>
              <div className="bg-white p-3 rounded-lg text-center">
                <div className="flex items-center justify-center mb-2">
                  {getVisibilityIcon(settings.message_privacy)}
                </div>
                <div className="text-xs text-gray-600">Messages</div>
                <div className="text-xs font-medium capitalize">{settings.message_privacy}</div>
              </div>
              <div className="bg-white p-3 rounded-lg text-center">
                <div className="flex items-center justify-center mb-2">
                  {getVisibilityIcon(settings.credential_visibility)}
                </div>
                <div className="text-xs text-gray-600">Credentials</div>
                <div className="text-xs font-medium capitalize">{settings.credential_visibility}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="share">Share Links</TabsTrigger>
            <TabsTrigger value="access">Temp Access</TabsTrigger>
            <TabsTrigger value="lists">Block/Whitelist</TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
        {/* Visibility Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Visibility Settings
            </CardTitle>
            <CardDescription>Control who can see different aspects of your DID</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label>Profile Visibility</Label>
                  <p className="text-xs text-gray-600">Who can view your DID profile</p>
                </div>
                <Select
                  value={settings.profile_visibility}
                  onValueChange={(value) => setSettings({ ...settings, profile_visibility: value })}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="connections_only">Connections Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label>Message Privacy</Label>
                  <p className="text-xs text-gray-600">Who can send you messages</p>
                </div>
                <Select
                  value={settings.message_privacy}
                  onValueChange={(value) => setSettings({ ...settings, message_privacy: value })}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anyone">Anyone</SelectItem>
                    <SelectItem value="connections_only">Connections Only</SelectItem>
                    <SelectItem value="trusted_only">Trusted Only</SelectItem>
                    <SelectItem value="whitelist_only">Whitelist Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label>Credential Visibility</Label>
                  <p className="text-xs text-gray-600">Who can see your credentials</p>
                </div>
                <Select
                  value={settings.credential_visibility}
                  onValueChange={(value) => setSettings({ ...settings, credential_visibility: value })}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="selective">Selective</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label>Endorsement Visibility</Label>
                  <p className="text-xs text-gray-600">Who can see endorsements</p>
                </div>
                <Select
                  value={settings.endorsement_visibility}
                  onValueChange={(value) => setSettings({ ...settings, endorsement_visibility: value })}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="connections_only">Connections Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label>Reputation Visibility</Label>
                  <p className="text-xs text-gray-600">Who can see your reputation score</p>
                </div>
                <Select
                  value={settings.reputation_visibility}
                  onValueChange={(value) => setSettings({ ...settings, reputation_visibility: value })}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="connections_only">Connections Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label>Activity Visibility</Label>
                  <p className="text-xs text-gray-600">Who can see your activity</p>
                </div>
                <Select
                  value={settings.activity_visibility}
                  onValueChange={(value) => setSettings({ ...settings, activity_visibility: value })}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="connections_only">Connections Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label>Connection List Visibility</Label>
                  <p className="text-xs text-gray-600">Who can see your connections</p>
                </div>
                <Select
                  value={settings.connection_list_visibility}
                  onValueChange={(value) => setSettings({ ...settings, connection_list_visibility: value })}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="connections_only">Connections Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label>Allow Indexing</Label>
                <p className="text-xs text-gray-600">Appear in search results</p>
              </div>
              <Switch
                checked={settings.allow_indexing}
                onCheckedChange={(checked) => setSettings({ ...settings, allow_indexing: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label>Allow Endorsements</Label>
                <p className="text-xs text-gray-600">Let others endorse you</p>
              </div>
              <Switch
                checked={settings.allow_endorsements}
                onCheckedChange={(checked) => setSettings({ ...settings, allow_endorsements: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label>Require Verification for Messages</Label>
                <p className="text-xs text-gray-600">Only accept messages from verified DIDs</p>
              </div>
              <Switch
                checked={settings.require_verification_for_messages}
                onCheckedChange={(checked) => setSettings({ ...settings, require_verification_for_messages: checked })}
              />
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <PrivacyTemplates 
              currentSettings={settings}
              onApplyTemplate={handleApplyTemplate}
              disabled={updatePrivacyMutation.isPending}
            />
          </TabsContent>

          {/* Share Links Tab */}
          <TabsContent value="share">
            <PrivacyShareLinks myDid={userWallet.classic_address} />
          </TabsContent>

          {/* Temporary Access Tab */}
          <TabsContent value="access">
            <TemporaryAccessGrant myDid={userWallet.classic_address} />
          </TabsContent>

          {/* Block/Whitelist Tab */}
          <TabsContent value="lists" className="space-y-6">
        {/* Block List */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-600" />
              Blocked DIDs ({settings.blocked_dids?.length || 0})
            </CardTitle>
            <CardDescription>DIDs that cannot interact with you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="did:xrpl:..."
                  value={blockedDID}
                  onChange={(e) => setBlockedDID(e.target.value)}
                />
                <Button onClick={handleAddBlocked} variant="destructive">
                  <Ban className="w-4 h-4 mr-2" />
                  Block
                </Button>
              </div>
              {settings.blocked_dids && settings.blocked_dids.length > 0 && (
                <div className="space-y-2">
                  {settings.blocked_dids.map((did) => (
                    <div key={did} className="flex items-center justify-between bg-red-50 p-3 rounded-lg">
                      <code className="text-xs truncate flex-1">{did}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveBlocked(did)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Whitelist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-green-600" />
              Whitelisted DIDs ({settings.whitelisted_dids?.length || 0})
            </CardTitle>
            <CardDescription>DIDs with special access privileges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="did:xrpl:..."
                  value={whitelistedDID}
                  onChange={(e) => setWhitelistedDID(e.target.value)}
                />
                <Button onClick={handleAddWhitelisted} className="bg-green-600 hover:bg-green-700">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
              {settings.whitelisted_dids && settings.whitelisted_dids.length > 0 && (
                <div className="space-y-2">
                  {settings.whitelisted_dids.map((did) => (
                    <div key={did} className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                      <code className="text-xs truncate flex-1">{did}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveWhitelisted(did)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}