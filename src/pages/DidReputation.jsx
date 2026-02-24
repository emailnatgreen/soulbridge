import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Award,
  TrendingUp,
  Shield,
  Activity,
  MessageCircle,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  Star,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export default function DidReputation() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['my-wallets'],
    queryFn: () => base44.entities.Wallet.filter({ owner_id: user?.id }),
    enabled: !!user?.id
  });

  const { data: reputations = [] } = useQuery({
    queryKey: ['my-reputations', wallets],
    queryFn: async () => {
      if (wallets.length === 0) return [];
      const addresses = wallets.map(w => w.classic_address);
      const allReps = await base44.entities.ReputationScore.list('-overall_score', 100);
      return allReps.filter(r => addresses.includes(r.did_classic_address));
    },
    enabled: wallets.length > 0
  });

  const calculateMutation = useMutation({
    mutationFn: (wallet_id) => base44.functions.invoke('calculateDidReputation', { wallet_id }),
    onSuccess: () => {
      toast.success('Reputation recalculated');
      queryClient.invalidateQueries(['my-reputations']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to calculate reputation');
    }
  });

  const getTrustLevelColor = (level) => {
    const colors = {
      unverified: 'bg-gray-400',
      new: 'bg-blue-500',
      established: 'bg-green-500',
      trusted: 'bg-purple-600',
      verified: 'bg-amber-500'
    };
    return colors[level] || 'bg-gray-400';
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Please log in to view reputation</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Create a DID to build your reputation</p>
            <Link to={createPageUrl('CreateDID')}>
              <Button>Create DID</Button>
            </Link>
          </CardContent>
        </Card>
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
                <Award className="w-10 h-10 text-indigo-600" />
                DID Reputation
              </h1>
              <p className="text-gray-600">Your decentralized identity trust score</p>
              <Badge className="mt-2 bg-purple-600">Trust & Credibility System</Badge>
            </div>
          </div>
        </div>

        {/* Reputation Cards */}
        <div className="space-y-6">
          {wallets.map((wallet) => {
            const reputation = reputations.find(r => r.did_classic_address === wallet.classic_address);
            const did = `did:xrpl:${wallet.classic_address}`;

            return (
              <Card key={wallet.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Shield className="w-5 h-5 text-indigo-600" />
                        {wallet.name || 'DID Reputation'}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <code className="text-xs">{did}</code>
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => calculateMutation.mutate(wallet.id)}
                      disabled={calculateMutation.isPending}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${calculateMutation.isPending ? 'animate-spin' : ''}`} />
                      Recalculate
                    </Button>
                  </div>
                </CardHeader>

                {reputation ? (
                  <CardContent className="pt-6 space-y-6">
                    {/* Overall Score */}
                    <div className="text-center">
                      <div className={`text-6xl font-bold ${getScoreColor(reputation.overall_score)}`}>
                        {reputation.overall_score}
                      </div>
                      <div className="text-sm text-gray-600 mt-2">Overall Reputation Score</div>
                      <Badge className={`mt-2 ${getTrustLevelColor(reputation.trust_level)}`}>
                        {reputation.trust_level.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Component Scores */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Activity</span>
                          <span className={`text-sm font-bold ${getScoreColor(reputation.activity_score)}`}>
                            {reputation.activity_score}
                          </span>
                        </div>
                        <Progress value={reputation.activity_score} className="h-2" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Reliability</span>
                          <span className={`text-sm font-bold ${getScoreColor(reputation.reliability_score)}`}>
                            {reputation.reliability_score}
                          </span>
                        </div>
                        <Progress value={reputation.reliability_score} className="h-2" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Engagement</span>
                          <span className={`text-sm font-bold ${getScoreColor(reputation.engagement_score)}`}>
                            {reputation.engagement_score}
                          </span>
                        </div>
                        <Progress value={reputation.engagement_score} className="h-2" />
                      </div>
                    </div>

                    {/* Badges */}
                    {reputation.badges && reputation.badges.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <Star className="w-4 h-4" />
                          Earned Badges
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {reputation.badges.map((badge, idx) => (
                            <Badge key={idx} variant="outline" className="text-sm">
                              <span className="mr-1">{badge.icon}</span>
                              {badge.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <MessageCircle className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                        <div className="text-2xl font-bold text-gray-900">
                          {reputation.metrics?.total_messages_sent || 0}
                        </div>
                        <div className="text-xs text-gray-600">Messages Sent</div>
                      </div>
                      <div className="text-center">
                        <Activity className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                        <div className="text-2xl font-bold text-gray-900">
                          {reputation.metrics?.message_read_rate?.toFixed(0) || 0}%
                        </div>
                        <div className="text-xs text-gray-600">Read Rate</div>
                      </div>
                      <div className="text-center">
                        <Clock className="w-6 h-6 text-green-600 mx-auto mb-1" />
                        <div className="text-2xl font-bold text-gray-900">
                          {reputation.metrics?.avg_response_time_hours?.toFixed(1) || 0}h
                        </div>
                        <div className="text-xs text-gray-600">Avg Response</div>
                      </div>
                      <div className="text-center">
                        <Users className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                        <div className="text-2xl font-bold text-gray-900">
                          {reputation.metrics?.active_days || 0}
                        </div>
                        <div className="text-xs text-gray-600">Active Days</div>
                      </div>
                    </div>

                    {/* Strengths & Warnings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                      {reputation.strengths && reputation.strengths.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            Strengths
                          </div>
                          <ul className="space-y-1">
                            {reputation.strengths.map((strength, idx) => (
                              <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                <span className="text-green-600">✓</span>
                                {strength}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {reputation.warnings && reputation.warnings.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            Concerns
                          </div>
                          <ul className="space-y-1">
                            {reputation.warnings.map((warning, idx) => (
                              <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                <span className="text-yellow-600">⚠</span>
                                {warning}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Last Updated */}
                    <div className="text-xs text-gray-500 text-center pt-4 border-t">
                      Last calculated: {new Date(reputation.last_calculated).toLocaleString()}
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="py-12 text-center">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4">No reputation data yet</p>
                    <Button
                      onClick={() => calculateMutation.mutate(wallet.id)}
                      disabled={calculateMutation.isPending}
                    >
                      Calculate Reputation
                    </Button>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Info Card */}
        <Card className="mt-6 bg-indigo-50 border-indigo-200">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-indigo-900">
                <p className="font-medium mb-2">How Reputation Works</p>
                <ul className="space-y-1 text-indigo-800">
                  <li>• <strong>Activity:</strong> Based on messages sent, received, and audit log entries</li>
                  <li>• <strong>Reliability:</strong> Measured by response rate, read rate, and revocation history</li>
                  <li>• <strong>Engagement:</strong> Influenced by permissions granted, endorsements, and active days</li>
                  <li>• <strong>Trust Levels:</strong> Progress from New → Established → Trusted → Verified</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}