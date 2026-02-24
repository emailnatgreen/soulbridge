import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  TrendingUp,
  Users,
  MessageCircle,
  Shield,
  Activity,
  Award,
  Network,
  Eye,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  PieChart,
  Globe
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart as RechartsPI, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export default function DIDAnalytics() {
  const { data: wallets = [], isLoading: walletsLoading } = useQuery({
    queryKey: ['analytics-wallets'],
    queryFn: () => base44.entities.Wallet.list('-created_date', 1000)
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['analytics-agents'],
    queryFn: () => base44.entities.Agent.list('-created_date', 1000)
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['analytics-messages'],
    queryFn: () => base44.entities.DidMessage.list('-created_date', 1000)
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['analytics-audit'],
    queryFn: () => base44.entities.DidAuditLog.list('-created_date', 1000)
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['analytics-permissions'],
    queryFn: () => base44.entities.DidPermission.list('-created_date', 1000)
  });

  const analytics = useMemo(() => {
    // Basic stats
    const totalDIDs = wallets.length;
    const activeDIDs = wallets.filter(w => !w.notes?.includes('REVOKED')).length;
    const revokedDIDs = totalDIDs - activeDIDs;
    const didsWithAgents = wallets.filter(w => agents.some(a => a.wallet_id === w.id)).length;
    
    // Network distribution
    const testnetDIDs = wallets.filter(w => w.network === 'testnet').length;
    const mainnetDIDs = wallets.filter(w => w.network === 'mainnet').length;
    
    // Message stats
    const totalMessages = messages.length;
    const readMessages = messages.filter(m => m.status === 'read').length;
    const unreadMessages = totalMessages - readMessages;
    
    // Permission stats
    const activePermissions = permissions.filter(p => p.status === 'active').length;
    const revokedPermissions = permissions.length - activePermissions;
    
    // Time-based creation data (last 30 days)
    const now = new Date();
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });
    
    const creationTrend = last30Days.map(date => {
      const didsCreated = wallets.filter(w => 
        w.created_date?.startsWith(date)
      ).length;
      const messagesCreated = messages.filter(m => 
        m.created_date?.startsWith(date)
      ).length;
      return {
        date: date.substring(5), // MM-DD
        DIDs: didsCreated,
        Messages: messagesCreated
      };
    });
    
    // Agent role distribution
    const roleDistribution = agents.reduce((acc, agent) => {
      const role = agent.role || 'unknown';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});
    
    const roleData = Object.entries(roleDistribution).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
    
    // Activity types from audit logs
    const activityTypes = auditLogs.reduce((acc, log) => {
      const type = log.action_type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    const activityData = Object.entries(activityTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count: value
      }));
    
    // Top active DIDs by message count
    const messageCountByDID = messages.reduce((acc, msg) => {
      acc[msg.from_did] = (acc[msg.from_did] || 0) + 1;
      acc[msg.to_did] = (acc[msg.to_did] || 0) + 1;
      return acc;
    }, {});
    
    const topActiveDIDs = Object.entries(messageCountByDID)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([did, count]) => ({
        did: did.substring(0, 25) + '...',
        messages: count
      }));
    
    // Network pie data
    const networkData = [
      { name: 'Testnet', value: testnetDIDs },
      { name: 'Mainnet', value: mainnetDIDs }
    ];
    
    // Status pie data
    const statusData = [
      { name: 'Active', value: activeDIDs },
      { name: 'Revoked', value: revokedDIDs }
    ];
    
    return {
      totalDIDs,
      activeDIDs,
      revokedDIDs,
      didsWithAgents,
      testnetDIDs,
      mainnetDIDs,
      totalMessages,
      readMessages,
      unreadMessages,
      activePermissions,
      revokedPermissions,
      creationTrend,
      roleData,
      activityData,
      topActiveDIDs,
      networkData,
      statusData
    };
  }, [wallets, agents, messages, auditLogs, permissions]);

  if (walletsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
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
                DID Analytics Dashboard
              </h1>
              <p className="text-gray-600">Insights into your decentralized identity ecosystem</p>
              <Badge className="mt-2 bg-purple-600">Real-time Analytics</Badge>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total DIDs</p>
                  <p className="text-3xl font-bold text-indigo-600">{analytics.totalDIDs}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-gray-600">{analytics.activeDIDs} active</span>
                  </div>
                </div>
                <Globe className="w-8 h-8 text-indigo-200" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Messages</p>
                  <p className="text-3xl font-bold text-purple-600">{analytics.totalMessages}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Eye className="w-3 h-3 text-blue-600" />
                    <span className="text-xs text-gray-600">{analytics.readMessages} read</span>
                  </div>
                </div>
                <MessageCircle className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Agents</p>
                  <p className="text-3xl font-bold text-pink-600">{agents.length}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Network className="w-3 h-3 text-pink-600" />
                    <span className="text-xs text-gray-600">{analytics.didsWithAgents} linked</span>
                  </div>
                </div>
                <Users className="w-8 h-8 text-pink-200" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Permissions</p>
                  <p className="text-3xl font-bold text-green-600">{permissions.length}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Shield className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-gray-600">{analytics.activePermissions} active</span>
                  </div>
                </div>
                <Shield className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Creation Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Growth Trend (Last 30 Days)
              </CardTitle>
              <CardDescription>DIDs and messages created over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.creationTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="DIDs" stroke="#6366f1" strokeWidth={2} />
                  <Line type="monotone" dataKey="Messages" stroke="#8b5cf6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Activity Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                Top Activities
              </CardTitle>
              <CardDescription>Most common actions in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.activityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Network Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5 text-blue-600" />
                Network Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPI>
                  <Pie
                    data={analytics.networkData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.networkData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPI>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* DID Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                DID Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPI>
                  <Pie
                    data={analytics.statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPI>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Agent Roles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                Agent Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPI>
                  <Pie
                    data={analytics.roleData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.roleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPI>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Active DIDs */}
        {analytics.topActiveDIDs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Most Active DIDs
              </CardTitle>
              <CardDescription>DIDs with the most message activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topActiveDIDs.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold">
                        {index + 1}
                      </div>
                      <code className="text-sm text-gray-700">{item.did}</code>
                    </div>
                    <Badge variant="outline">
                      <MessageCircle className="w-3 h-3 mr-1" />
                      {item.messages} messages
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Health */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {((analytics.activeDIDs / analytics.totalDIDs) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Active DIDs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {((analytics.readMessages / (analytics.totalMessages || 1)) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Message Read Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {((analytics.didsWithAgents / (analytics.totalDIDs || 1)) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Agent Adoption</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {analytics.totalMessages + auditLogs.length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total Actions</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}