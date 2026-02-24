import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useParams } from 'react-router-dom';
import { 
  Shield,
  Award,
  Star,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Lock
} from 'lucide-react';
import ReputationBadge from '../components/ReputationBadge';

export default function SharedDidView() {
  const { didAddress, linkId } = useParams();

  // Verify the share link
  const { data: shareLink, isLoading: linkLoading, error: linkError } = useQuery({
    queryKey: ['verify-share-link', didAddress, linkId],
    queryFn: async () => {
      const permissions = await base44.entities.DidPermission.filter({
        did_classic_address: didAddress,
        agent_id: linkId,
        action: 'share_link',
        status: 'active'
      });
      
      if (permissions.length === 0) {
        throw new Error('Invalid or expired link');
      }
      
      const link = permissions[0];
      const info = JSON.parse(link.notes);
      
      // Check if expired
      if (new Date(info.expiresAt) < new Date()) {
        throw new Error('This link has expired');
      }
      
      // Increment view count
      await base44.entities.DidPermission.update(link.id, {
        notes: JSON.stringify({
          ...info,
          views: (info.views || 0) + 1
        })
      });
      
      return { ...link, info };
    }
  });

  // Fetch wallet info
  const { data: wallets = [] } = useQuery({
    queryKey: ['shared-wallet', didAddress],
    queryFn: () => base44.entities.Wallet.filter({ classic_address: didAddress }),
    enabled: !!shareLink
  });

  const wallet = wallets[0];

  // Fetch reputation if allowed
  const { data: reputation } = useQuery({
    queryKey: ['shared-reputation', didAddress],
    queryFn: () => base44.entities.ReputationScore.filter({ 
      did_classic_address: didAddress 
    }),
    enabled: !!shareLink && shareLink.info?.permissions?.view_reputation
  });

  // Fetch credentials if allowed
  const { data: credentials = [] } = useQuery({
    queryKey: ['shared-credentials', didAddress],
    queryFn: () => base44.entities.DidCredential.filter({ 
      subject_did: `did:xrpl:${didAddress}`,
      status: 'active'
    }),
    enabled: !!shareLink && shareLink.info?.permissions?.view_credentials
  });

  // Fetch endorsements if allowed
  const { data: endorsements = [] } = useQuery({
    queryKey: ['shared-endorsements', didAddress],
    queryFn: () => base44.entities.DidEndorsement.filter({ 
      endorsed_did: `did:xrpl:${didAddress}` 
    }),
    enabled: !!shareLink && shareLink.info?.permissions?.view_endorsements
  });

  // Fetch connections if allowed
  const { data: trustRelationships = [] } = useQuery({
    queryKey: ['shared-connections', didAddress],
    queryFn: async () => {
      const did = `did:xrpl:${didAddress}`;
      const [given, received] = await Promise.all([
        base44.entities.TrustRelationship.filter({ trustor_did: did }),
        base44.entities.TrustRelationship.filter({ trustee_did: did })
      ]);
      return [...given, ...received];
    },
    enabled: !!shareLink && shareLink.info?.permissions?.view_connections
  });

  if (linkLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (linkError || !shareLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
            <p className="text-gray-600">
              {linkError?.message || 'This share link is invalid or has expired.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const permissions = shareLink.info.permissions;
  const expiresAt = new Date(shareLink.info.expiresAt);
  const hoursRemaining = Math.max(0, Math.floor((expiresAt - new Date()) / (1000 * 60 * 60)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-4">
            <Eye className="w-4 h-4 text-indigo-600" />
            <span className="text-sm text-gray-600">Shared DID View</span>
            <Badge variant="outline" className="ml-2">
              <Clock className="w-3 h-3 mr-1" />
              {hoursRemaining}h left
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {wallet?.name || 'Decentralized Identity'}
          </h1>
          <p className="text-gray-600">Viewing via: {shareLink.info.name}</p>
        </div>

        {/* Profile Card */}
        {permissions.view_profile && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                DID Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-gray-600 mb-1">DID Address</div>
                <code className="text-xs bg-gray-100 p-2 rounded block">
                  did:xrpl:{didAddress}
                </code>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Network</div>
                <Badge className={wallet?.network === 'mainnet' ? 'bg-green-600' : 'bg-orange-600'}>
                  {wallet?.network || 'Unknown'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reputation */}
        {permissions.view_reputation && reputation && reputation[0] && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                Reputation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <ReputationBadge reputation={reputation[0]} size="lg" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {reputation[0].overall_score}/100
                  </div>
                  <div className="text-sm text-gray-600 capitalize">
                    {reputation[0].trust_level}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Credentials */}
        {permissions.view_credentials && credentials.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Credentials
                </span>
                <Badge>{credentials.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {credentials.map((cred) => (
                  <div key={cred.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900">{cred.credential_name}</div>
                      <Badge className="bg-green-600 capitalize">
                        {cred.credential_type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    {cred.issuance_date && (
                      <div className="text-xs text-gray-600">
                        Issued: {new Date(cred.issuance_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Endorsements */}
        {permissions.view_endorsements && endorsements.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-600" />
                  Endorsements
                </span>
                <Badge>{endorsements.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {endorsements.slice(0, 5).map((endorsement) => (
                  <div key={endorsement.id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      {[...Array(endorsement.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <Badge className="capitalize">{endorsement.endorsement_type}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connections */}
        {permissions.view_connections && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Connections
                </span>
                <Badge>{trustRelationships.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trustRelationships.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No connections to display</p>
              ) : (
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{trustRelationships.length}</div>
                  <div className="text-sm text-gray-600 mt-1">Trust Relationships</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Access Restrictions Notice */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="py-6">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Lock className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900 mb-1">Limited Access View</div>
                <div>
                  You're viewing this DID through a temporary share link. 
                  Some information may be restricted based on the owner's privacy settings.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}