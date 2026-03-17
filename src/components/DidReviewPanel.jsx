import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { Fingerprint, CheckCircle, AlertTriangle, Send, Sparkles } from 'lucide-react';

export default function DidReviewPanel({ wallets, agents, activeWallets, revokedWallets }) {
  const getAgentForWallet = (walletId) => {
    return agents.find(agent => agent.wallet_id === walletId);
  };

  const generateDIDSummary = () => {
    const summary = {
      total: wallets.length,
      active: activeWallets.length,
      revoked: revokedWallets.length,
      linked_agents: activeWallets.filter(w => getAgentForWallet(w.id)).length,
      unlinked: activeWallets.filter(w => !getAgentForWallet(w.id)).length,
      dids: activeWallets.map(wallet => {
        const agent = getAgentForWallet(wallet.id);
        return {
          did: `did:xrpl:${wallet.classic_address}`,
          address: wallet.classic_address,
          agent: agent ? `${agent.name} (${agent.role})` : 'Unlinked',
          network: wallet.network,
          created: wallet.created_date
        };
      })
    };
    return summary;
  };

  const handleSendToAxi = async () => {
    const summary = generateDIDSummary();
    const message = `Please review my DID status:\n\n${JSON.stringify(summary, null, 2)}`;
    
    // Store in sessionStorage for Axi page to access
    sessionStorage.setItem('axiDIDReview', JSON.stringify({
      summary,
      message
    }));

    // Navigate to Axi
    window.location.href = '/Axi';
  };

  const summary = generateDIDSummary();

  return (
    <Card className="border-purple-200 bg-purple-50/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-purple-600" />
              DID Review Summary
            </CardTitle>
            <CardDescription>Current status of all your DIDs</CardDescription>
          </div>
          <Link to="/Axi">
            <Button 
              onClick={handleSendToAxi}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
            >
              <Send className="w-4 h-4" />
              Send to Axi
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">{summary.total}</div>
                <div className="text-xs text-gray-600">Total DIDs</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="text-2xl font-bold text-green-600">{summary.active}</div>
                <div className="text-xs text-gray-600">Active</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-red-200">
                <div className="text-2xl font-bold text-red-600">{summary.revoked}</div>
                <div className="text-xs text-gray-600">Revoked</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{summary.linked_agents}</div>
                <div className="text-xs text-gray-600">Linked Agents</div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200 space-y-2">
              <p className="text-sm font-medium text-gray-700">Quick Stats</p>
              <div className="text-xs space-y-1 text-gray-600">
                <div>• {summary.unlinked} DIDs need agent linking</div>
                <div>• {summary.active} active on XRPL</div>
                <div>• {summary.revoked} revoked</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="details" className="mt-6">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {summary.dids.map((did, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <code className="text-xs font-mono text-gray-700 truncate flex-1">
                      {did.did}
                    </code>
                    <Badge variant="outline" className="text-xs ml-2">{did.network}</Badge>
                  </div>
                  <div className="text-xs text-gray-600">
                    <span className="font-medium">Agent:</span> {did.agent}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}