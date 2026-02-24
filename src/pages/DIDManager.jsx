import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Copy, CheckCircle, ExternalLink, User, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';

export default function DIDManager() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: wallets = [], isLoading: walletsLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => base44.entities.Wallet.filter({ owner_id: user?.id }),
    enabled: !!user?.id
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getAgentForWallet = (walletId) => {
    return agents.find(agent => agent.wallet_id === walletId);
  };

  if (walletsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading DIDs...</p>
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
              <h1 className="text-4xl font-bold text-gray-900 mb-2">DID Manager</h1>
              <p className="text-gray-600">Decentralized Identifiers on XRPL</p>
              <Badge className="mt-2 bg-purple-600">World's First XRPL DID Manager</Badge>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-indigo-600">{wallets.length}</div>
              <div className="text-sm text-gray-600">Total DIDs</div>
            </div>
          </div>
        </div>

        {/* DIDs Grid */}
        {wallets.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Fingerprint className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No DIDs Yet</h3>
              <p className="text-gray-600 mb-4">Create a wallet to generate your first DID on XRPL</p>
              <Link to={createPageUrl('Wallets')}>
                <Button>Create Wallet</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {wallets.map((wallet) => {
              const agent = getAgentForWallet(wallet.id);
              const didAddress = `did:xrpl:${wallet.classic_address}`;
              
              return (
                <Card key={wallet.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Fingerprint className="w-5 h-5 text-indigo-600" />
                          {wallet.name || 'Unnamed Wallet'}
                        </CardTitle>
                        <Badge variant="outline" className="mt-2">
                          {wallet.network}
                        </Badge>
                      </div>
                      <Badge className="bg-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* DID Address */}
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">DID Address</div>
                      <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
                        <code className="text-xs flex-1 overflow-hidden text-ellipsis">
                          {didAddress}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(didAddress, 'DID Address')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Classic Address */}
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">XRPL Address</div>
                      <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-md">
                        <code className="text-xs flex-1 overflow-hidden text-ellipsis">
                          {wallet.classic_address}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(wallet.classic_address, 'Address')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Agent Profile */}
                    {agent ? (
                      <div className="border-t pt-4">
                        <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Associated Agent
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-md">
                          <div className="font-medium text-indigo-900">{agent.name}</div>
                          <div className="text-sm text-indigo-700 mt-1">{agent.role}</div>
                          <div className="text-xs text-indigo-600 mt-2 line-clamp-2">
                            {agent.purpose}
                          </div>
                          <Link to={createPageUrl('AgentDetails') + `?id=${agent.id}`}>
                            <Button size="sm" variant="outline" className="mt-3 w-full">
                              View Agent <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t pt-4">
                        <div className="text-sm text-gray-500 text-center py-2">
                          No agent linked to this DID
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="text-xs text-gray-500 border-t pt-2">
                      Created: {new Date(wallet.created_date).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}