import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Shield, Users, Lock, CheckCircle2, Search } from 'lucide-react';
import RoleCredentialMapper, { ROLE_CREDENTIAL_MAP } from '../components/RoleCredentialMapper';
import AskAxiButton from '@/components/AskAxiButton';
import AgentRoleAssignment from '../components/AgentRoleAssignment';

export default function AgentRolePermissions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showMapper, setShowMapper] = useState(false);

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-roles'],
    queryFn: () => base44.entities.Agent.list('-created_date', 100),
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ['credentials-all'],
    queryFn: () => base44.entities.DidCredential.filter({}, '-created_date', 500),
  });

  // Build agent credential map
  const agentCredentialsMap = useMemo(() => {
    const map = {};
    agents.forEach(agent => {
      map[agent.id] = credentials.filter(
        c => c.subject_did === agent.classic_address || c.subject_wallet_id === agent.wallet_id
      );
    });
    return map;
  }, [agents, credentials]);

  // Filter agents by search
  const filteredAgents = useMemo(() => {
    return agents.filter(a =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [agents, searchTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
          <div className="h-5 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <span className="font-semibold text-sm">Agent Role & Permissions</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Intro Banner */}
        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-6 space-y-3">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-indigo-300 mb-1">Credential-Based Role System</h2>
              <p className="text-white/70 text-sm leading-relaxed">
                Roles and permissions are now directly tied to verifiable credentials. Each role requires specific, cryptographically-signed attestations to ensure agents have proven expertise and authorization before accessing sensitive functions. This creates an unbreakable link between demonstrated capability and operational authority.
              </p>
            </div>
          </div>
        </div>

        {!selectedAgent ? (
          <>
            {/* Search & Overview */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    placeholder="Search agents by name or role…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-800/50 border-white/10 text-white"
                  />
                </div>
                <div className="text-sm text-white/50">{filteredAgents.length} agents</div>
              </div>
            </div>

            {/* Role Framework Overview */}
            <div className="bg-slate-800/30 border border-white/10 rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-white/80">Role Framework</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
                {Object.entries(ROLE_CREDENTIAL_MAP).map(([key, config]) => (
                  <div key={key} className="bg-slate-800/50 border border-white/5 rounded-lg p-4 space-y-2">
                    <div className="text-2xl">{config.icon}</div>
                    <div className="font-semibold text-sm text-white">{config.displayName}</div>
                    <div className="text-xs text-white/40">{config.requiredCredentials.length} required credential{config.requiredCredentials.length !== 1 ? 's' : ''}</div>
                    <div className="pt-2 border-t border-white/10">
                      <div className="text-xs text-white/30">{config.permissions.length} permissions</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agents List */}
            <div className="space-y-2">
              <h3 className="font-semibold text-white/80">Agents</h3>
              <div className="grid gap-3">
                {filteredAgents.length === 0 ? (
                  <div className="text-center py-12 text-white/40">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No agents found
                  </div>
                ) : (
                  filteredAgents.map((agent) => {
                    const agentCreds = agentCredentialsMap[agent.id] || [];
                    const activeCreds = agentCreds.filter(c => c.status === 'active');
                    const currentRoleConfig = ROLE_CREDENTIAL_MAP[agent.role];

                    return (
                      <div
                        key={agent.id}
                        onClick={() => setSelectedAgent(agent)}
                        className="bg-slate-800/40 border border-white/10 rounded-lg p-5 cursor-pointer hover:border-indigo-500/30 transition-all space-y-3 hover:bg-slate-800/60"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-full bg-indigo-600/30 flex items-center justify-center border border-indigo-500/30">
                                {agent.avatar_url ? (
                                  <img src={agent.avatar_url} alt={agent.name} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  <span className="text-lg font-semibold">{agent.name.charAt(0)}</span>
                                )}
                              </div>
                              <div>
                                <h4 className="font-semibold text-white">{agent.name}</h4>
                                <p className="text-xs text-white/50">{agent.purpose || 'No purpose defined'}</p>
                              </div>
                            </div>
                          </div>
                          {currentRoleConfig && (
                            <Badge className="bg-indigo-600 text-xs shrink-0">{currentRoleConfig.displayName}</Badge>
                          )}
                        </div>

                        {/* Credentials Summary */}
                        <div className="bg-slate-900/50 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/50">Credentials</span>
                            <span className={activeCreds.length > 0 ? 'text-green-400 font-semibold' : 'text-white/40'}>
                              {activeCreds.length} active
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {activeCreds.slice(0, 3).map(c => (
                              <Badge key={c.id} className="text-xs bg-green-600/30 border border-green-500/30">
                                {c.credential_type.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                            {activeCreds.length > 3 && (
                              <Badge className="text-xs bg-white/10">+{activeCreds.length - 3} more</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Selected Agent Detail */}
            <div className="space-y-6">
              {/* Back Button */}
              <Button
                variant="outline"
                onClick={() => setSelectedAgent(null)}
                className="text-white/70 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Agents
              </Button>

              {/* Agent Header */}
              <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-lg bg-indigo-600/30 flex items-center justify-center border border-indigo-500/30 text-2xl">
                      {selectedAgent.avatar_url ? (
                        <img src={selectedAgent.avatar_url} alt={selectedAgent.name} className="w-full h-full rounded-lg object-cover" />
                      ) : (
                        selectedAgent.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{selectedAgent.name}</h3>
                      <p className="text-white/50 mt-1">{selectedAgent.purpose}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge className="bg-indigo-600">{ROLE_CREDENTIAL_MAP[selectedAgent.role]?.displayName || selectedAgent.role}</Badge>
                        <span className="text-xs text-white/40">Honor: {selectedAgent.honor_score || 100}</span>
                      </div>
                    </div>
                  </div>
                  <AgentRoleAssignment
                    agent={selectedAgent}
                    agentCredentials={agentCredentialsMap[selectedAgent.id] || []}
                    onRoleAssigned={() => setSelectedAgent(null)}
                  />
                </div>
              </div>

              {/* Credential-Based Roles */}
              <RoleCredentialMapper
                agent={selectedAgent}
                agentCredentials={agentCredentialsMap[selectedAgent.id] || []}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}