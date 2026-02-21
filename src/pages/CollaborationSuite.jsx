import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Users, Sparkles, TrendingUp, CheckCircle, Brain, Loader2, Award, Target, BarChart3, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function CollaborationSuite() {
  const [showFormTeam, setShowFormTeam] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const queryClient = useQueryClient();

  const { data: teamFormations = [] } = useQuery({
    queryKey: ['teamFormations'],
    queryFn: () => base44.entities.TeamFormation.list('-created_date', 50)
  });

  const { data: collaborationQuality = [] } = useQuery({
    queryKey: ['collaborationQuality'],
    queryFn: () => base44.entities.CollaborationQuality.list('-created_date', 50)
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['collaborativeSessions'],
    queryFn: () => base44.entities.CollaborativeSession.list('-created_date', 100)
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const activeTeams = teamFormations.filter(tf => tf.status === 'active');
  const avgQuality = collaborationQuality.length > 0
    ? collaborationQuality.reduce((sum, q) => sum + q.quality_score, 0) / collaborationQuality.length
    : 0;
  const avgTeamScore = teamFormations.length > 0
    ? teamFormations.reduce((sum, tf) => sum + (tf.ai_team_score || 0), 0) / teamFormations.length
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
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
                <h1 className="text-2xl font-light text-white">Agent Collaboration Suite</h1>
                <p className="text-sm text-indigo-300/60">Elevating Teamwork Through Intelligence</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowFormTeam(true)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Form AI Team
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Active Teams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-indigo-400">{activeTeams.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Avg Team Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">{avgTeamScore.toFixed(0)}/100</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Collaboration Quality</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{avgQuality.toFixed(0)}/100</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Total Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">{sessions.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="teams" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="teams">AI Teams</TabsTrigger>
            <TabsTrigger value="quality">Quality Insights</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="teams">
            <div className="space-y-4">
              {teamFormations.map(team => (
                <TeamCard 
                  key={team.id}
                  team={team}
                  agents={agents}
                  onClick={() => setSelectedTeam(team)}
                />
              ))}
              {teamFormations.length === 0 && (
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardContent className="p-12 text-center">
                    <Users className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                    <h3 className="text-white text-xl font-medium mb-2">No Teams Yet</h3>
                    <p className="text-white/60 mb-6">Let AI form the optimal team for your project</p>
                    <Button onClick={() => setShowFormTeam(true)} className="bg-indigo-600">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Form AI Team
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="quality">
            <div className="space-y-4">
              {collaborationQuality.map(quality => (
                <QualityCard 
                  key={quality.id}
                  quality={quality}
                  agents={agents}
                />
              ))}
              {collaborationQuality.length === 0 && (
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardContent className="p-12 text-center">
                    <BarChart3 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-white text-xl font-medium mb-2">No Quality Assessments</h3>
                    <p className="text-white/60">Complete collaboration sessions to see quality insights</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sessions">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessions.map(session => (
                <SessionCard 
                  key={session.id}
                  session={session}
                  agents={agents}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {showFormTeam && (
        <FormTeamDialog 
          onClose={() => setShowFormTeam(false)}
        />
      )}

      {selectedTeam && (
        <TeamDetailDialog 
          team={selectedTeam}
          agents={agents}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </div>
  );
}

function TeamCard({ team, agents, onClick }) {
  return (
    <Card 
      className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-white font-medium text-lg">{team.team_name}</div>
            <div className="text-sm text-white/60 mt-1">
              {team.team_members?.length || 0} members • {team.formation_method}
            </div>
          </div>
          <Badge className={
            team.status === 'active' ? 'bg-green-500/20 text-green-400' :
            team.status === 'proposed' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-gray-500/20 text-gray-400'
          }>
            {team.status}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <div className="text-xs text-white/60 mb-1">Team Score</div>
            <div className="text-2xl font-bold text-indigo-400">{team.ai_team_score || 0}/100</div>
          </div>
          <div>
            <div className="text-xs text-white/60 mb-1">Skill Coverage</div>
            <div className="text-2xl font-bold text-purple-400">
              {team.skill_coverage?.coverage_percentage || 0}%
            </div>
          </div>
          <div>
            <div className="text-xs text-white/60 mb-1">Diversity</div>
            <div className="text-2xl font-bold text-green-400">{team.diversity_score || 0}/100</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {team.team_members?.slice(0, 5).map((member, idx) => {
            const agent = agents.find(a => a.id === member.agent_id);
            return (
              <Badge key={idx} variant="outline" className="border-white/20 text-white/70">
                {agent?.name || 'Unknown'}
              </Badge>
            );
          })}
          {team.team_members?.length > 5 && (
            <Badge variant="outline" className="border-white/20 text-white/70">
              +{team.team_members.length - 5} more
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QualityCard({ quality, agents }) {
  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Collaboration Quality Assessment</CardTitle>
          <div className="text-3xl font-bold text-green-400">{quality.quality_score}/100</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {quality.participants?.map((pid, idx) => {
            const agent = agents.find(a => a.id === pid);
            return (
              <Badge key={idx} variant="outline" className="border-white/20 text-white/70">
                {agent?.name || 'Unknown'}
              </Badge>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {Object.entries(quality.dimensions || {}).map(([key, value]) => (
            <div key={key} className="p-3 bg-white/5 rounded">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/70 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-white font-medium">{value}/100</span>
              </div>
              <Progress value={value} className="h-1" />
            </div>
          ))}
        </div>

        {quality.strengths?.length > 0 && (
          <div>
            <div className="text-white font-medium mb-2">Strengths</div>
            <div className="space-y-1">
              {quality.strengths.map((strength, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-green-300">
                  <CheckCircle className="w-3 h-3" />
                  {strength}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SessionCard({ session, agents }) {
  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
      <CardHeader>
        <CardTitle className="text-white">{session.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-white/20 text-white/70 capitalize">
            {session.session_type}
          </Badge>
          <Badge className={
            session.status === 'completed' ? 'bg-green-500/20 text-green-400' :
            session.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
            'bg-gray-500/20 text-gray-400'
          }>
            {session.status}
          </Badge>
        </div>

        <div className="text-sm text-white/70">
          {session.participant_agent_ids?.length || 0} participants
        </div>

        {session.productivity_score && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/60">Productivity</span>
              <span className="text-white">{session.productivity_score}/10</span>
            </div>
            <Progress value={session.productivity_score * 10} className="h-2" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-white/60">Decisions: {session.decisions?.length || 0}</div>
          <div className="text-white/60">Actions: {session.action_items?.length || 0}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function FormTeamDialog({ onClose }) {
  const [teamSize, setTeamSize] = useState('5');
  const [skills, setSkills] = useState('');
  const queryClient = useQueryClient();

  const formMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('formOptimalTeam', {
        required_skills: skills.split(',').map(s => s.trim()).filter(s => s),
        team_size: parseInt(teamSize)
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teamFormations']);
      toast.success('Optimal team formed');
      onClose();
    }
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Form Optimal Team with AI</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-white/70 mb-2 block">Team Size</label>
            <Select value={teamSize} onValueChange={setTeamSize}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 members</SelectItem>
                <SelectItem value="5">5 members</SelectItem>
                <SelectItem value="7">7 members</SelectItem>
                <SelectItem value="10">10 members</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-white/70 mb-2 block">
              Required Skills (comma-separated)
            </label>
            <Input
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g., AI, Project Management, Design"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <Button
            onClick={() => formMutation.mutate()}
            disabled={formMutation.isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {formMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
            Generate Team
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TeamDetailDialog({ team, agents, onClose }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{team.team_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-indigo-400 mb-1">{team.ai_team_score}/100</div>
                <div className="text-sm text-white/60">Team Score</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-purple-400 mb-1">
                  {team.skill_coverage?.coverage_percentage}%
                </div>
                <div className="text-sm text-white/60">Skill Coverage</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-green-400 mb-1">{team.diversity_score}/100</div>
                <div className="text-sm text-white/60">Diversity</div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border-indigo-500/30">
            <CardHeader>
              <CardTitle className="text-white">Formation Reasoning</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/80">{team.formation_reasoning}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Team Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {team.team_members?.map((member, idx) => {
                const agent = agents.find(a => a.id === member.agent_id);
                return (
                  <div key={idx} className="p-3 bg-white/5 rounded border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-white font-medium">{agent?.name || 'Unknown'}</div>
                        <div className="text-sm text-white/60">{member.role}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {member.assigned_skills?.map((skill, sidx) => (
                        <Badge key={sidx} variant="outline" className="border-indigo-500/30 text-indigo-300 text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {team.synergy_predictions?.length > 0 && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Synergy Predictions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {team.synergy_predictions.map((pred, idx) => {
                  const agentA = agents.find(a => a.id === pred.agent_a_id);
                  const agentB = agents.find(a => a.id === pred.agent_b_id);
                  return (
                    <div key={idx} className="p-3 bg-white/5 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm">
                          {agentA?.name} ↔ {agentB?.name}
                        </span>
                        <Badge className="bg-green-500/20 text-green-400">
                          {pred.predicted_synergy}/10
                        </Badge>
                      </div>
                      <p className="text-xs text-white/60">{pred.reasoning}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}