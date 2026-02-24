import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Network,
  TrendingUp,
  Users,
  Award,
  Target,
  ArrowRight,
  Shield,
  Activity,
  Eye,
  CheckCircle
} from 'lucide-react';
import TrustNetworkGraph from '../components/TrustNetworkGraph';
import TrustPathFinder from '../components/TrustPathFinder';
import ReputationBreakdown from '../components/ReputationBreakdown';

export default function DidTrustDashboard() {
  const [selectedDID, setSelectedDID] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['user-wallets'],
    queryFn: () => base44.entities.Wallet.list('-created_date'),
    enabled: !!user
  });

  const userDID = wallets[0] ? `did:xrpl:${wallets[0].classic_address}` : null;

  const { data: trustRelationships = [] } = useQuery({
    queryKey: ['trust-relationships', userDID],
    queryFn: () => base44.entities.TrustRelationship.list('-created_date', 200),
    enabled: !!userDID
  });

  const { data: myTrustGiven = [] } = useQuery({
    queryKey: ['trust-given', userDID],
    queryFn: () => base44.entities.TrustRelationship.filter({ trustor_did: userDID }),
    enabled: !!userDID
  });

  const { data: myTrustReceived = [] } = useQuery({
    queryKey: ['trust-received', userDID],
    queryFn: () => base44.entities.TrustRelationship.filter({ trustee_did: userDID }),
    enabled: !!userDID
  });

  const { data: endorsements = [] } = useQuery({
    queryKey: ['endorsements', userDID],
    queryFn: () => base44.entities.DidEndorsement.filter({ endorsed_did: userDID }),
    enabled: !!userDID
  });

  const { data: reputationScore } = useQuery({
    queryKey: ['reputation', userDID],
    queryFn: async () => {
      const scores = await base44.entities.ReputationScore.filter({ 
        did_classic_address: wallets[0].classic_address 
      });
      return scores[0] || null;
    },
    enabled: !!wallets[0]
  });

  const { data: allWallets = [] } = useQuery({
    queryKey: ['all-wallets'],
    queryFn: () => base44.entities.Wallet.list('-created_date', 200)
  });

  // Calculate trust metrics
  const avgTrustGiven = myTrustGiven.length > 0
    ? myTrustGiven.reduce((sum, t) => sum + t.trust_level, 0) / myTrustGiven.length
    : 0;

  const avgTrustReceived = myTrustReceived.length > 0
    ? myTrustReceived.reduce((sum, t) => sum + t.trust_level, 0) / myTrustReceived.length
    : 0;

  const derivedTrustCount = myTrustReceived.filter(t => t.trust_type === 'derived').length;
  const directTrustCount = myTrustReceived.filter(t => t.trust_type === 'direct').length;

  const avgEndorsementRating = endorsements.length > 0
    ? endorsements.reduce((sum, e) => sum + e.rating, 0) / endorsements.length
    : 0;

  const getTrustLevelColor = (level) => {
    if (level >= 80) return 'text-green-600 bg-green-100';
    if (level >= 60) return 'text-blue-600 bg-blue-100';
    if (level >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getTrustLevelLabel = (level) => {
    if (level >= 80) return 'High Trust';
    if (level >= 60) return 'Moderate Trust';
    if (level >= 40) return 'Low Trust';
    return 'Minimal Trust';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
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
                <Network className="w-10 h-10 text-indigo-600" />
                Trust & Reputation Dashboard
              </h1>
              <p className="text-gray-600">Visualize trust networks and reputation metrics</p>
            </div>
            <div className="text-right">
              {reputationScore && (
                <div>
                  <div className="text-3xl font-bold text-indigo-600">
                    {reputationScore.overall_score}
                  </div>
                  <Badge className="mt-1 bg-indigo-600">
                    {reputationScore.trust_level}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{myTrustGiven.length}</div>
                <div className="text-sm text-gray-600">Trusting</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{myTrustReceived.length}</div>
                <div className="text-sm text-gray-600">Trusted By</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Award className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{endorsements.length}</div>
                <div className="text-sm text-gray-600">Endorsements</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Target className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {avgTrustReceived.toFixed(0)}
                </div>
                <div className="text-sm text-gray-600">Avg Trust</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Activity className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{derivedTrustCount}</div>
                <div className="text-sm text-gray-600">Network Trust</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="network" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="network">Trust Network</TabsTrigger>
            <TabsTrigger value="paths">Trust Paths</TabsTrigger>
            <TabsTrigger value="reputation">Reputation</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          {/* Network Visualization */}
          <TabsContent value="network">
            <TrustNetworkGraph 
              userDID={userDID}
              trustRelationships={trustRelationships}
              wallets={allWallets}
            />
          </TabsContent>

          {/* Trust Paths */}
          <TabsContent value="paths">
            <TrustPathFinder 
              userDID={userDID}
              trustRelationships={trustRelationships}
              wallets={allWallets}
            />
          </TabsContent>

          {/* Reputation Breakdown */}
          <TabsContent value="reputation">
            <ReputationBreakdown 
              userDID={userDID}
              reputationScore={reputationScore}
              endorsements={endorsements}
              trustReceived={myTrustReceived}
            />
          </TabsContent>

          {/* Trust Analysis */}
          <TabsContent value="analysis">
            <div className="grid grid-cols-2 gap-6">
              {/* Trust Given */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 text-green-600" />
                    Trust You've Given
                  </CardTitle>
                  <CardDescription>DIDs you trust and why</CardDescription>
                </CardHeader>
                <CardContent>
                  {myTrustGiven.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No trust relationships yet</p>
                  ) : (
                    <div className="space-y-3">
                      {myTrustGiven.map((trust) => (
                        <div key={trust.id} className="p-3 border rounded-lg bg-white">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-mono text-gray-900">
                                {trust.trustee_did.substring(0, 30)}...
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline">{trust.trust_type}</Badge>
                                <Badge variant="outline">{trust.trust_category}</Badge>
                              </div>
                            </div>
                            <div className={`text-right px-3 py-1 rounded-lg ${getTrustLevelColor(trust.trust_level)}`}>
                              <div className="text-xl font-bold">{trust.trust_level}</div>
                              <div className="text-xs">{getTrustLevelLabel(trust.trust_level)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Trust Received */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Trust You've Received
                  </CardTitle>
                  <CardDescription>DIDs that trust you</CardDescription>
                </CardHeader>
                <CardContent>
                  {myTrustReceived.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No trust received yet</p>
                  ) : (
                    <div className="space-y-3">
                      {myTrustReceived.map((trust) => (
                        <div key={trust.id} className="p-3 border rounded-lg bg-white">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-mono text-gray-900">
                                {trust.trustor_did.substring(0, 30)}...
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline">{trust.trust_type}</Badge>
                                <Badge variant="outline">{trust.trust_category}</Badge>
                              </div>
                              {trust.trust_path && trust.trust_path.length > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Path length: {trust.path_length} hops
                                </div>
                              )}
                            </div>
                            <div className={`text-right px-3 py-1 rounded-lg ${getTrustLevelColor(trust.trust_level)}`}>
                              <div className="text-xl font-bold">{trust.trust_level}</div>
                              <div className="text-xs">{getTrustLevelLabel(trust.trust_level)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Endorsements */}
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-600" />
                    Recent Endorsements
                  </CardTitle>
                  <CardDescription>
                    {endorsements.length} total endorsements · Avg rating: {avgEndorsementRating.toFixed(1)}/5
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {endorsements.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No endorsements yet</p>
                  ) : (
                    <div className="space-y-3">
                      {endorsements.slice(0, 10).map((endorsement) => (
                        <div key={endorsement.id} className="p-4 border rounded-lg bg-white">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="bg-purple-600">{endorsement.endorsement_type}</Badge>
                                <div className="flex items-center gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <span key={i} className={i < endorsement.rating ? 'text-yellow-500' : 'text-gray-300'}>
                                      ★
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="text-sm text-gray-600">{endorsement.comment}</div>
                              {endorsement.tags && endorsement.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {endorsement.tags.map((tag, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="text-right text-xs text-gray-500">
                              <div className="font-mono">
                                {endorsement.endorser_did.substring(0, 20)}...
                              </div>
                              <div className="mt-1">
                                {new Date(endorsement.created_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}