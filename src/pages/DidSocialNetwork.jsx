import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Network,
  Search,
  Users,
  MessageCircle,
  Shield,
  Star,
  TrendingUp,
  Activity,
  Eye,
  Filter
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function DidSocialNetwork() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDID, setSelectedDID] = useState(null);
  const [filterType, setFilterType] = useState('all');

  const { data: wallets = [] } = useQuery({
    queryKey: ['network-wallets'],
    queryFn: () => base44.entities.Wallet.list('-created_date', 500)
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['network-messages'],
    queryFn: () => base44.entities.DidMessage.list('-created_date', 1000)
  });

  const { data: endorsements = [] } = useQuery({
    queryKey: ['network-endorsements'],
    queryFn: () => base44.entities.DidEndorsement.list('-created_date', 500)
  });

  const { data: reputations = [] } = useQuery({
    queryKey: ['network-reputations'],
    queryFn: () => base44.entities.ReputationScore.list('-overall_score', 500)
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['network-agents'],
    queryFn: () => base44.entities.Agent.list('-created_date', 500)
  });

  const networkData = useMemo(() => {
    const activeWallets = wallets.filter(w => !w.notes?.includes('REVOKED'));
    
    // Build connection map
    const connections = new Map();
    
    // Add message connections
    messages.forEach(msg => {
      const key = `${msg.from_did}-${msg.to_did}`;
      if (!connections.has(key)) {
        connections.set(key, {
          from: msg.from_did,
          to: msg.to_did,
          type: 'message',
          strength: 0
        });
      }
      connections.get(key).strength += 1;
    });

    // Add endorsement connections
    endorsements.forEach(end => {
      const key = `${end.endorser_did}-${end.endorsed_did}`;
      if (!connections.has(key)) {
        connections.set(key, {
          from: end.endorser_did,
          to: end.endorsed_did,
          type: 'endorsement',
          strength: 0
        });
      }
      connections.get(key).strength += end.rating * 2; // Weight endorsements higher
    });

    // Calculate node metrics
    const nodeMetrics = new Map();
    
    activeWallets.forEach(wallet => {
      const did = `did:xrpl:${wallet.classic_address}`;
      const reputation = reputations.find(r => r.did_classic_address === wallet.classic_address);
      const agent = agents.find(a => a.wallet_id === wallet.id);
      
      const outgoingMessages = messages.filter(m => m.from_did === did).length;
      const incomingMessages = messages.filter(m => m.to_did === did).length;
      const endorsementsGiven = endorsements.filter(e => e.endorser_did === did).length;
      const endorsementsReceived = endorsements.filter(e => e.endorsed_did === did).length;
      
      const connectionCount = [...connections.values()].filter(
        c => c.from === did || c.to === did
      ).length;

      nodeMetrics.set(did, {
        wallet,
        did,
        name: wallet.name || agent?.name || 'Unknown',
        reputation: reputation?.overall_score || 0,
        trustLevel: reputation?.trust_level || 'unverified',
        outgoingMessages,
        incomingMessages,
        totalMessages: outgoingMessages + incomingMessages,
        endorsementsGiven,
        endorsementsReceived,
        connectionCount,
        agent
      });
    });

    // Find top connected DIDs
    const topDIDs = Array.from(nodeMetrics.values())
      .sort((a, b) => b.connectionCount - a.connectionCount)
      .slice(0, 20);

    // Find most endorsed DIDs
    const mostEndorsed = Array.from(nodeMetrics.values())
      .sort((a, b) => b.endorsementsReceived - a.endorsementsReceived)
      .slice(0, 10);

    // Find most active communicators
    const mostActive = Array.from(nodeMetrics.values())
      .sort((a, b) => b.totalMessages - a.totalMessages)
      .slice(0, 10);

    return {
      nodes: nodeMetrics,
      connections: Array.from(connections.values()),
      topDIDs,
      mostEndorsed,
      mostActive,
      totalConnections: connections.size
    };
  }, [wallets, messages, endorsements, reputations, agents]);

  const filteredNodes = useMemo(() => {
    let nodes = Array.from(networkData.nodes.values());

    if (searchTerm) {
      nodes = nodes.filter(node =>
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.did.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType === 'high-reputation') {
      nodes = nodes.filter(n => n.reputation >= 70);
    } else if (filterType === 'active') {
      nodes = nodes.filter(n => n.totalMessages > 5);
    } else if (filterType === 'endorsed') {
      nodes = nodes.filter(n => n.endorsementsReceived > 0);
    }

    return nodes;
  }, [networkData.nodes, searchTerm, filterType]);

  const getSelectedConnections = (did) => {
    return networkData.connections.filter(c => c.from === did || c.to === did);
  };

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
                <Network className="w-10 h-10 text-indigo-600" />
                DID Social Network
              </h1>
              <p className="text-gray-600">Explore connections and relationships between DIDs</p>
              <Badge className="mt-2 bg-purple-600">Network Graph & Analytics</Badge>
            </div>
          </div>
        </div>

        {/* Network Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">
                  {networkData.nodes.size}
                </div>
                <div className="text-sm text-gray-600 mt-1">Active DIDs</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {networkData.totalConnections}
                </div>
                <div className="text-sm text-gray-600 mt-1">Connections</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-600">
                  {messages.length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total Messages</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-600">
                  {endorsements.length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Endorsements</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search DIDs or names..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All DIDs</SelectItem>
                  <SelectItem value="high-reputation">High Reputation (70+)</SelectItem>
                  <SelectItem value="active">Active (5+ messages)</SelectItem>
                  <SelectItem value="endorsed">With Endorsements</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* DID List */}
          <div className="col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Network Nodes ({filteredNodes.length})
                </CardTitle>
                <CardDescription>Click a DID to view connections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredNodes.map((node) => (
                    <div
                      key={node.did}
                      onClick={() => setSelectedDID(node)}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${
                        selectedDID?.did === node.did
                          ? 'bg-indigo-50 border-indigo-300'
                          : 'bg-white hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {node.name}
                            {node.reputation >= 70 && (
                              <Star className="w-4 h-4 text-amber-500" />
                            )}
                          </div>
                          <code className="text-xs text-gray-600">
                            {node.did.substring(0, 35)}...
                          </code>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {node.connectionCount} connections
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {node.totalMessages} messages
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {node.endorsementsReceived} endorsements
                        </div>
                        <div className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Rep: {node.reputation}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details Panel */}
          <div className="col-span-1">
            {selectedDID ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Connection Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      {selectedDID.name}
                    </div>
                    <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                      {selectedDID.did}
                    </code>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">
                        {selectedDID.connectionCount}
                      </div>
                      <div className="text-xs text-gray-600">Connections</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedDID.reputation}
                      </div>
                      <div className="text-xs text-gray-600">Reputation</div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Messages Sent</span>
                      <span className="font-medium">{selectedDID.outgoingMessages}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Messages Received</span>
                      <span className="font-medium">{selectedDID.incomingMessages}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Endorsements Given</span>
                      <span className="font-medium">{selectedDID.endorsementsGiven}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Endorsements Received</span>
                      <span className="font-medium">{selectedDID.endorsementsReceived}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Connected To
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {getSelectedConnections(selectedDID.did).map((conn, idx) => {
                        const otherDID = conn.from === selectedDID.did ? conn.to : conn.from;
                        const otherNode = networkData.nodes.get(otherDID);
                        return (
                          <div key={idx} className="text-xs bg-gray-50 p-2 rounded flex items-center justify-between">
                            <span className="truncate flex-1">
                              {otherNode?.name || otherDID.substring(0, 20)}...
                            </span>
                            <Badge variant="outline" className="text-xs ml-2">
                              {conn.type}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {selectedDID.agent && (
                    <Link to={createPageUrl('AgentDetails') + `?id=${selectedDID.agent.id}`}>
                      <Button size="sm" className="w-full">
                        View Agent Profile
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Eye className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">
                    Select a DID to view connections
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Top Lists */}
        <div className="grid grid-cols-3 gap-6 mt-6">
          {/* Most Connected */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Most Connected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {networkData.topDIDs.slice(0, 5).map((node, idx) => (
                  <div key={node.did} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <span className="truncate">{node.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {node.connectionCount}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Most Endorsed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-600" />
                Most Endorsed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {networkData.mostEndorsed.slice(0, 5).map((node, idx) => (
                  <div key={node.did} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <span className="truncate">{node.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {node.endorsementsReceived}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Most Active */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600" />
                Most Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {networkData.mostActive.slice(0, 5).map((node, idx) => (
                  <div key={node.did} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <span className="truncate">{node.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {node.totalMessages}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}