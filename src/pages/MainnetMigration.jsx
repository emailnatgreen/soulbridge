import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertTriangle, CheckCircle, Loader2, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function MainnetMigration() {
  const [selectedAgents, setSelectedAgents] = useState([]);
  const queryClient = useQueryClient();

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const migrateMutation = useMutation({
    mutationFn: (agent_ids) => base44.functions.invoke('migrateToMainnet', { agent_ids }),
    onSuccess: () => {
      queryClient.invalidateQueries(['agents']);
      queryClient.invalidateQueries(['wallets']);
    }
  });

  const testnetAgents = agents.filter(agent => {
    return agent.classic_address && agent.classic_address.startsWith('r');
  });

  const handleMigrate = () => {
    if (selectedAgents.length === 0) return;
    if (!window.confirm(`⚠️ This will create new mainnet wallets for ${selectedAgents.length} agents and fund them with 2 XRP each from treasury. Continue?`)) {
      return;
    }
    migrateMutation.mutate(selectedAgents);
  };

  const toggleAgent = (agentId) => {
    setSelectedAgents(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const selectAll = () => {
    setSelectedAgents(testnetAgents.map(a => a.id));
  };

  const deselectAll = () => {
    setSelectedAgents([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-light text-white">Mainnet Migration</h1>
                <p className="text-sm text-purple-300/60">Migrate agents to XRPL mainnet for RLUSD</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-200">
            <strong>Important:</strong> This migration will create new mainnet wallets for selected agents and fund them with 2 XRP each from your treasury. 
            The RLUSD issuer only exists on mainnet, so this step is required for real RLUSD integration.
          </AlertDescription>
        </Alert>

        <Card className="bg-white/5 backdrop-blur-xl border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Select Agents to Migrate</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAll} className="border-white/10 text-white">
                  Select All
                </Button>
                <Button size="sm" variant="outline" onClick={deselectAll} className="border-white/10 text-white">
                  Deselect All
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testnetAgents.map(agent => (
                <div
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedAgents.includes(agent.id)
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">{agent.name}</h3>
                      <p className="text-sm text-white/50 font-mono">{agent.classic_address}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-yellow-500/20 text-yellow-300">Testnet</Badge>
                        <Badge className="bg-blue-500/20 text-blue-300">{agent.role}</Badge>
                      </div>
                    </div>
                    {selectedAgents.includes(agent.id) && (
                      <CheckCircle className="w-6 h-6 text-purple-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedAgents.length > 0 && (
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Migration Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-white/80">Agents to migrate</span>
                  <span className="text-white font-medium">{selectedAgents.length}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-white/80">XRP per agent</span>
                  <span className="text-white font-medium">2 XRP</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-white/80">Total XRP required</span>
                  <span className="text-white font-medium">{selectedAgents.length * 2} XRP</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-white/80">Network</span>
                  <Badge className="bg-green-500/20 text-green-300">Mainnet</Badge>
                </div>
                
                <Button
                  onClick={handleMigrate}
                  disabled={migrateMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-6"
                >
                  {migrateMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Migrating to Mainnet...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-5 h-5 mr-2" />
                      Migrate {selectedAgents.length} Agent{selectedAgents.length > 1 ? 's' : ''} to Mainnet
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {migrateMutation.isSuccess && (
          <Alert className="mt-6 border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-200">
              <strong>Migration Complete!</strong> All agents now have mainnet wallets. 
              You can now proceed to the RLUSD Manager to set up trustlines.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}