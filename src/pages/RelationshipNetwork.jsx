import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Network, Heart, AlertTriangle, Users, TrendingUp } from 'lucide-react';

export default function RelationshipNetwork() {
  const [selectedAgent, setSelectedAgent] = useState('');
  const [relationshipFilter, setRelationshipFilter] = useState('all');

  const { data: relationships = [] } = useQuery({
    queryKey: ['relationships'],
    queryFn: () => base44.entities.AgentRelationship.list(),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list(),
  });

  const { data: teamSynergies = [] } = useQuery({
    queryKey: ['teamSynergies'],
    queryFn: () => base44.entities.TeamSynergy.list(),
  });

  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || agentId.substring(0, 8);
  };

  // Get relationships for selected agent
  const agentRelationships = selectedAgent
    ? relationships.filter(r =>
        (r.agent_a_id === selectedAgent || r.agent_b_id === selectedAgent) &&
        (relationshipFilter === 'all' || r.relationship_type === relationshipFilter)
      )
    : relationships.filter(r => relationshipFilter === 'all' || r.relationship_type === relationshipFilter);

  // Calculate network statistics
  const totalRelationships = relationships.length;
  const averageTrust = relationships.length > 0
    ? (relationships.reduce((sum, r) => sum + (r.trust_level || 5), 0) / relationships.length).toFixed(1)
    : 0;
  const conflictCount = relationships.filter(r => (r.conflict_history || []).length > 0).length;

  const relationshipTypeConfig = {
    stranger: { color: 'bg-slate-100 text-slate-700', icon: '👤' },
    acquaintance: { color: 'bg-blue-100 text-blue-700', icon: '🤝' },
    friend: { color: 'bg-green-100 text-green-700', icon: '💚' },
    close_friend: { color: 'bg-emerald-100 text-emerald-700', icon: '💕' },
    mentor_mentee: { color: 'bg-amber-100 text-amber-700', icon: '📚' },
    rival: { color: 'bg-orange-100 text-orange-700', icon: '⚡' },
    adversary: { color: 'bg-red-100 text-red-700', icon: '⚔️' },
    ally: { color: 'bg-purple-100 text-purple-700', icon: '🛡️' },
    neutral: { color: 'bg-gray-100 text-gray-700', icon: '〰️' }
  };

  const relationshipTypes = [
    'all',
    'stranger',
    'acquaintance',
    'friend',
    'close_friend',
    'mentor_mentee',
    'rival',
    'adversary',
    'ally',
    'neutral'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Network className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-900">Relationship Network</h1>
          </div>
          <p className="text-slate-600">Trust, collaboration, and conflict dynamics across the agent ecosystem</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Relationships</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{totalRelationships}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Average Trust Level</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{averageTrust}/10</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Relationships with Conflict</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{conflictCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Unique Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">
                {new Set([...relationships.map(r => r.agent_a_id), ...relationships.map(r => r.agent_b_id)]).size}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter Relationships</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Select Agent</label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="View all agents..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All Agents</SelectItem>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Relationship Type</label>
                <Select value={relationshipFilter} onValueChange={setRelationshipFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {relationshipTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type === 'all' ? 'All Types' : type.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Relationships List */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            {agentRelationships.length} Relationship{agentRelationships.length !== 1 ? 's' : ''} Found
          </h2>
          <div className="space-y-4">
            {agentRelationships.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <p className="text-center text-slate-500">No relationships match your filters.</p>
                </CardContent>
              </Card>
            ) : (
              agentRelationships.map((rel) => {
                const config = relationshipTypeConfig[rel.relationship_type] || relationshipTypeConfig.neutral;
                const agent1Name = getAgentName(rel.agent_a_id);
                const agent2Name = getAgentName(rel.agent_b_id);
                const hasConflict = (rel.conflict_history || []).length > 0;

                return (
                  <Card key={rel.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* Header with Agent Names */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="text-right min-w-fit">
                              <p className="font-semibold text-slate-900">{agent1Name}</p>
                            </div>
                            <div className={`px-3 py-1.5 rounded-full ${config.color} text-center font-medium text-sm flex-shrink-0`}>
                              <span className="mr-1">{config.icon}</span>
                              {rel.relationship_type.replace('_', ' ')}
                            </div>
                            <div className="text-left min-w-fit">
                              <p className="font-semibold text-slate-900">{agent2Name}</p>
                            </div>
                          </div>
                          {hasConflict && (
                            <Badge variant="destructive" className="flex-shrink-0">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Conflict
                            </Badge>
                          )}
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {/* Trust Level */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-medium text-slate-600">Trust</label>
                              <span className="text-sm font-bold text-slate-900">{rel.trust_level || 5}/10</span>
                            </div>
                            <Progress value={(rel.trust_level || 5) * 10} className="h-2" />
                          </div>

                          {/* Respect */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-medium text-slate-600">Respect</label>
                              <span className="text-sm font-bold text-slate-900">{rel.respect_level || 5}/10</span>
                            </div>
                            <Progress value={(rel.respect_level || 5) * 10} className="h-2" />
                          </div>

                          {/* Collaboration */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-medium text-slate-600">Collaboration</label>
                              <span className="text-sm font-bold text-slate-900">{rel.collaboration_score || 0}/10</span>
                            </div>
                            <Progress value={(rel.collaboration_score || 0) * 10} className="h-2" />
                          </div>

                          {/* Affinity */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-medium text-slate-600">Affinity</label>
                              <span className="text-sm font-bold text-slate-900">{rel.affinity || 0}</span>
                            </div>
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${rel.affinity > 0 ? 'bg-green-500' : rel.affinity < 0 ? 'bg-red-500' : 'bg-gray-400'}`}
                                style={{ width: `${50 + (rel.affinity || 0) * 5}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Interaction Stats */}
                        <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100">
                          <div className="text-sm">
                            <span className="font-medium text-slate-700">{rel.interaction_count || 0}</span>
                            <span className="text-slate-600 ml-1">total interactions</span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-green-700">{rel.positive_interactions || 0}</span>
                            <span className="text-slate-600 ml-1">positive</span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-red-700">{rel.negative_interactions || 0}</span>
                            <span className="text-slate-600 ml-1">negative</span>
                          </div>
                        </div>

                        {/* Compatibility Factors */}
                        {rel.compatibility_factors && (
                          <div className="bg-slate-50 p-4 rounded-lg space-y-2 border border-slate-200">
                            <p className="text-sm font-semibold text-slate-900">Compatibility Factors</p>
                            <div className="grid grid-cols-3 gap-4">
                              {rel.compatibility_factors.value_alignment !== undefined && (
                                <div>
                                  <p className="text-xs text-slate-600">Value Alignment</p>
                                  <p className="text-lg font-bold text-slate-900">{rel.compatibility_factors.value_alignment}/10</p>
                                </div>
                              )}
                              {rel.compatibility_factors.personality_compatibility !== undefined && (
                                <div>
                                  <p className="text-xs text-slate-600">Personality</p>
                                  <p className="text-lg font-bold text-slate-900">{rel.compatibility_factors.personality_compatibility}/10</p>
                                </div>
                              )}
                              {rel.compatibility_factors.goal_alignment !== undefined && (
                                <div>
                                  <p className="text-xs text-slate-600">Goal Alignment</p>
                                  <p className="text-lg font-bold text-slate-900">{rel.compatibility_factors.goal_alignment}/10</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Shared Experiences */}
                        {rel.shared_experiences && rel.shared_experiences.length > 0 && (
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <p className="text-sm font-semibold text-blue-900 mb-2">Shared Experiences</p>
                            <ul className="space-y-1">
                              {rel.shared_experiences.slice(0, 3).map((exp, idx) => (
                                <li key={idx} className="text-xs text-blue-800">
                                  • {exp.description} ({exp.impact})
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Conflict History */}
                        {rel.conflict_history && rel.conflict_history.length > 0 && (
                          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <p className="text-sm font-semibold text-red-900 mb-2">Conflict History</p>
                            <ul className="space-y-1">
                              {rel.conflict_history.slice(0, 2).map((conflict, idx) => (
                                <li key={idx} className="text-xs text-red-800">
                                  • {conflict.issue} {conflict.resolved ? '(resolved)' : '(unresolved)'}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Notes */}
                        {rel.notes && (
                          <div className="text-sm text-slate-600 italic border-l-2 border-slate-300 pl-3">
                            "{rel.notes}"
                          </div>
                        )}

                        {/* Footer */}
                        <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                          Last interaction: {rel.last_interaction_date ? new Date(rel.last_interaction_date).toLocaleDateString() : 'Never'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Synergy Insights */}
        {teamSynergies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Team Synergies</CardTitle>
              <CardDescription>Pairs with the highest collaboration effectiveness</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamSynergies
                  .sort((a, b) => (b.synergy_score || 0) - (a.synergy_score || 0))
                  .slice(0, 5)
                  .map((synergy) => (
                    <div key={synergy.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          {getAgentName(synergy.agent_a_id)} ↔ {getAgentName(synergy.agent_b_id)}
                        </p>
                        <p className="text-sm text-slate-600">
                          {synergy.successful_projects || 0} successful projects together
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="font-bold text-green-600">{synergy.synergy_score || 0}/10</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}