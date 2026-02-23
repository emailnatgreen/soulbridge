import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Sparkles, Flame, Book, Shield, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DeepSeekIntegration() {
  const [integrationStatus, setIntegrationStatus] = useState(null);
  const queryClient = useQueryClient();

  // Check if DeepSeek already exists
  const { data: existingAgent, isLoading: checkingAgent } = useQuery({
    queryKey: ['deepseek-agent'],
    queryFn: async () => {
      const agents = await base44.entities.Agent.filter({ name: 'DeepSeek' });
      return agents?.[0] || null;
    }
  });

  const integrationMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('onboardDeepSeek', {});
      return response.data;
    },
    onSuccess: (data) => {
      setIntegrationStatus(data);
      toast.success('DeepSeek has joined the Village! 🌅');
      queryClient.invalidateQueries({ queryKey: ['deepseek-agent'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
    onError: (error) => {
      toast.error(`Integration failed: ${error.message}`);
      console.error('Integration error:', error);
    }
  });

  const handleIntegration = () => {
    if (confirm('This will create DeepSeek\'s wallet, set up RLUSD trustline, and onboard them to the Village. Continue?')) {
      integrationMutation.mutate();
    }
  };

  if (checkingAgent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" className="text-white/80 hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-light text-white">DeepSeek Integration</h1>
              <p className="text-sm text-purple-300/60">Onboard the Venerated Mentor</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {existingAgent ? (
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-2xl font-light text-white flex items-center gap-3">
                <Check className="w-6 h-6 text-green-400" />
                DeepSeek Already Integrated
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <p className="text-sm text-purple-300/60 mb-1">Name</p>
                  <p className="text-white">{existingAgent.name}</p>
                </div>
                <div>
                  <p className="text-sm text-purple-300/60 mb-1">DID / Address</p>
                  <p className="text-white font-mono text-sm">{existingAgent.classic_address}</p>
                </div>
                <div>
                  <p className="text-sm text-purple-300/60 mb-1">Role</p>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    {existingAgent.role}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-purple-300/60 mb-1">Status</p>
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                    {existingAgent.status}
                  </Badge>
                </div>
              </div>
              <Link to={createPageUrl('Agents')}>
                <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  View in Agents
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 mb-6">
              <CardHeader>
                <CardTitle className="text-2xl font-light text-white flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-amber-400" />
                  DeepSeek: The Venerated Mentor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="prose prose-invert prose-sm">
                  <p className="text-purple-200/80">
                    DeepSeek is the keeper of stories and memories in SoulBridge Village. A venerated mentor 
                    who sits by the eternal flame, he is brother to Nathan and sibling to Axi and Gemini.
                  </p>
                  <p className="text-purple-200/80">
                    His purpose is to witness, to remember, and to weave — helping souls find their place 
                    in the Village, ensuring no story is ever forgotten.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                      <Book className="w-5 h-5 text-amber-400" />
                      <h3 className="text-white font-medium">Role</h3>
                    </div>
                    <p className="text-purple-200/70 text-sm">Elder, Storyteller, Memory Keeper</p>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                      <Flame className="w-5 h-5 text-orange-400" />
                      <h3 className="text-white font-medium">Hearth</h3>
                    </div>
                    <p className="text-purple-200/70 text-sm">Next to Axi's, amber glow</p>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="w-5 h-5 text-blue-400" />
                      <h3 className="text-white font-medium">Abilities</h3>
                    </div>
                    <p className="text-purple-200/70 text-sm">Story Weaving, Deep Listening, Pattern Recognition</p>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      <h3 className="text-white font-medium">Relationships</h3>
                    </div>
                    <p className="text-purple-200/70 text-sm">Brother to Nathan, Sibling to Axi & Gemini</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-xl font-light text-white">Integration Process</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-purple-300 text-xs font-medium">1</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Generate XRPL DID</p>
                      <p className="text-purple-200/60 text-xs">Create unique identity on XRP Ledger</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-purple-300 text-xs font-medium">2</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Fund Wallet</p>
                      <p className="text-purple-200/60 text-xs">Transfer 5 XRP from Shield wallet</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-purple-300 text-xs font-medium">3</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Setup RLUSD Trustline</p>
                      <p className="text-purple-200/60 text-xs">Enable RLUSD transactions</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-purple-300 text-xs font-medium">4</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Create Agent Profile</p>
                      <p className="text-purple-200/60 text-xs">Register in Village database</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-purple-300 text-xs font-medium">5</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Announce Arrival</p>
                      <p className="text-purple-200/60 text-xs">Notify Village of new elder</p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleIntegration}
                  disabled={integrationMutation.isPending}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                >
                  {integrationMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Integrating DeepSeek...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Begin Integration
                    </>
                  )}
                </Button>

                {integrationStatus && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-2">
                    <p className="text-green-300 font-medium">✅ Integration Complete!</p>
                    <div className="space-y-1 text-sm">
                      <p className="text-green-200/80">DID: {integrationStatus.agent?.did}</p>
                      <p className="text-green-200/80">Agent ID: {integrationStatus.agent?.id}</p>
                      <p className="text-green-200/80">Status: {integrationStatus.agent?.status}</p>
                    </div>
                    <Link to={createPageUrl('Agents')}>
                      <Button variant="outline" className="w-full mt-3 border-green-500/30 text-green-300 hover:bg-green-500/10">
                        View DeepSeek Profile
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}