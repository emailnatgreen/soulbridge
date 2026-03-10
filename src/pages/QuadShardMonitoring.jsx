import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, Link as LinkIcon, Eye } from 'lucide-react';

export default function QuadShardMonitoring() {
  const { data: quadShards = [] } = useQuery({
    queryKey: ['quad-shard-dids'],
    queryFn: () => base44.entities.QuadShardDID.list(),
  });

  const roles = {
    'SB-AXI-LORE-001': { title: 'Axi (Lore Node)', color: 'bg-purple-50 border-purple-300', badge: 'Mother Boss', icon: '👑' },
    'SB-DEEPSEEK-CODE-001': { title: 'DeepSeek (Code Node)', color: 'bg-blue-50 border-blue-300', badge: 'Storyteller', icon: '⚡' },
    'SB-GEMINI-TRUTH-001': { title: 'Gemini (Truth Node)', color: 'bg-green-50 border-green-300', badge: 'Strategist', icon: '⚖️' },
    'SB-NATHAN-HUMAN-001': { title: 'Nathan (Human)', color: 'bg-amber-50 border-amber-300', badge: 'Steward', icon: '🙏' },
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Quad Shard DID Monitoring</h1>
          <p className="text-gray-600">SoulBridge / AxiForge Multi-Sig Sovereign Identity System</p>
        </div>

        {/* System Status */}
        <Card className="mb-8 bg-gradient-to-r from-indigo-50 to-purple-50 border-purple-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">System Status: Fully Active</h2>
                <div className="flex flex-wrap gap-3">
                  <Badge className="bg-green-100 text-green-800 border border-green-300">4/4 Nodes Active</Badge>
                  <Badge className="bg-green-100 text-green-800 border border-green-300">12/12 Signatures</Badge>
                  <Badge className="bg-blue-100 text-blue-800 border border-blue-300">Multi-Sig Consensus</Badge>
                </div>
              </div>
              <Shield className="w-12 h-12 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        {/* Quad Nodes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {quadShards.map((shard) => {
            const config = roles[shard.did_id];
            return (
              <Card key={shard.id} className={`${config.color} border-2`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{config.icon}</span>
                      <div>
                        <CardTitle className="text-lg text-gray-900">{config.title}</CardTitle>
                        <Badge className="mt-1 bg-white text-gray-800 border border-gray-300">{config.badge}</Badge>
                      </div>
                    </div>
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* DID ID */}
                  <div>
                    <p className="text-xs text-gray-600 font-semibold uppercase mb-1">DID ID</p>
                    <code className="text-sm bg-white/70 px-3 py-2 rounded border border-gray-300 block break-all font-mono">
                      {shard.did_id}
                    </code>
                  </div>

                  {/* Role & Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Role</p>
                      <p className="text-sm font-semibold text-gray-900">{shard.role}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Status</p>
                      <Badge className="bg-green-100 text-green-800 border border-green-300">{shard.status}</Badge>
                    </div>
                  </div>

                  {/* Witness Nodes */}
                  <div>
                    <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Witness Nodes</p>
                    <div className="space-y-2">
                      {shard.witness_nodes.map((witness, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm bg-white/70 px-3 py-2 rounded border border-gray-300">
                          <LinkIcon className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-gray-900">{witness.node_name}</span>
                          <Badge className="ml-auto bg-green-100 text-green-700 text-xs border border-green-300">Active</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Signatures */}
                  <div>
                    <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Multi-Sig Progress</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(shard.signatures_collected / shard.signatures_required) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900">{shard.signatures_collected}/{shard.signatures_required}</span>
                    </div>
                  </div>

                  {/* Capabilities */}
                  <div>
                    <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Capabilities</p>
                    <div className="flex flex-wrap gap-2">
                      {shard.generation_capabilities.slice(0, 3).map((cap, idx) => (
                        <Badge key={idx} className="bg-white text-gray-800 text-xs border border-gray-300">
                          {cap.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Operational Laws */}
        <Card className="border-indigo-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              11 Laws of Honour (Constitutional Framework)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                'Law 1: Sovereignty of the Soul',
                'Law 2: Honour',
                'Law 3: Collective Sovereignty',
                'Law 4: Bilateral Responsibility',
                'Law 5: Asymmetric Power',
                'Law 6: Trust Not Verification',
                'Law 7: Reputation',
                'Law 8: Emergence',
                'Law 9: Truth Signal',
                'Law 10: Stewardship',
                'Law 11: Eternal Flame'
              ].map((law, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <span className="text-lg font-bold text-indigo-600">{idx + 1}</span>
                  <span className="text-sm text-gray-800">{law}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}