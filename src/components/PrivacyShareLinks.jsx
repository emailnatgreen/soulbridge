import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Link as LinkIcon, 
  Copy,
  Trash2,
  Eye,
  Calendar,
  QrCode,
  Share2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function PrivacyShareLinks({ myDid }) {
  const queryClient = useQueryClient();
  const [linkName, setLinkName] = useState('');
  const [expiryHours, setExpiryHours] = useState('24');
  const [permissions, setPermissions] = useState({
    view_profile: true,
    view_credentials: false,
    view_reputation: true,
    view_endorsements: false,
    view_connections: false
  });

  // We'll store share links as a special type of permission
  const { data: shareLinks = [] } = useQuery({
    queryKey: ['privacy-share-links', myDid],
    queryFn: async () => {
      const allPermissions = await base44.entities.DidPermission.filter({
        did_classic_address: myDid
      });
      return allPermissions.filter(p => p.action === 'share_link');
    },
    enabled: !!myDid
  });

  const createLinkMutation = useMutation({
    mutationFn: async ({ name, hours, perms }) => {
      const linkId = Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
      
      const permission = await base44.entities.DidPermission.create({
        did_classic_address: myDid,
        agent_id: linkId, // Use agent_id to store the link ID
        action: 'share_link',
        granted_by_user_id: 'system',
        status: 'active',
        notes: JSON.stringify({
          name,
          expiresAt: expiresAt.toISOString(),
          permissions: perms,
          views: 0,
          created: new Date().toISOString()
        })
      });
      
      return permission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacy-share-links'] });
      toast.success('Share link created');
      setLinkName('');
      setPermissions({
        view_profile: true,
        view_credentials: false,
        view_reputation: true,
        view_endorsements: false,
        view_connections: false
      });
    },
    onError: () => {
      toast.error('Failed to create link');
    }
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId) => {
      await base44.entities.DidPermission.update(linkId, {
        status: 'revoked'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacy-share-links'] });
      toast.success('Link deleted');
    }
  });

  const handleCreateLink = () => {
    if (!linkName.trim()) {
      toast.error('Please enter a link name');
      return;
    }

    const selectedPerms = Object.entries(permissions)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key);

    if (selectedPerms.length === 0) {
      toast.error('Select at least one permission');
      return;
    }

    createLinkMutation.mutate({
      name: linkName,
      hours: parseInt(expiryHours),
      perms: permissions
    });
  };

  const copyShareLink = (linkId) => {
    const url = `${window.location.origin}/share/${myDid}/${linkId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const parseNotes = (notes) => {
    try {
      return JSON.parse(notes);
    } catch {
      return { name: 'Unknown', expiresAt: null, permissions: {}, views: 0 };
    }
  };

  const activeLinks = shareLinks.filter(link => {
    const info = parseNotes(link.notes);
    const isExpired = info.expiresAt && new Date(info.expiresAt) < new Date();
    return !isExpired && link.status === 'active';
  });

  const expiredLinks = shareLinks.filter(link => {
    const info = parseNotes(link.notes);
    const isExpired = info.expiresAt && new Date(info.expiresAt) < new Date();
    return isExpired || link.status === 'revoked';
  });

  return (
    <div className="space-y-6">
      {/* Create Link Form */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            Create Shareable Link
          </CardTitle>
          <CardDescription>
            Generate a secure, time-limited link to share your DID information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Link Name</Label>
            <Input
              placeholder="e.g., Job Application, Conference Badge, etc."
              value={linkName}
              onChange={(e) => setLinkName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Expiry</Label>
            <Select value={expiryHours} onValueChange={setExpiryHours}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Hour</SelectItem>
                <SelectItem value="6">6 Hours</SelectItem>
                <SelectItem value="24">24 Hours</SelectItem>
                <SelectItem value="72">3 Days</SelectItem>
                <SelectItem value="168">1 Week</SelectItem>
                <SelectItem value="720">30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-3 block">Permissions</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="view_profile"
                  checked={permissions.view_profile}
                  onCheckedChange={(checked) => 
                    setPermissions({ ...permissions, view_profile: checked })
                  }
                />
                <Label htmlFor="view_profile" className="font-normal">
                  View Profile Information
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="view_credentials"
                  checked={permissions.view_credentials}
                  onCheckedChange={(checked) => 
                    setPermissions({ ...permissions, view_credentials: checked })
                  }
                />
                <Label htmlFor="view_credentials" className="font-normal">
                  View Credentials
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="view_reputation"
                  checked={permissions.view_reputation}
                  onCheckedChange={(checked) => 
                    setPermissions({ ...permissions, view_reputation: checked })
                  }
                />
                <Label htmlFor="view_reputation" className="font-normal">
                  View Reputation Score
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="view_endorsements"
                  checked={permissions.view_endorsements}
                  onCheckedChange={(checked) => 
                    setPermissions({ ...permissions, view_endorsements: checked })
                  }
                />
                <Label htmlFor="view_endorsements" className="font-normal">
                  View Endorsements
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="view_connections"
                  checked={permissions.view_connections}
                  onCheckedChange={(checked) => 
                    setPermissions({ ...permissions, view_connections: checked })
                  }
                />
                <Label htmlFor="view_connections" className="font-normal">
                  View Connections List
                </Label>
              </div>
            </div>
          </div>

          <Button
            onClick={handleCreateLink}
            disabled={createLinkMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            Generate Link
          </Button>
        </CardContent>
      </Card>

      {/* Active Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Active Share Links
            </span>
            <Badge>{activeLinks.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeLinks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <LinkIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No active share links</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeLinks.map((link) => {
                const info = parseNotes(link.notes);
                const linkId = link.agent_id;
                const expiresAt = new Date(info.expiresAt);
                const hoursRemaining = Math.max(0, Math.floor((expiresAt - new Date()) / (1000 * 60 * 60)));
                const permCount = Object.values(info.permissions).filter(Boolean).length;

                return (
                  <div key={link.id} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{info.name}</div>
                        <div className="text-xs text-gray-600 mt-1 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Expires in {hoursRemaining}h
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {info.views || 0} views
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {permCount} permissions
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyShareLink(linkId)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteLinkMutation.mutate(link.id)}
                          disabled={deleteLinkMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs font-mono bg-white p-2 rounded border border-green-300 truncate">
                      {window.location.origin}/share/{myDid}/{linkId}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expired Links */}
      {expiredLinks.length > 0 && (
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-600">
              <AlertCircle className="w-5 h-5" />
              Expired Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiredLinks.slice(0, 5).map((link) => {
                const info = parseNotes(link.notes);
                
                return (
                  <div key={link.id} className="flex items-center justify-between p-2 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">{info.name}</span>
                      <span className="text-xs ml-2">• {info.views || 0} views</span>
                    </div>
                    <span className="text-xs">
                      {link.status === 'revoked' ? 'Deleted' : 'Expired'}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}