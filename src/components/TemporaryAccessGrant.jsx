import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Shield, 
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Eye
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function TemporaryAccessGrant({ myDid }) {
  const queryClient = useQueryClient();
  const [grantDid, setGrantDid] = useState('');
  const [duration, setDuration] = useState('24');
  const [accessType, setAccessType] = useState('profile');

  // Fetch temporary grants (we'll store them in a new entity)
  const { data: grants = [] } = useQuery({
    queryKey: ['temp-access-grants', myDid],
    queryFn: async () => {
      // For now, we'll use the DidPermission entity and filter by time
      const permissions = await base44.entities.DidPermission.filter({
        did_classic_address: myDid
      });
      // Filter for temporary ones (those with notes containing expiry)
      return permissions.filter(p => p.notes?.includes('TEMP_GRANT:'));
    },
    enabled: !!myDid
  });

  const createGrantMutation = useMutation({
    mutationFn: async ({ target_did, hours, access_type }) => {
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
      
      // Create a permission with special note marking it as temporary
      const permission = await base44.entities.DidPermission.create({
        did_classic_address: myDid,
        agent_id: target_did, // We'll use agent_id field to store the granted DID
        action: `temp_access_${access_type}`,
        granted_by_user_id: 'system',
        status: 'active',
        notes: `TEMP_GRANT:${expiresAt.toISOString()}:${access_type}`
      });
      
      return permission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temp-access-grants'] });
      toast.success('Temporary access granted');
      setGrantDid('');
    },
    onError: () => {
      toast.error('Failed to grant access');
    }
  });

  const revokeGrantMutation = useMutation({
    mutationFn: async (grantId) => {
      await base44.entities.DidPermission.update(grantId, {
        status: 'revoked',
        revoked_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temp-access-grants'] });
      toast.success('Access revoked');
    }
  });

  const handleGrantAccess = () => {
    if (!grantDid.startsWith('did:xrpl:')) {
      toast.error('Invalid DID format');
      return;
    }

    createGrantMutation.mutate({
      target_did: grantDid,
      hours: parseInt(duration),
      access_type: accessType
    });
  };

  const parseGrantInfo = (grant) => {
    const [, expiryStr, type] = grant.notes.split(':');
    const expiresAt = new Date(expiryStr);
    const isExpired = expiresAt < new Date();
    const hoursRemaining = Math.max(0, Math.floor((expiresAt - new Date()) / (1000 * 60 * 60)));
    
    return {
      expiresAt,
      isExpired,
      hoursRemaining,
      accessType: type,
      targetDid: grant.agent_id
    };
  };

  // Filter out expired grants
  const activeGrants = grants.filter(g => {
    const info = parseGrantInfo(g);
    return !info.isExpired && g.status === 'active';
  });

  const expiredGrants = grants.filter(g => {
    const info = parseGrantInfo(g);
    return info.isExpired || g.status === 'revoked';
  });

  return (
    <div className="space-y-6">
      {/* Grant Access Form */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            Grant Temporary Access
          </CardTitle>
          <CardDescription>
            Give time-limited access to specific DIDs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="DID to grant access (did:xrpl:...)"
            value={grantDid}
            onChange={(e) => setGrantDid(e.target.value)}
          />
          
          <div className="grid grid-cols-2 gap-3">
            <Select value={accessType} onValueChange={setAccessType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profile">Profile View</SelectItem>
                <SelectItem value="messages">Send Messages</SelectItem>
                <SelectItem value="credentials">View Credentials</SelectItem>
                <SelectItem value="full">Full Access</SelectItem>
              </SelectContent>
            </Select>

            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Hour</SelectItem>
                <SelectItem value="6">6 Hours</SelectItem>
                <SelectItem value="24">24 Hours</SelectItem>
                <SelectItem value="72">3 Days</SelectItem>
                <SelectItem value="168">1 Week</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGrantAccess}
            disabled={createGrantMutation.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Grant Access
          </Button>
        </CardContent>
      </Card>

      {/* Active Grants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              Active Grants
            </span>
            <Badge>{activeGrants.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeGrants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No active temporary access grants</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeGrants.map((grant) => {
                const info = parseGrantInfo(grant);
                
                return (
                  <div key={grant.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Eye className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="text-sm font-medium">
                          {info.targetDid.slice(0, 25)}...
                        </div>
                        <div className="text-xs text-gray-600">
                          {info.accessType.charAt(0).toUpperCase() + info.accessType.slice(1)} access • 
                          Expires in {info.hoursRemaining}h
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => revokeGrantMutation.mutate(grant.id)}
                      disabled={revokeGrantMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expired/Revoked Grants */}
      {expiredGrants.length > 0 && (
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-600">
              <AlertCircle className="w-5 h-5" />
              Expired Grants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiredGrants.slice(0, 5).map((grant) => {
                const info = parseGrantInfo(grant);
                
                return (
                  <div key={grant.id} className="flex items-center justify-between p-2 text-sm text-gray-600">
                    <span>{info.targetDid.slice(0, 25)}...</span>
                    <span className="text-xs">
                      {grant.status === 'revoked' ? 'Revoked' : 'Expired'}
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