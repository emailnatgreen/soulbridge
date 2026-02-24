import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Search, 
  Fingerprint, 
  User, 
  Network, 
  ArrowRight,
  Filter,
  Globe,
  Shield,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function DIDRegistry() {
  const [searchTerm, setSearchTerm] = useState('');
  const [networkFilter, setNetworkFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const { data: wallets = [], isLoading } = useQuery({
    queryKey: ['public-wallets'],
    queryFn: () => base44.entities.Wallet.list('-created_date', 100)
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['public-agents'],
    queryFn: () => base44.entities.Agent.list('-created_date', 100)
  });

  const activeWallets = wallets.filter(w => !w.notes?.includes('REVOKED'));

  const filteredWallets = activeWallets.filter(wallet => {
    const agent = agents.find(a => a.wallet_id === wallet.id);
    const matchesSearch = !searchTerm || 
      wallet.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wallet.classic_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesNetwork = networkFilter === 'all' || wallet.network === networkFilter;
    const matchesRole = roleFilter === 'all' || agent?.role === roleFilter;

    return matchesSearch && matchesNetwork && matchesRole;
  });

  const stats = {
    total: activeWallets.length,
    testnet: activeWallets.filter(w => w.network === 'testnet').length,
    mainnet: activeWallets.filter(w => w.network === 'mainnet').length,
    withAgents: activeWallets.filter(w => agents.some(a => a.wallet_id === w.id)).length
  };

  const uniqueRoles = [...new Set(agents.map(a => a.role))].sort();

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading DID Registry...</p>
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
                <Globe className="w-10 h-10 text-indigo-600" />
                Public DID Registry
              </h1>
              <p className="text-gray-600">Browse decentralized identities on XRPL</p>
              <Badge className="mt-2 bg-purple-600">World's First XRPL DID Registry</Badge>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">{stats.total}</div>
                <div className="text-sm text-gray-600 mt-1">Total DIDs</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{stats.testnet}</div>
                <div className="text-sm text-gray-600 mt-1">Testnet</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{stats.mainnet}</div>
                <div className="text-sm text-gray-600 mt-1">Mainnet</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{stats.withAgents}</div>
                <div className="text-sm text-gray-600 mt-1">With Agents</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by name or address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Select value={networkFilter} onValueChange={setNetworkFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Network" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Networks</SelectItem>
                    <SelectItem value="testnet">Testnet</SelectItem>
                    <SelectItem value="mainnet">Mainnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Agent Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {uniqueRoles.map(role => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {filteredWallets.length === 0 ? (
          <Card className="bg-gray-50">
            <CardContent className="py-12 text-center">
              <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No DIDs found matching your filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredWallets.map((wallet) => {
              const agent = agents.find(a => a.wallet_id === wallet.id);
              const didAddress = `did:xrpl:${wallet.classic_address}`;
              
              return (
                <Card key={wallet.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Fingerprint className="w-4 h-4 text-indigo-600" />
                          {wallet.name || 'Unnamed Identity'}
                        </CardTitle>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {wallet.network}
                      </Badge>
                    </div>
                    {agent && (
                      <div className="flex items-center gap-2 mt-2">
                        <User className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-900">{agent.name}</span>
                        <Badge className="text-xs">{agent.role}</Badge>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* DID Address */}
                    <div>
                      <div className="text-xs text-gray-600 mb-1">DID Address</div>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-gray-50 px-2 py-1 rounded flex-1 overflow-hidden text-ellipsis">
                          {didAddress}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(didAddress, 'DID')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Agent Purpose */}
                    {agent?.purpose && (
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Purpose</div>
                        <p className="text-xs text-gray-700 line-clamp-2">{agent.purpose}</p>
                      </div>
                    )}

                    {/* Created Date */}
                    <div className="text-xs text-gray-500 pt-2 border-t">
                      Created: {new Date(wallet.created_date).toLocaleDateString()}
                    </div>

                    {/* View Details Button */}
                    {agent && (
                      <Link to={createPageUrl('AgentDetails') + `?id=${agent.id}`}>
                        <Button size="sm" variant="outline" className="w-full">
                          View Profile
                          <ArrowRight className="w-3 h-3 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info Footer */}
        <Card className="mt-8 bg-indigo-50 border-indigo-200">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-indigo-900">
                <p className="font-medium mb-1">About This Registry</p>
                <p>
                  This is a public registry of Decentralized Identifiers (DIDs) created on the XRP Ledger. 
                  Each DID represents a unique identity that can be verified on-chain and associated with agent profiles.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}