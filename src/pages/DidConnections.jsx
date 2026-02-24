import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Users, 
  UserPlus, 
  MessageCircle, 
  Heart,
  Shield,
  Search,
  Star,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PrivacyBadge from '../components/PrivacyBadge';
import ReputationBadge from '../components/ReputationBadge';

export default function DidConnections() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [endorseDid, setEndorseDid] = useState('');
  const [endorsementRating, setEndorsementRating] = useState(5);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['connections-wallets'],
    queryFn: () => base44.entities.Wallet.list('-created_date'),
    enabled: !!user
  });

  const userWallet = wallets.find(w => w.owner_id === user?.id);
  const myDid = userWallet ? `did:xrpl:${userWallet.classic_address}` : null;

  // Fetch endorsements given and received
  const { data: endorsementsGiven = [] } = useQuery({
    queryKey: ['endorsements-given', myDid],
    queryFn: () => base44.entities.DidEndorsement.filter({ endorser_did: myDid }),
    enabled: !!myDid
  });

  const { data: endorsementsReceived = [] } = useQuery({
    queryKey: ['endorsements-received', myDid],
    queryFn: () => base44.entities.DidEndorsement.filter({ endorsed_did: myDid }),
    enabled: !!myDid
  });

  // Fetch trust relationships
  const { data: trustGiven = [] } = useQuery({
    queryKey: ['trust-given', myDid],
    queryFn: () => base44.entities.TrustRelationship.filter({ trustor_did: myDid }),
    enabled: !!myDid
  });

  const { data: trustReceived = [] } = useQuery({
    queryKey: ['trust-received', myDid],
    queryFn: () => base44.entities.TrustRelationship.filter({ trustee_did: myDid }),
    enabled: !!myDid
  });

  // Fetch all wallets for connection info
  const { data: allWallets = [] } = useQuery({
    queryKey: ['all-wallets-connections'],
    queryFn: () => base44.entities.Wallet.list('-created_date', 200)
  });

  // Fetch reputations
  const { data: reputations = [] } = useQuery({
    queryKey: ['all-reputations-connections'],
    queryFn: () => base44.entities.ReputationScore.list()
  });

  // Fetch privacy settings
  const { data: privacySettings = [] } = useQuery({
    queryKey: ['all-privacy-connections'],
    queryFn: () => base44.entities.DidPrivacySetting.list()
  });

  const endorseMutation = useMutation({
    mutationFn: async ({ did, rating, comment }) => {
      const response = await base44.functions.invoke('endorseDid', {
        endorsed_did: did,
        rating,
        comment,
        endorsement_type: 'trust'
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endorsements-given'] });
      toast.success('Endorsement sent');
      setEndorseDid('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to endorse');
    }
  });

  const getWalletByDid = (did) => {
    const address = did.split(':')[2];
    return allWallets.find(w => w.classic_address === address);
  };

  const getReputationByDid = (did) => {
    const address = did.split(':')[2];
    return reputations.find(r => r.did_classic_address === address);
  };

  const getPrivacyByDid = (did) => {
    const address = did.split(':')[2];
    return privacySettings.find(p => p.did_address === address);
  };

  // Build connections list
  const connections = [...new Set([
    ...endorsementsGiven.map(e => e.endorsed_did),
    ...endorsementsReceived.map(e => e.endorser_did),
    ...trustGiven.map(t => t.trustee_did),
    ...trustReceived.map(t => t.trustor_did)
  ])].filter(did => did !== myDid);

  const filteredConnections = connections.filter(did => {
    if (!searchTerm) return true;
    const wallet = getWalletByDid(did);
    return wallet?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           did.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleEndorse = () => {
    if (!endorseDid.startsWith('did:xrpl:')) {
      toast.error('Invalid DID format');
      return;
    }
    endorseMutation.mutate({
      did: endorseDid,
      rating: endorsementRating,
      comment: ''
    });
  };

  if (!userWallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <p className="text-gray-600">Create a DID first to manage connections</p>
              <Link to={createPageUrl('Wallets')}>
                <Button className="mt-4">Create DID</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
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
                <Users className="w-10 h-10 text-indigo-600" />
                My Connections
              </h1>
              <p className="text-gray-600">Manage your DID relationships and endorsements</p>
              <Badge className="mt-2 bg-purple-600">
                {connections.length} Connections
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">{connections.length}</div>
                <div className="text-sm text-gray-600 mt-1">Total Connections</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{endorsementsGiven.length}</div>
                <div className="text-sm text-gray-600 mt-1">Endorsed</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{endorsementsReceived.length}</div>
                <div className="text-sm text-gray-600 mt-1">Received</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{trustGiven.length}</div>
                <div className="text-sm text-gray-600 mt-1">Trust Links</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Endorse Someone */}
        <Card className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-purple-600" />
              Endorse a DID
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="did:xrpl:..."
                value={endorseDid}
                onChange={(e) => setEndorseDid(e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                min="1"
                max="5"
                value={endorsementRating}
                onChange={(e) => setEndorsementRating(Number(e.target.value))}
                className="w-20"
                placeholder="5"
              />
              <Button 
                onClick={handleEndorse}
                disabled={endorseMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Star className="w-4 h-4 mr-2" />
                Endorse
              </Button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Rate from 1-5 stars. This builds trust in the network.
            </p>
          </CardContent>
        </Card>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search connections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Connections Grid */}
        <Tabs defaultValue="all" className="mb-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All ({filteredConnections.length})</TabsTrigger>
            <TabsTrigger value="endorsed">Endorsed ({endorsementsGiven.length})</TabsTrigger>
            <TabsTrigger value="trusted">Trusted ({trustGiven.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-6">
            {filteredConnections.length === 0 ? (
              <Card className="bg-gray-50">
                <CardContent className="py-12 text-center">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No connections yet</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Start by endorsing other DIDs or sending messages
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredConnections.map((did) => {
                  const wallet = getWalletByDid(did);
                  const reputation = getReputationByDid(did);
                  const privacy = getPrivacyByDid(did);
                  const myEndorsement = endorsementsGiven.find(e => e.endorsed_did === did);
                  const theirEndorsement = endorsementsReceived.find(e => e.endorser_did === did);
                  const myTrust = trustGiven.find(t => t.trustee_did === did);
                  const theirTrust = trustReceived.find(t => t.trustor_did === did);

                  return (
                    <Card key={did} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">
                              {wallet?.name || 'Unknown Identity'}
                            </CardTitle>
                            <code className="text-xs text-gray-500 mt-1 block">
                              {did.slice(0, 30)}...
                            </code>
                          </div>
                          <div className="flex flex-col gap-2">
                            <ReputationBadge reputation={reputation} size="sm" />
                            {privacy && <PrivacyBadge level={privacy.profile_visibility} size="sm" />}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Connection Stats */}
                        <div className="grid grid-cols-2 gap-3">
                          {myEndorsement && (
                            <div className="flex items-center gap-2 text-xs">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>You endorsed ({myEndorsement.rating}★)</span>
                            </div>
                          )}
                          {theirEndorsement && (
                            <div className="flex items-center gap-2 text-xs">
                              <Heart className="w-4 h-4 text-pink-600" />
                              <span>Endorsed you ({theirEndorsement.rating}★)</span>
                            </div>
                          )}
                          {myTrust && (
                            <div className="flex items-center gap-2 text-xs">
                              <Shield className="w-4 h-4 text-blue-600" />
                              <span>Trust: {myTrust.trust_level}%</span>
                            </div>
                          )}
                          {theirTrust && (
                            <div className="flex items-center gap-2 text-xs">
                              <TrendingUp className="w-4 h-4 text-purple-600" />
                              <span>Trusts you: {theirTrust.trust_level}%</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-3 border-t">
                          <Link 
                            to={createPageUrl('DidMessaging') + `?to=${did}`}
                            className="flex-1"
                          >
                            <Button size="sm" variant="outline" className="w-full">
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Message
                            </Button>
                          </Link>
                          <Link
                            to={createPageUrl('DIDRegistry')}
                            className="flex-1"
                          >
                            <Button size="sm" variant="outline" className="w-full">
                              View Profile
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="endorsed" className="space-y-4 mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              {endorsementsGiven.map((endorsement) => {
                const wallet = getWalletByDid(endorsement.endorsed_did);
                const reputation = getReputationByDid(endorsement.endorsed_did);
                
                return (
                  <Card key={endorsement.id}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{wallet?.name || 'Unknown'}</span>
                        <div className="flex items-center gap-1">
                          {[...Array(endorsement.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {endorsement.comment && (
                        <p className="text-sm text-gray-600 mb-3">{endorsement.comment}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge className="text-xs capitalize">{endorsement.endorsement_type}</Badge>
                        <ReputationBadge reputation={reputation} size="sm" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="trusted" className="space-y-4 mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              {trustGiven.map((trust) => {
                const wallet = getWalletByDid(trust.trustee_did);
                const reputation = getReputationByDid(trust.trustee_did);
                
                return (
                  <Card key={trust.id}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {wallet?.name || 'Unknown Identity'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Trust Level</span>
                        <Badge className="bg-blue-600">{trust.trust_level}%</Badge>
                      </div>
                      {trust.calculated_trust_score && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Calculated Score</span>
                          <Badge variant="outline">{trust.calculated_trust_score}%</Badge>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge className="text-xs capitalize">{trust.trust_type}</Badge>
                        <Badge className="text-xs capitalize">{trust.trust_category}</Badge>
                        <ReputationBadge reputation={reputation} size="sm" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}