import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  GitBranch,
  Search,
  TrendingUp,
  Shield,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Network,
  Calculator,
  Eye,
  RefreshCw
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

export default function DidTrustGraph() {
  const [selectedDID, setSelectedDID] = useState('');
  const [targetDID, setTargetDID] = useState('');
  const [calculationResult, setCalculationResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['trust-wallets'],
    queryFn: () => base44.entities.Wallet.list('-created_date', 200)
  });

  const { data: trustRelationships = [], refetch: refetchTrust } = useQuery({
    queryKey: ['trust-relationships'],
    queryFn: () => base44.entities.TrustRelationship.list('-last_calculated', 500),
    refetchInterval: 30000
  });

  const { data: endorsements = [] } = useQuery({
    queryKey: ['trust-endorsements'],
    queryFn: () => base44.entities.DidEndorsement.list('-created_date', 500)
  });

  const { data: reputations = [] } = useQuery({
    queryKey: ['trust-reputations'],
    queryFn: () => base44.entities.ReputationScore.list('-overall_score', 200)
  });

  const userWallet = wallets.find(w => w.owner_id === user?.id);
  const userDID = userWallet ? `did:xrpl:${userWallet.classic_address}` : null;

  const calculateTrustMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('calculateTrustScore', data);
      return response.data;
    },
    onSuccess: (data) => {
      setCalculationResult(data);
      queryClient.invalidateQueries({ queryKey: ['trust-relationships'] });
      toast.success('Trust score calculated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to calculate trust');
    }
  });

  const handleCalculateTrust = () => {
    if (!selectedDID || !targetDID) {
      toast.error('Please select both DIDs');
      return;
    }
    calculateTrustMutation.mutate({
      from_did: selectedDID,
      to_did: targetDID,
      max_depth: 3
    });
  };

  const trustStats = useMemo(() => {
    const directTrust = trustRelationships.filter(t => t.trust_type === 'direct').length;
    const derivedTrust = trustRelationships.filter(t => t.trust_type === 'derived').length;
    const highTrust = trustRelationships.filter(t => t.calculated_trust_score >= 70).length;
    const avgConfidence = trustRelationships.length > 0
      ? trustRelationships.reduce((sum, t) => sum + (t.confidence_score || 0), 0) / trustRelationships.length
      : 0;

    return {
      total: trustRelationships.length,
      direct: directTrust,
      derived: derivedTrust,
      highTrust,
      avgConfidence: Math.round(avgConfidence)
    };
  }, [trustRelationships]);

  const trustNetwork = useMemo(() => {
    if (!userDID) return { incoming: [], outgoing: [], mutual: [] };

    const incoming = trustRelationships.filter(t => t.trustee_did === userDID);
    const outgoing = trustRelationships.filter(t => t.trustor_did === userDID);
    
    const mutualDIDs = incoming
      .filter(inc => outgoing.some(out => out.trustee_did === inc.trustor_did))
      .map(inc => inc.trustor_did);

    const mutual = incoming.filter(t => mutualDIDs.includes(t.trustor_did));

    return { incoming, outgoing, mutual };
  }, [trustRelationships, userDID]);

  const getTrustColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getTrustIcon = (type) => {
    const icons = {
      direct: <Shield className="w-4 h-4" />,
      derived: <GitBranch className="w-4 h-4" />,
      vouched: <CheckCircle className="w-4 h-4" />
    };
    return icons[type] || <Shield className="w-4 h-4" />;
  };

  const filteredWallets = wallets
    .filter(w => !w.notes?.includes('REVOKED'))
    .filter(w => 
      w.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.classic_address?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
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
                <GitBranch className="w-10 h-10 text-indigo-600" />
                DID Trust Graph
              </h1>
              <p className="text-gray-600">Web of trust & multi-hop trust chain analysis</p>
              <Badge className="mt-2 bg-purple-600">Network Trust Intelligence</Badge>
            </div>
            <Button
              variant="outline"
              onClick={() => refetchTrust()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">{trustStats.total}</div>
                <div className="text-sm text-gray-600 mt-1">Trust Links</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{trustStats.direct}</div>
                <div className="text-sm text-gray-600 mt-1">Direct</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{trustStats.derived}</div>
                <div className="text-sm text-gray-600 mt-1">Derived</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-600">{trustStats.highTrust}</div>
                <div className="text-sm text-gray-600 mt-1">High Trust</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{trustStats.avgConfidence}%</div>
                <div className="text-sm text-gray-600 mt-1">Avg Confidence</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trust Calculator */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Calculate Trust Score
            </CardTitle>
            <CardDescription>
              Calculate trust score between any two DIDs using multi-hop analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">From DID (Trustor)</label>
                  <Input
                    placeholder="did:xrpl:... or search"
                    value={selectedDID}
                    onChange={(e) => setSelectedDID(e.target.value)}
                    list="from-dids"
                  />
                  <datalist id="from-dids">
                    {filteredWallets.map(w => (
                      <option key={w.id} value={`did:xrpl:${w.classic_address}`}>
                        {w.name || w.classic_address}
                      </option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">To DID (Trustee)</label>
                  <Input
                    placeholder="did:xrpl:... or search"
                    value={targetDID}
                    onChange={(e) => setTargetDID(e.target.value)}
                    list="to-dids"
                  />
                  <datalist id="to-dids">
                    {filteredWallets.map(w => (
                      <option key={w.id} value={`did:xrpl:${w.classic_address}`}>
                        {w.name || w.classic_address}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>
              <Button
                onClick={handleCalculateTrust}
                disabled={calculateTrustMutation.isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {calculateTrustMutation.isPending ? 'Calculating...' : 'Calculate Trust Score'}
              </Button>
            </div>

            {/* Calculation Result */}
            {calculationResult && (
              <div className="mt-6 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg font-semibold text-gray-900">Trust Analysis Result</div>
                  <Badge className={getTrustColor(calculationResult.trust_score)}>
                    Score: {calculationResult.trust_score}/100
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Overall Trust</span>
                      <span className="text-sm font-medium">{calculationResult.trust_score}%</span>
                    </div>
                    <Progress value={calculationResult.trust_score} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Trust Type</div>
                      <div className="flex items-center gap-2">
                        {getTrustIcon(calculationResult.trust_type)}
                        <span className="capitalize font-medium">{calculationResult.trust_type}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Confidence</div>
                      <div className="font-medium">{calculationResult.confidence}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Path Length</div>
                      <div className="font-medium">{calculationResult.path_length} hop(s)</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Available Paths</div>
                      <div className="font-medium">{calculationResult.available_paths}</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <div className="text-sm font-medium text-gray-700 mb-2">Trust Breakdown:</div>
                    <div className="space-y-2">
                      {Object.entries(calculationResult.breakdown || {}).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="font-medium">{value}/100</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {calculationResult.trust_path && calculationResult.trust_path.length > 0 && (
                    <div className="pt-3 border-t">
                      <div className="text-sm font-medium text-gray-700 mb-2">Trust Path:</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {calculationResult.trust_path.map((did, idx) => (
                          <React.Fragment key={idx}>
                            <code className="text-xs bg-white px-2 py-1 rounded">
                              {did.substring(0, 20)}...
                            </code>
                            {idx < calculationResult.trust_path.length - 1 && (
                              <ArrowRight className="w-3 h-3 text-gray-400" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}

                  {calculationResult.factors && (
                    <div className="pt-3 border-t">
                      <div className="text-sm font-medium text-gray-700 mb-2">Based On:</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white p-2 rounded">
                          {calculationResult.factors.endorsements_count} endorsements
                        </div>
                        <div className="bg-white p-2 rounded">
                          {calculationResult.factors.messages_exchanged} messages
                        </div>
                        <div className="bg-white p-2 rounded">
                          {calculationResult.factors.shared_connections} shared connections
                        </div>
                        <div className="bg-white p-2 rounded">
                          {calculationResult.factors.credentials_issued} credentials
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User's Trust Network */}
        {userDID && (
          <div className="grid grid-cols-3 gap-6">
            {/* Incoming Trust */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Who Trusts Me ({trustNetwork.incoming.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {trustNetwork.incoming.slice(0, 10).map((trust) => (
                    <div key={trust.id} className="p-3 bg-white rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-xs truncate">
                          {trust.trustor_did.substring(0, 20)}...
                        </code>
                        <Badge className={getTrustColor(trust.calculated_trust_score)}>
                          {trust.calculated_trust_score}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        {getTrustIcon(trust.trust_type)}
                        <span className="capitalize">{trust.trust_type}</span>
                        <span>• {trust.confidence_score}% confidence</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Outgoing Trust */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  Who I Trust ({trustNetwork.outgoing.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {trustNetwork.outgoing.slice(0, 10).map((trust) => (
                    <div key={trust.id} className="p-3 bg-white rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-xs truncate">
                          {trust.trustee_did.substring(0, 20)}...
                        </code>
                        <Badge className={getTrustColor(trust.calculated_trust_score)}>
                          {trust.calculated_trust_score}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        {getTrustIcon(trust.trust_type)}
                        <span className="capitalize">{trust.trust_type}</span>
                        <span>• {trust.confidence_score}% confidence</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Mutual Trust */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-600" />
                  Mutual Trust ({trustNetwork.mutual.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {trustNetwork.mutual.slice(0, 10).map((trust) => (
                    <div key={trust.id} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-xs truncate">
                          {trust.trustor_did.substring(0, 20)}...
                        </code>
                        <Badge className="bg-purple-100 text-purple-800">
                          {trust.calculated_trust_score}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-purple-700">
                        <CheckCircle className="w-3 h-3" />
                        <span>Bidirectional trust</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}