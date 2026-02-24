import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Shield,
  Eye,
  Lock,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Users,
  Globe,
  Calendar,
  Filter
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PrivacyBadge from '../components/PrivacyBadge';

export default function DidPrivacyAnalytics() {
  const [timeRange, setTimeRange] = useState('7d');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['analytics-wallets'],
    queryFn: () => base44.entities.Wallet.list('-created_date'),
    enabled: !!user
  });

  const userWallet = wallets.find(w => w.owner_id === user?.id);
  const myDid = userWallet?.classic_address;

  const { data: privacySettings } = useQuery({
    queryKey: ['analytics-privacy-settings', myDid],
    queryFn: async () => {
      const settings = await base44.entities.DidPrivacySetting.filter({
        did_address: myDid
      });
      return settings[0] || null;
    },
    enabled: !!myDid
  });

  // Fetch audit logs related to privacy
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['privacy-audit-logs', myDid],
    queryFn: () => base44.entities.DidAuditLog.filter({
      did_classic_address: myDid
    }),
    enabled: !!myDid
  });

  // Fetch messages to see access patterns
  const { data: receivedMessages = [] } = useQuery({
    queryKey: ['privacy-messages', myDid],
    queryFn: () => base44.entities.DidMessage.filter({
      to_did: `did:xrpl:${myDid}`
    }),
    enabled: !!myDid
  });

  // Fetch who's viewing
  const { data: allWallets = [] } = useQuery({
    queryKey: ['all-wallets-privacy'],
    queryFn: () => base44.entities.Wallet.list()
  });

  // Calculate time filter
  const getTimeFilterDate = () => {
    const now = new Date();
    switch (timeRange) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0);
    }
  };

  const filterDate = getTimeFilterDate();
  const recentLogs = auditLogs.filter(log => 
    new Date(log.created_date) > filterDate
  );

  // Analytics calculations
  const analytics = {
    totalViews: recentLogs.filter(l => l.action_type === 'did_document_viewed').length,
    totalMessages: receivedMessages.filter(m => 
      new Date(m.created_date) > filterDate
    ).length,
    uniqueViewers: [...new Set(recentLogs.map(l => l.user_email))].length,
    failedAccess: 0, // Would need to track this separately
  };

  // Group logs by action type
  const activityByType = recentLogs.reduce((acc, log) => {
    acc[log.action_type] = (acc[log.action_type] || 0) + 1;
    return acc;
  }, {});

  // Recent access attempts
  const recentAccess = recentLogs
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 20);

  // Privacy score calculation
  const calculatePrivacyScore = () => {
    if (!privacySettings) return 50;
    
    let score = 0;
    const weights = {
      profile_visibility: 15,
      message_privacy: 20,
      credential_visibility: 20,
      endorsement_visibility: 10,
      reputation_visibility: 10,
      activity_visibility: 15,
      connection_list_visibility: 10
    };

    const privacyLevels = {
      'public': 0,
      'anyone': 0,
      'connections_only': 50,
      'trusted_only': 75,
      'private': 100,
      'whitelist_only': 100
    };

    Object.entries(weights).forEach(([key, weight]) => {
      const level = privacySettings[key];
      const levelScore = privacyLevels[level] || 0;
      score += (levelScore * weight) / 100;
    });

    if (!privacySettings.allow_indexing) score += 5;
    if (privacySettings.require_verification_for_messages) score += 5;

    return Math.round(score);
  };

  const privacyScore = calculatePrivacyScore();

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score) => {
    if (score >= 80) return 'High Privacy';
    if (score >= 50) return 'Moderate Privacy';
    return 'Low Privacy';
  };

  if (!userWallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Create a DID first to view privacy analytics</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                <BarChart3 className="w-10 h-10 text-indigo-600" />
                Privacy Analytics
              </h1>
              <p className="text-gray-600">Monitor who's accessing your DID information</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-purple-600">Advanced Privacy Tracking</Badge>
                {privacySettings && (
                  <PrivacyBadge level={privacySettings.profile_visibility} />
                )}
              </div>
            </div>
            <Link to={createPageUrl('DidPrivacy')}>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Shield className="w-4 h-4 mr-2" />
                Privacy Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Privacy Score */}
        <Card className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white rounded-full">
                  <Shield className={`w-10 h-10 ${getScoreColor(privacyScore)}`} />
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Privacy Score</div>
                  <div className={`text-4xl font-bold ${getScoreColor(privacyScore)}`}>
                    {privacyScore}/100
                  </div>
                  <Badge className="mt-1">{getScoreBadge(privacyScore)}</Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-2">Privacy Posture</div>
                <div className="space-y-1">
                  {privacyScore >= 80 && (
                    <div className="text-xs text-green-600 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Strong protection
                    </div>
                  )}
                  {privacyScore < 50 && (
                    <div className="text-xs text-amber-600 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Consider increasing privacy
                    </div>
                  )}
                  {!privacySettings?.allow_indexing && (
                    <div className="text-xs text-blue-600 flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Search indexing disabled
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Range Selector */}
        <div className="mb-6 flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Eye className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-gray-900">{analytics.totalViews}</div>
                <div className="text-sm text-gray-600 mt-1">Profile Views</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-gray-900">{analytics.uniqueViewers}</div>
                <div className="text-sm text-gray-600 mt-1">Unique Visitors</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Activity className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-gray-900">{analytics.totalMessages}</div>
                <div className="text-sm text-gray-600 mt-1">Messages Received</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-gray-900">{analytics.failedAccess}</div>
                <div className="text-sm text-gray-600 mt-1">Blocked Attempts</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Activity Breakdown</CardTitle>
            <CardDescription>Types of access to your DID</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(activityByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm capitalize">
                      {type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
              {Object.keys(activityByType).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No activity recorded in this time period
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Access Log */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Access Log</CardTitle>
            <CardDescription>Who's been accessing your information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAccess.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No access logs in this time period
                </p>
              ) : (
                recentAccess.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {log.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <div className="text-sm font-medium capitalize">
                          {log.action_type.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs text-gray-600">
                          {log.user_email || 'Anonymous'} • {log.ip_address || 'Unknown IP'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {new Date(log.created_date).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Privacy Recommendations */}
        {privacyScore < 70 && (
          <Card className="mt-6 bg-amber-50 border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Privacy Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-amber-900">
                {privacySettings?.profile_visibility === 'public' && (
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600">•</span>
                    Consider setting profile visibility to "Connections Only" for better privacy
                  </li>
                )}
                {privacySettings?.message_privacy === 'anyone' && (
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600">•</span>
                    Restrict who can message you to prevent spam
                  </li>
                )}
                {privacySettings?.allow_indexing && (
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600">•</span>
                    Disable search indexing to prevent public discovery
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}