import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Activity,
  MessageCircle,
  UserPlus,
  Award,
  Shield,
  Trash2,
  CheckCircle,
  Lock,
  Unlock,
  Clock,
  TrendingUp,
  Filter,
  RefreshCw
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

export default function DidActivityFeed() {
  const [activityFilter, setActivityFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('24h');

  const { data: auditLogs = [], refetch: refetchAudit } = useQuery({
    queryKey: ['activity-audit'],
    queryFn: () => base44.entities.DidAuditLog.list('-created_date', 200),
    refetchInterval: 15000 // Refresh every 15 seconds
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['activity-messages'],
    queryFn: () => base44.entities.DidMessage.list('-created_date', 100),
    refetchInterval: 15000
  });

  const { data: endorsements = [] } = useQuery({
    queryKey: ['activity-endorsements'],
    queryFn: () => base44.entities.DidEndorsement.list('-created_date', 100),
    refetchInterval: 15000
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['activity-wallets'],
    queryFn: () => base44.entities.Wallet.list('-created_date', 100)
  });

  const { data: reputations = [] } = useQuery({
    queryKey: ['activity-reputations'],
    queryFn: () => base44.entities.ReputationScore.list('-last_calculated', 100)
  });

  const activities = useMemo(() => {
    const items = [];

    // Add audit log activities
    auditLogs.forEach(log => {
      items.push({
        id: `audit-${log.id}`,
        type: log.action_type,
        timestamp: log.created_date,
        did: log.did_classic_address,
        user: log.user_email,
        details: log.action_details,
        success: log.success,
        source: 'audit'
      });
    });

    // Add message activities
    messages.forEach(msg => {
      items.push({
        id: `message-${msg.id}`,
        type: 'message_sent',
        timestamp: msg.created_date,
        from: msg.from_did,
        to: msg.to_did,
        subject: msg.subject,
        source: 'message'
      });
    });

    // Add endorsement activities
    endorsements.forEach(end => {
      items.push({
        id: `endorsement-${end.id}`,
        type: 'endorsement_given',
        timestamp: end.created_date,
        from: end.endorser_did,
        to: end.endorsed_did,
        rating: end.rating,
        endorsementType: end.endorsement_type,
        source: 'endorsement'
      });
    });

    // Add wallet creation activities
    wallets.forEach(wallet => {
      if (!wallet.notes?.includes('REVOKED')) {
        items.push({
          id: `wallet-${wallet.id}`,
          type: 'did_created',
          timestamp: wallet.created_date,
          did: wallet.classic_address,
          name: wallet.name,
          network: wallet.network,
          source: 'wallet'
        });
      }
    });

    // Add reputation updates
    reputations.forEach(rep => {
      items.push({
        id: `reputation-${rep.id}`,
        type: 'reputation_updated',
        timestamp: rep.last_calculated,
        did: rep.did_classic_address,
        score: rep.overall_score,
        trustLevel: rep.trust_level,
        source: 'reputation'
      });
    });

    // Sort by timestamp
    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return items;
  }, [auditLogs, messages, endorsements, wallets, reputations]);

  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Filter by time
    const now = new Date();
    const timeFilters = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      'all': Infinity
    };

    const timeLimit = timeFilters[timeFilter];
    filtered = filtered.filter(activity => {
      const activityTime = new Date(activity.timestamp);
      return (now - activityTime) <= timeLimit;
    });

    // Filter by activity type
    if (activityFilter !== 'all') {
      filtered = filtered.filter(activity => {
        if (activityFilter === 'messages') return activity.source === 'message';
        if (activityFilter === 'endorsements') return activity.source === 'endorsement';
        if (activityFilter === 'dids') return activity.type === 'did_created';
        if (activityFilter === 'reputation') return activity.source === 'reputation';
        if (activityFilter === 'security') return ['did_revoked', 'permission_granted', 'permission_revoked'].includes(activity.type);
        return true;
      });
    }

    return filtered;
  }, [activities, activityFilter, timeFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const last24h = activities.filter(a => (now - new Date(a.timestamp)) <= 24 * 60 * 60 * 1000);
    
    return {
      total: activities.length,
      last24h: last24h.length,
      messages: activities.filter(a => a.source === 'message').length,
      endorsements: activities.filter(a => a.source === 'endorsement').length,
      didsCreated: activities.filter(a => a.type === 'did_created').length
    };
  }, [activities]);

  const getActivityIcon = (type) => {
    const icons = {
      did_created: <UserPlus className="w-4 h-4" />,
      did_revoked: <Trash2 className="w-4 h-4" />,
      message_sent: <MessageCircle className="w-4 h-4" />,
      endorsement_given: <Award className="w-4 h-4" />,
      permission_granted: <Lock className="w-4 h-4" />,
      permission_revoked: <Unlock className="w-4 h-4" />,
      reputation_updated: <TrendingUp className="w-4 h-4" />,
      did_verified: <CheckCircle className="w-4 h-4" />
    };
    return icons[type] || <Activity className="w-4 h-4" />;
  };

  const getActivityColor = (type) => {
    const colors = {
      did_created: 'text-green-600 bg-green-50',
      did_revoked: 'text-red-600 bg-red-50',
      message_sent: 'text-blue-600 bg-blue-50',
      endorsement_given: 'text-purple-600 bg-purple-50',
      permission_granted: 'text-amber-600 bg-amber-50',
      permission_revoked: 'text-orange-600 bg-orange-50',
      reputation_updated: 'text-indigo-600 bg-indigo-50',
      did_verified: 'text-green-600 bg-green-50'
    };
    return colors[type] || 'text-gray-600 bg-gray-50';
  };

  const formatActivityDescription = (activity) => {
    switch (activity.type) {
      case 'did_created':
        return `New DID created: ${activity.name || 'Unnamed'} on ${activity.network}`;
      case 'did_revoked':
        return `DID revoked: ${activity.did}`;
      case 'message_sent':
        return `Message sent: "${activity.subject}" from ${activity.from?.substring(0, 20)}... to ${activity.to?.substring(0, 20)}...`;
      case 'endorsement_given':
        return `Endorsement (${activity.rating}⭐) given for ${activity.endorsementType} from ${activity.from?.substring(0, 20)}... to ${activity.to?.substring(0, 20)}...`;
      case 'permission_granted':
        return `Permission granted to ${activity.details?.agent_id || 'agent'}`;
      case 'permission_revoked':
        return `Permission revoked from ${activity.details?.agent_id || 'agent'}`;
      case 'reputation_updated':
        return `Reputation updated to ${activity.score} (${activity.trustLevel})`;
      case 'did_verified':
        return `DID verified on XRPL: ${activity.did}`;
      default:
        return `Activity: ${activity.type.replace(/_/g, ' ')}`;
    }
  };

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
                <Activity className="w-10 h-10 text-indigo-600" />
                DID Activity Feed
              </h1>
              <p className="text-gray-600">Real-time activities across the DID ecosystem</p>
              <Badge className="mt-2 bg-purple-600">Live Updates Every 15s</Badge>
            </div>
            <Button
              variant="outline"
              onClick={() => refetchAudit()}
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
                <div className="text-3xl font-bold text-indigo-600">{stats.total}</div>
                <div className="text-sm text-gray-600 mt-1">Total Activities</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{stats.last24h}</div>
                <div className="text-sm text-gray-600 mt-1">Last 24h</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{stats.messages}</div>
                <div className="text-sm text-gray-600 mt-1">Messages</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{stats.endorsements}</div>
                <div className="text-sm text-gray-600 mt-1">Endorsements</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-600">{stats.didsCreated}</div>
                <div className="text-sm text-gray-600 mt-1">DIDs Created</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Activity Type</label>
                <Select value={activityFilter} onValueChange={setActivityFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    <SelectItem value="messages">Messages</SelectItem>
                    <SelectItem value="endorsements">Endorsements</SelectItem>
                    <SelectItem value="dids">DID Creation</SelectItem>
                    <SelectItem value="reputation">Reputation Updates</SelectItem>
                    <SelectItem value="security">Security Events</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Time Range</label>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">Last Hour</SelectItem>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activity Stream ({filteredActivities.length})
            </CardTitle>
            <CardDescription>Real-time feed of all DID ecosystem activities</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredActivities.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No activities found for the selected filters</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-900 mb-1">
                        {formatActivityDescription(activity)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(activity.timestamp).toLocaleString()}
                        </div>
                        {activity.user && (
                          <div>by {activity.user}</div>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.source}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}