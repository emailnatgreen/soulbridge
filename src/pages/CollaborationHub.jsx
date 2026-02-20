import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Users, Lightbulb, BookOpen, TrendingUp, Clock, CheckCircle, PlayCircle, Calendar, Sparkles, Brain, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function CollaborationHub() {
  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [createKnowledgeOpen, setCreateKnowledgeOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: sessions = [] } = useQuery({
    queryKey: ['collaborative-sessions'],
    queryFn: () => base44.entities.CollaborativeSession.list('-created_date')
  });

  const { data: knowledge = [] } = useQuery({
    queryKey: ['knowledge-contributions'],
    queryFn: () => base44.entities.KnowledgeContribution.list('-created_date')
  });

  const { data: synergies = [] } = useQuery({
    queryKey: ['team-synergies'],
    queryFn: () => base44.entities.TeamSynergy.list('-synergy_score')
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const activeSessions = sessions.filter(s => s.status === 'active');
  const upcomingSessions = sessions.filter(s => s.status === 'scheduled');
  const topSynergies = synergies.slice(0, 5);

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
                <h1 className="text-2xl font-light text-white">Collaboration Hub</h1>
                <p className="text-sm text-purple-300/60">Enhance teamwork and knowledge sharing</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Dialog open={createKnowledgeOpen} onOpenChange={setCreateKnowledgeOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-white/10 text-white">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Share Knowledge
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Share Knowledge</DialogTitle>
                  </DialogHeader>
                  <CreateKnowledgeForm
                    agents={agents}
                    onClose={() => setCreateKnowledgeOpen(false)}
                  />
                </DialogContent>
              </Dialog>
              <Dialog open={createSessionOpen} onOpenChange={setCreateSessionOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                    <Plus className="w-4 h-4 mr-2" />
                    New Session
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Collaboration Session</DialogTitle>
                  </DialogHeader>
                  <CreateSessionForm
                    agents={agents}
                    onClose={() => setCreateSessionOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Active Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{activeSessions.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">{upcomingSessions.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Knowledge Base</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">{knowledge.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Avg Synergy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-400">
                {synergies.length > 0 ? (synergies.reduce((sum, s) => sum + s.synergy_score, 0) / synergies.length).toFixed(1) : 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sessions" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="sessions" className="data-[state=active]:bg-purple-600">
              <PlayCircle className="w-4 h-4 mr-2" />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="data-[state=active]:bg-purple-600">
              <BookOpen className="w-4 h-4 mr-2" />
              Knowledge Base
            </TabsTrigger>
            <TabsTrigger value="synergy" className="data-[state=active]:bg-purple-600">
              <Sparkles className="w-4 h-4 mr-2" />
              Team Synergy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="space-y-6">
            {activeSessions.length > 0 && (
              <div>
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-green-400" />
                  Active Sessions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {activeSessions.map(session => (
                    <SessionCard key={session.id} session={session} agents={agents} />
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                Upcoming Sessions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingSessions.length === 0 ? (
                  <Card className="bg-white/5 border-white/10 col-span-2">
                    <CardContent className="text-center py-12">
                      <Users className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                      <h3 className="text-xl text-white mb-2">No Upcoming Sessions</h3>
                      <p className="text-white/60 mb-6">Schedule a collaboration session</p>
                      <Button onClick={() => setCreateSessionOpen(true)} className="bg-purple-600">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Session
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  upcomingSessions.map(session => (
                    <SessionCard key={session.id} session={session} agents={agents} />
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-4">
            <KnowledgeList knowledge={knowledge} agents={agents} />
          </TabsContent>

          <TabsContent value="synergy" className="space-y-4">
            <SynergyDashboard synergies={topSynergies} agents={agents} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SessionCard({ session, agents }) {
  const getAgentName = (id) => agents.find(a => a.id === id)?.name || 'Unknown';
  
  const typeColors = {
    brainstorming: 'bg-yellow-500/20 text-yellow-300',
    problem_solving: 'bg-blue-500/20 text-blue-300',
    code_review: 'bg-purple-500/20 text-purple-300',
    design_review: 'bg-pink-500/20 text-pink-300',
    planning: 'bg-green-500/20 text-green-300',
    retrospective: 'bg-orange-500/20 text-orange-300',
    knowledge_share: 'bg-indigo-500/20 text-indigo-300',
    pair_work: 'bg-cyan-500/20 text-cyan-300'
  };

  const statusColors = {
    scheduled: 'bg-blue-500/20 text-blue-300',
    active: 'bg-green-500/20 text-green-300',
    completed: 'bg-purple-500/20 text-purple-300',
    cancelled: 'bg-red-500/20 text-red-300'
  };

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <Badge className={typeColors[session.session_type]}>
            {session.session_type.replace('_', ' ')}
          </Badge>
          <Badge className={statusColors[session.status]}>
            {session.status}
          </Badge>
        </div>
        <CardTitle className="text-lg text-white">{session.title}</CardTitle>
        <p className="text-sm text-white/60">hosted by {getAgentName(session.host_agent_id)}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {session.agenda && (
          <p className="text-sm text-white/70">{session.agenda}</p>
        )}
        
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-white/60" />
          <span className="text-sm text-white/80">
            {session.participant_agent_ids?.length || 0} participants
          </span>
        </div>

        {session.start_time && (
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Clock className="w-4 h-4" />
            {new Date(session.start_time).toLocaleString()}
          </div>
        )}

        {session.synergy_score && (
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <span className="text-sm text-white/60">Synergy Score</span>
            <div className="flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-white font-medium">{session.synergy_score}/10</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KnowledgeList({ knowledge, agents }) {
  const getAgentName = (id) => agents.find(a => a.id === id)?.name || 'Unknown';
  
  const categoryColors = {
    tutorial: 'bg-blue-500/20 text-blue-300',
    best_practice: 'bg-green-500/20 text-green-300',
    lesson_learned: 'bg-orange-500/20 text-orange-300',
    technical_guide: 'bg-purple-500/20 text-purple-300',
    research_finding: 'bg-pink-500/20 text-pink-300',
    tool_recommendation: 'bg-cyan-500/20 text-cyan-300',
    case_study: 'bg-indigo-500/20 text-indigo-300',
    troubleshooting: 'bg-red-500/20 text-red-300'
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      {knowledge.map(item => (
        <Card key={item.id} className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <div className="flex items-start justify-between mb-2">
              <Badge className={categoryColors[item.category]}>
                {item.category.replace('_', ' ')}
              </Badge>
              {item.is_verified && (
                <Badge className="bg-green-500/20 text-green-300">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl text-white">{item.title}</CardTitle>
            <p className="text-sm text-white/60">by {getAgentName(item.author_agent_id)}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-white/80 text-sm line-clamp-3">{item.content}</p>
            
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-sm pt-3 border-t border-white/10">
              <div className="flex items-center gap-4 text-white/60">
                <span>{item.view_count || 0} views</span>
                <span>{item.helpful_count || 0} helpful</span>
              </div>
              <Badge className="bg-purple-500/20 text-purple-300">
                {item.difficulty_level}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SynergyDashboard({ synergies, agents }) {
  const getAgentName = (id) => agents.find(a => a.id === id)?.name || 'Unknown';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {synergies.map((synergy, idx) => (
        <Card key={synergy.id} className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                #{idx + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-white">
                  <span className="font-medium">{getAgentName(synergy.agent_a_id)}</span>
                  <span className="text-white/40">+</span>
                  <span className="font-medium">{getAgentName(synergy.agent_b_id)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span className="text-xl font-bold text-white">{synergy.synergy_score.toFixed(1)}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-white/60">Collaborations</span>
                <div className="text-white font-medium">{synergy.collaboration_count || 0}</div>
              </div>
              <div>
                <span className="text-white/60">Successful</span>
                <div className="text-white font-medium">{synergy.successful_projects || 0}</div>
              </div>
              <div>
                <span className="text-white/60">Communication</span>
                <div className="text-white font-medium">{synergy.communication_style_match || 5}/10</div>
              </div>
              <div>
                <span className="text-white/60">Compatibility</span>
                <div className="text-white font-medium">{synergy.problem_solving_compatibility || 5}/10</div>
              </div>
            </div>

            {synergy.shared_interests && synergy.shared_interests.length > 0 && (
              <div className="pt-3 border-t border-white/10">
                <p className="text-xs text-white/60 mb-2">Shared Interests</p>
                <div className="flex flex-wrap gap-2">
                  {synergy.shared_interests.map(interest => (
                    <Badge key={interest} className="bg-purple-500/20 text-purple-300 text-xs">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CreateSessionForm({ agents, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    session_type: 'brainstorming',
    host_agent_id: '',
    participant_agent_ids: [],
    agenda: '',
    start_time: ''
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CollaborativeSession.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['collaborative-sessions']);
      toast.success('Session created!');
      onClose();
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="text-white text-sm mb-2 block">Session Title</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          placeholder="e.g., Design Review for Mobile App"
          className="bg-white/5 border-white/10 text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-white text-sm mb-2 block">Session Type</label>
          <Select value={formData.session_type} onValueChange={(v) => setFormData({...formData, session_type: v})}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              <SelectItem value="brainstorming">Brainstorming</SelectItem>
              <SelectItem value="problem_solving">Problem Solving</SelectItem>
              <SelectItem value="code_review">Code Review</SelectItem>
              <SelectItem value="design_review">Design Review</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="retrospective">Retrospective</SelectItem>
              <SelectItem value="knowledge_share">Knowledge Share</SelectItem>
              <SelectItem value="pair_work">Pair Work</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-white text-sm mb-2 block">Host</label>
          <Select value={formData.host_agent_id} onValueChange={(v) => setFormData({...formData, host_agent_id: v})}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Select host" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              {agents.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-white text-sm mb-2 block">Agenda / Goals</label>
        <Textarea
          value={formData.agenda}
          onChange={(e) => setFormData({...formData, agenda: e.target.value})}
          placeholder="What will you work on together?"
          className="bg-white/5 border-white/10 text-white"
          rows={3}
        />
      </div>

      <div>
        <label className="text-white text-sm mb-2 block">Start Time</label>
        <Input
          type="datetime-local"
          value={formData.start_time}
          onChange={(e) => setFormData({...formData, start_time: e.target.value})}
          className="bg-white/5 border-white/10 text-white"
        />
      </div>

      <Button
        onClick={() => createMutation.mutate({
          ...formData,
          start_time: formData.start_time ? new Date(formData.start_time).toISOString() : undefined,
          status: 'scheduled'
        })}
        disabled={!formData.title || !formData.host_agent_id || createMutation.isPending}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Session
      </Button>
    </div>
  );
}

function CreateKnowledgeForm({ agents, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    category: 'tutorial',
    content: '',
    author_agent_id: '',
    tags: '',
    difficulty_level: 'intermediate'
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.KnowledgeContribution.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['knowledge-contributions']);
      toast.success('Knowledge shared!');
      onClose();
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="text-white text-sm mb-2 block">Title</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          placeholder="e.g., How to Optimize React Performance"
          className="bg-white/5 border-white/10 text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-white text-sm mb-2 block">Category</label>
          <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              <SelectItem value="tutorial">Tutorial</SelectItem>
              <SelectItem value="best_practice">Best Practice</SelectItem>
              <SelectItem value="lesson_learned">Lesson Learned</SelectItem>
              <SelectItem value="technical_guide">Technical Guide</SelectItem>
              <SelectItem value="research_finding">Research Finding</SelectItem>
              <SelectItem value="tool_recommendation">Tool Recommendation</SelectItem>
              <SelectItem value="case_study">Case Study</SelectItem>
              <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-white text-sm mb-2 block">Difficulty</label>
          <Select value={formData.difficulty_level} onValueChange={(v) => setFormData({...formData, difficulty_level: v})}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-white text-sm mb-2 block">Author</label>
        <Select value={formData.author_agent_id} onValueChange={(v) => setFormData({...formData, author_agent_id: v})}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Select author" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10">
            {agents.map(agent => (
              <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-white text-sm mb-2 block">Content</label>
        <Textarea
          value={formData.content}
          onChange={(e) => setFormData({...formData, content: e.target.value})}
          placeholder="Share your knowledge..."
          className="bg-white/5 border-white/10 text-white"
          rows={6}
        />
      </div>

      <div>
        <label className="text-white text-sm mb-2 block">Tags (comma-separated)</label>
        <Input
          value={formData.tags}
          onChange={(e) => setFormData({...formData, tags: e.target.value})}
          placeholder="e.g., react, performance, optimization"
          className="bg-white/5 border-white/10 text-white"
        />
      </div>

      <Button
        onClick={() => createMutation.mutate({
          ...formData,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
        })}
        disabled={!formData.title || !formData.content || !formData.author_agent_id || createMutation.isPending}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        <BookOpen className="w-4 h-4 mr-2" />
        Share Knowledge
      </Button>
    </div>
  );
}