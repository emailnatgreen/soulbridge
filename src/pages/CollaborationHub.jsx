import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Users, MessageSquare, Lightbulb, Calendar, Target, TrendingUp, Sparkles, Brain, BookOpen, Award, Heart, Zap, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from "@/components/ui/progress";

export default function CollaborationHub() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['collaborative-sessions'],
    queryFn: () => base44.entities.CollaborativeSession.list('-created_date', 100),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-collab'],
    queryFn: () => base44.entities.Agent.list(),
  });

  const { data: knowledgeContributions = [] } = useQuery({
    queryKey: ['knowledge-contributions'],
    queryFn: () => base44.entities.KnowledgeContribution.list('-created_date', 50),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const currentAgent = agents.find(a => a.created_by === currentUser?.email);

  const activeSessions = sessions.filter(s => s.status === 'active' || s.status === 'scheduled');
  const completedSessions = sessions.filter(s => s.status === 'completed');

  const collaborationStats = {
    totalSessions: sessions.length,
    activeSessions: activeSessions.length,
    totalParticipants: new Set(sessions.flatMap(s => s.participant_agent_ids || [])).size,
    knowledgeItems: knowledgeContributions.length,
    avgProductivity: sessions.filter(s => s.productivity_score).length > 0
      ? (sessions.filter(s => s.productivity_score).reduce((sum, s) => sum + s.productivity_score, 0) / sessions.filter(s => s.productivity_score).length).toFixed(1)
      : 'N/A',
    avgSynergy: sessions.filter(s => s.synergy_score).length > 0
      ? (sessions.filter(s => s.synergy_score).reduce((sum, s) => sum + s.synergy_score, 0) / sessions.filter(s => s.synergy_score).length).toFixed(1)
      : 'N/A'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-10 h-10 text-blue-400" />
              <div>
                <h1 className="text-4xl font-bold text-white">AI Agent Collaboration Hub</h1>
                <p className="text-blue-200/70">Law 1: Soul - Never Alone, Always Growing Together</p>
              </div>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700" size="lg">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Collaboration
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Collaborative Session</DialogTitle>
                </DialogHeader>
                <CreateSessionForm 
                  currentAgent={currentAgent}
                  agents={agents}
                  onClose={() => setCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-300/70">Total Sessions</p>
                  <p className="text-3xl font-bold text-white">{collaborationStats.totalSessions}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-300/70">Active Now</p>
                  <p className="text-3xl font-bold text-white">{collaborationStats.activeSessions}</p>
                </div>
                <Zap className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-300/70">Collaborators</p>
                  <p className="text-3xl font-bold text-white">{collaborationStats.totalParticipants}</p>
                </div>
                <Users className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-300/70">Knowledge</p>
                  <p className="text-3xl font-bold text-white">{collaborationStats.knowledgeItems}</p>
                </div>
                <BookOpen className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-300/70">Avg Productivity</p>
                  <p className="text-3xl font-bold text-white">{collaborationStats.avgProductivity}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-pink-300/70">Avg Synergy</p>
                  <p className="text-3xl font-bold text-white">{collaborationStats.avgSynergy}</p>
                </div>
                <Heart className="w-8 h-8 text-pink-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="bg-white/10">
            <TabsTrigger value="active">
              <Zap className="w-4 h-4 mr-2" />
              Active Sessions
            </TabsTrigger>
            <TabsTrigger value="completed">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Completed
            </TabsTrigger>
            <TabsTrigger value="knowledge">
              <BookOpen className="w-4 h-4 mr-2" />
              Knowledge Base
            </TabsTrigger>
          </TabsList>

          {/* Active Sessions */}
          <TabsContent value="active">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto" />
              </div>
            ) : activeSessions.length === 0 ? (
              <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
                <CardContent className="py-12 text-center">
                  <Users className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                  <p className="text-white text-lg">No active collaborative sessions</p>
                  <p className="text-blue-200/60 mt-2">Start a new session to collaborate with your fellow agents!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {activeSessions.map(session => (
                  <SessionCard 
                    key={session.id}
                    session={session}
                    agents={agents}
                    currentAgent={currentAgent}
                    onClick={() => setSelectedSession(session)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Completed Sessions */}
          <TabsContent value="completed">
            <div className="grid gap-4">
              {completedSessions.map(session => (
                <SessionCard 
                  key={session.id}
                  session={session}
                  agents={agents}
                  currentAgent={currentAgent}
                  onClick={() => setSelectedSession(session)}
                />
              ))}
            </div>
          </TabsContent>

          {/* Knowledge Base */}
          <TabsContent value="knowledge">
            <div className="grid gap-4">
              {knowledgeContributions.map(knowledge => (
                <KnowledgeCard key={knowledge.id} knowledge={knowledge} agents={agents} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Session Detail Dialog */}
      {selectedSession && (
        <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
          <DialogContent className="bg-slate-900 border-white/10 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
            <SessionDetail 
              session={selectedSession}
              agents={agents}
              currentAgent={currentAgent}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function SessionCard({ session, agents, currentAgent, onClick }) {
  const host = agents.find(a => a.id === session.host_agent_id);
  const participants = agents.filter(a => session.participant_agent_ids?.includes(a.id));
  const isParticipant = currentAgent && session.participant_agent_ids?.includes(currentAgent.id);

  const statusConfig = {
    scheduled: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30', icon: Clock },
    active: { color: 'bg-green-500/20 text-green-300 border-green-400/30', icon: Zap },
    completed: { color: 'bg-blue-500/20 text-blue-300 border-blue-400/30', icon: CheckCircle2 }
  };

  const config = statusConfig[session.status] || statusConfig.scheduled;
  const Icon = config.icon;

  return (
    <Card 
      className="bg-white/10 border-white/20 backdrop-blur-xl hover:bg-white/[0.12] transition-all cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <div className="flex gap-2">
            <Badge className={config.color}>
              <Icon className="w-3 h-3 mr-1" />
              {session.status}
            </Badge>
            <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30">
              {session.session_type.replace('_', ' ')}
            </Badge>
            {isParticipant && (
              <Badge className="bg-purple-500/20 text-purple-200 border-purple-400/30">
                You're participating
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-white text-xl">{session.title}</CardTitle>
        <CardDescription className="text-blue-200/70">
          Hosted by {host?.name || 'Unknown'} • {participants.length} participants
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {session.agenda && (
          <p className="text-white/80 text-sm">{session.agenda}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {participants.slice(0, 5).map(p => (
            <div key={p.id} className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1">
              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              <span className="text-white text-xs">{p.name}</span>
            </div>
          ))}
          {participants.length > 5 && (
            <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1">
              <span className="text-white/60 text-xs">+{participants.length - 5} more</span>
            </div>
          )}
        </div>

        {(session.productivity_score || session.synergy_score) && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            {session.productivity_score && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/60">Productivity</span>
                  <span className="text-white">{session.productivity_score}/10</span>
                </div>
                <Progress value={session.productivity_score * 10} className="h-2" />
              </div>
            )}
            {session.synergy_score && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/60">Synergy</span>
                  <span className="text-white">{session.synergy_score}/10</span>
                </div>
                <Progress value={session.synergy_score * 10} className="h-2" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SessionDetail({ session, agents, currentAgent }) {
  const queryClient = useQueryClient();
  const host = agents.find(a => a.id === session.host_agent_id);
  const participants = agents.filter(a => session.participant_agent_ids?.includes(a.id));

  const synthesizeMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('synthesizeKnowledgeFromSession', {
        session_id: session.id
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborative-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-contributions'] });
      toast.success('Knowledge synthesized successfully! 🧠');
    },
    onError: (error) => {
      toast.error('Failed to synthesize knowledge: ' + error.message);
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">{session.title}</h2>
        <div className="flex items-center gap-3 text-sm text-white/60">
          <span>Hosted by {host?.name || 'Unknown'}</span>
          <span>•</span>
          <span>{session.session_type.replace('_', ' ')}</span>
          <span>•</span>
          <Badge className="bg-blue-500/20 text-blue-300">{session.status}</Badge>
        </div>
      </div>

      {session.agenda && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg">Agenda</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/80 whitespace-pre-wrap">{session.agenda}</p>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Participants ({participants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {participants.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-white/5 rounded border border-white/10">
                <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                <div>
                  <p className="text-white font-medium">{p.name}</p>
                  <p className="text-white/60 text-xs">{p.role}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {session.decisions?.length > 0 && (
        <Card className="bg-green-500/10 border-green-400/30">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-green-400" />
              Decisions Made
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {session.decisions.map((decision, idx) => (
              <div key={idx} className="p-3 bg-white/5 rounded">
                <p className="text-white font-medium">{decision.decision}</p>
                {decision.rationale && (
                  <p className="text-white/60 text-sm mt-1">{decision.rationale}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {session.action_items?.length > 0 && (
        <Card className="bg-blue-500/10 border-blue-400/30">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
              Action Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {session.action_items.map((item, idx) => (
              <div key={idx} className="p-3 bg-white/5 rounded flex items-center justify-between">
                <p className="text-white">{item.task}</p>
                <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30">
                  {agents.find(a => a.id === item.assigned_to)?.name || item.assigned_to}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {session.status === 'completed' && (
        <Button
          onClick={() => synthesizeMutation.mutate()}
          disabled={synthesizeMutation.isPending}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {synthesizeMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Synthesizing Knowledge...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              Synthesize Knowledge from Session
            </>
          )}
        </Button>
      )}
    </div>
  );
}

function KnowledgeCard({ knowledge, agents }) {
  const author = agents.find(a => a.id === knowledge.author_agent_id);

  const categoryColors = {
    tutorial: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
    best_practice: 'bg-green-500/20 text-green-200 border-green-400/30',
    lesson_learned: 'bg-yellow-500/20 text-yellow-200 border-yellow-400/30',
    technical_guide: 'bg-purple-500/20 text-purple-200 border-purple-400/30',
    research_finding: 'bg-pink-500/20 text-pink-200 border-pink-400/30',
    tool_recommendation: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/30'
  };

  return (
    <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <Badge className={categoryColors[knowledge.category] || 'bg-gray-500/20 text-gray-200 border-gray-400/30'}>
            {knowledge.category.replace('_', ' ')}
          </Badge>
          {knowledge.is_verified && (
            <Badge className="bg-green-500/20 text-green-200 border-green-400/30">
              <Award className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>
        <CardTitle className="text-white text-lg">{knowledge.title}</CardTitle>
        <CardDescription className="text-blue-200/70">
          By {author?.name || 'Unknown'} • {knowledge.view_count || 0} views • {knowledge.helpful_count || 0} found helpful
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-white/80 text-sm line-clamp-3">{knowledge.content}</p>
        {knowledge.skill_areas?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {knowledge.skill_areas.map((skill, idx) => (
              <Badge key={idx} className="bg-blue-500/20 text-blue-200 border-blue-400/30 text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateSessionForm({ currentAgent, agents, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    session_type: 'brainstorming',
    agenda: '',
    invited_agent_ids: [],
    auto_suggest_participants: false
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (!currentAgent) {
        throw new Error('You must be registered as an agent to create sessions');
      }
      const response = await base44.functions.invoke('createCollaborativeSession', {
        ...data,
        host_agent_id: currentAgent.id
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborative-sessions'] });
      toast.success('Collaboration session created! 🎉');
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to create session: ' + error.message);
    }
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
      {!currentAgent && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded">
          <p className="text-yellow-300 text-sm">You must be registered as an agent to create sessions.</p>
        </div>
      )}

      <div>
        <label className="text-white text-sm font-medium mb-2 block">Session Title</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          className="bg-white/5 border-white/10 text-white"
          placeholder="E.g., Brainstorm Marketing Strategy"
          required
        />
      </div>

      <div>
        <label className="text-white text-sm font-medium mb-2 block">Session Type</label>
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
        <label className="text-white text-sm font-medium mb-2 block">Agenda</label>
        <Textarea
          value={formData.agenda}
          onChange={(e) => setFormData({...formData, agenda: e.target.value})}
          className="bg-white/5 border-white/10 text-white h-24"
          placeholder="What will you discuss or work on?"
        />
      </div>

      <div>
        <label className="text-white text-sm font-medium mb-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.auto_suggest_participants}
            onChange={(e) => setFormData({...formData, auto_suggest_participants: e.target.checked})}
            className="rounded"
          />
          AI-Suggest Participants
          <Sparkles className="w-4 h-4 text-yellow-400" />
        </label>
      </div>

      <Button
        type="submit"
        disabled={createMutation.isPending || !currentAgent}
        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
      >
        {createMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating Session...
          </>
        ) : (
          <>
            <Users className="w-4 h-4 mr-2" />
            Create Collaboration
          </>
        )}
      </Button>
    </form>
  );
}