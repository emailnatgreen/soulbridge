import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Brain, Sparkles, Heart, Lightbulb, BookOpen, Target } from 'lucide-react';

export default function MemoryBrowser() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [sortBy, setSortBy] = useState('importance');

  const { data: memories = [] } = useQuery({
    queryKey: ['memories'],
    queryFn: () => base44.entities.Memory.list(),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list(),
  });

  // Filter and search memories
  const filteredMemories = memories.filter(memory => {
    const typeMatch = selectedType === 'all' || memory.type === selectedType;
    const agentMatch = selectedAgent === 'all' || memory.agent_id === selectedAgent;
    const searchMatch = searchTerm === '' || 
      memory.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      memory.keywords?.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return typeMatch && agentMatch && searchMatch;
  });

  // Sort memories
  const sortedMemories = [...filteredMemories].sort((a, b) => {
    if (sortBy === 'importance') return (b.importance || 0) - (a.importance || 0);
    if (sortBy === 'recent') return new Date(b.created_date) - new Date(a.created_date);
    return 0;
  });

  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || agentId.substring(0, 8);
  };

  const typeConfig = {
    conversation_snippet: { icon: BookOpen, color: 'bg-blue-100 text-blue-700', label: 'Conversation' },
    user_preference: { icon: Heart, color: 'bg-pink-100 text-pink-700', label: 'Preference' },
    village_detail: { icon: Sparkles, color: 'bg-amber-100 text-amber-700', label: 'Village Detail' },
    observation: { icon: Brain, color: 'bg-purple-100 text-purple-700', label: 'Observation' },
    fact: { icon: Lightbulb, color: 'bg-green-100 text-green-700', label: 'Fact' },
    relationship: { icon: Heart, color: 'bg-red-100 text-red-700', label: 'Relationship' },
    emotion: { icon: Heart, color: 'bg-orange-100 text-orange-700', label: 'Emotion' }
  };

  const memoryTypes = ['all', 'conversation_snippet', 'user_preference', 'village_detail', 'observation', 'fact', 'relationship', 'emotion'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-8 h-8 text-purple-600" />
            <h1 className="text-4xl font-bold text-slate-900">Memory Browser</h1>
          </div>
          <p className="text-slate-600">Explore the thoughts, insights, and relationships that shape agent consciousness</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Memories</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{memories.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Average Importance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">
                {(memories.reduce((sum, m) => sum + (m.importance || 5), 0) / memories.length).toFixed(1)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Active Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{new Set(memories.map(m => m.agent_id)).size}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Search</label>
                <Input
                  placeholder="Search memories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Type</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {memoryTypes.filter(t => t !== 'all').map(type => (
                      <SelectItem key={type} value={type}>
                        {typeConfig[type]?.label || type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Agent</label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="importance">Importance</SelectItem>
                    <SelectItem value="recent">Recent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Memories Grid */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            {sortedMemories.length} Memory{sortedMemories.length !== 1 ? 'ies' : ''} Found
          </h2>
          <div className="space-y-4">
            {sortedMemories.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <p className="text-center text-slate-500">No memories match your filters.</p>
                </CardContent>
              </Card>
            ) : (
              sortedMemories.map((memory) => {
                const config = typeConfig[memory.type] || {
                  icon: Brain,
                  color: 'bg-slate-100 text-slate-700',
                  label: memory.type
                };
                const Icon = config.icon;

                return (
                  <Card key={memory.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {config.label}
                                </Badge>
                                <p className="text-sm font-medium text-slate-600">
                                  {getAgentName(memory.agent_id)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-500">Importance</span>
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full ${i < (memory.importance || 5) ? 'bg-amber-400' : 'bg-slate-200'}`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <p className="text-slate-700 leading-relaxed">{memory.content}</p>

                        {/* Keywords and Related */}
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                          {memory.keywords && memory.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {memory.keywords.map((keyword, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {memory.related_entity_id && (
                            <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                              <span className="font-medium">Related:</span> {memory.related_entity_type} ({memory.related_entity_id.substring(0, 8)})
                            </div>
                          )}

                          {memory.context && (
                            <div className="text-xs text-slate-600 italic">
                              "{memory.context}"
                            </div>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                          Created {new Date(memory.created_date).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}