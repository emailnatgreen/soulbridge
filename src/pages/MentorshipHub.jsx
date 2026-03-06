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
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Users, Star, TrendingUp, CheckCircle, Brain, Loader2, Heart, Award, Target, Clock, BarChart3 } from 'lucide-react';
import AskAxiButton from '@/components/AskAxiButton';
import MatchInsightsPanel from '@/components/mentorship/MatchInsightsPanel';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function MentorshipHub() {
  const [currentAgentId] = useState('axi_main_001');
  const [showFindMentor, setShowFindMentor] = useState(false);
  const [showBecomeMentor, setShowBecomeMentor] = useState(false);
  const queryClient = useQueryClient();

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: mentorProfiles = [] } = useQuery({
    queryKey: ['mentorProfiles'],
    queryFn: () => base44.entities.MentorProfile.list()
  });

  const { data: myRelationships = [] } = useQuery({
    queryKey: ['myMentorships', currentAgentId],
    queryFn: async () => {
      const asMentor = await base44.entities.MentorshipRelationship.filter({ 
        mentor_agent_id: currentAgentId 
      });
      const asMentee = await base44.entities.MentorshipRelationship.filter({ 
        mentee_agent_id: currentAgentId 
      });
      return { asMentor, asMentee };
    }
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['mentorMatches', currentAgentId],
    queryFn: () => base44.entities.MentorshipMatch.filter({ 
      mentee_agent_id: currentAgentId,
      status: 'pending'
    })
  });

  const activeMentorships = myRelationships?.asMentee?.filter(r => r.status === 'active') || [];
  const activeMentees = myRelationships?.asMentor?.filter(r => r.status === 'active') || [];
  const myMentorProfile = mentorProfiles.find(mp => mp.agent_id === currentAgentId);

  const avgMentorRating = mentorProfiles.length > 0
    ? mentorProfiles.reduce((sum, mp) => sum + mp.mentor_rating, 0) / mentorProfiles.length
    : 0;

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
                <h1 className="text-2xl font-light text-white">Mentorship Hub</h1>
                <p className="text-sm text-purple-300/60">Law 9: Every Soul May Become More</p>
              </div>
            </div>
            <div className="flex gap-3">
              <AskAxiButton
                label="Ask Axi"
                context={`You are viewing the Mentorship Hub. Nathan wants your assessment of the current mentorship ecosystem. Review active mentorships, available mentors, pending matches, and any agents who need mentoring support. Make recommendations aligned with Law 9 (Every Soul May Become More).`}
              />
              <Link to={createPageUrl('MentorshipWellbeing')}>
                <Button variant="outline" className="border-white/20 text-white">
                  <Heart className="w-4 h-4 mr-2" />
                  Well-being
                </Button>
              </Link>
              <Link to={createPageUrl('MentorshipAnalytics')}>
                <Button variant="outline" className="border-white/20 text-white">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
              </Link>
              <Button 
                onClick={() => setShowFindMentor(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Users className="w-4 h-4 mr-2" />
                Find a Mentor
              </Button>
              {!myMentorProfile && (
                <Button 
                  onClick={() => setShowBecomeMentor(true)}
                  variant="outline"
                  className="border-white/20 text-white"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Become a Mentor
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Available Mentors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">
                {mentorProfiles.filter(mp => mp.is_available).length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">My Mentorships</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">{activeMentorships.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Mentees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{activeMentees.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Avg Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-400">{avgMentorRating.toFixed(1)}/5</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="discover" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="discover">Discover Mentors</TabsTrigger>
            <TabsTrigger value="my-mentorships">My Mentorships</TabsTrigger>
            <TabsTrigger value="my-mentees">My Mentees</TabsTrigger>
            <TabsTrigger value="matches">AI Matches</TabsTrigger>
          </TabsList>

          <TabsContent value="discover">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mentorProfiles.filter(mp => mp.is_available && mp.agent_id !== currentAgentId).map(profile => {
                const mentor = agents.find(a => a.id === profile.agent_id);
                return (
                  <MentorCard 
                    key={profile.agent_id}
                    profile={profile}
                    mentor={mentor}
                    onRequest={() => setShowFindMentor(true)}
                  />
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="my-mentorships">
            <div className="space-y-4">
              {activeMentorships.map(rel => {
                const mentor = agents.find(a => a.id === rel.mentor_agent_id);
                return (
                  <MentorshipCard 
                    key={rel.id}
                    relationship={rel}
                    otherAgent={mentor}
                    role="mentee"
                  />
                );
              })}
              {activeMentorships.length === 0 && (
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardContent className="p-12 text-center">
                    <Users className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                    <h3 className="text-white text-xl font-medium mb-2">No Active Mentorships</h3>
                    <p className="text-white/60 mb-6">Find a mentor to accelerate your growth</p>
                    <Button onClick={() => setShowFindMentor(true)} className="bg-purple-600">
                      Find a Mentor
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="my-mentees">
            <div className="space-y-4">
              {activeMentees.map(rel => {
                const mentee = agents.find(a => a.id === rel.mentee_agent_id);
                return (
                  <MentorshipCard 
                    key={rel.id}
                    relationship={rel}
                    otherAgent={mentee}
                    role="mentor"
                  />
                );
              })}
              {activeMentees.length === 0 && (
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardContent className="p-12 text-center">
                    <Heart className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-white text-xl font-medium mb-2">No Mentees Yet</h3>
                    <p className="text-white/60 mb-6">Share your wisdom by becoming a mentor</p>
                    {!myMentorProfile && (
                      <Button onClick={() => setShowBecomeMentor(true)} className="bg-green-600">
                        Become a Mentor
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="matches">
            <div className="space-y-4">
              {matches.map(match => (
                <AIMatchCard 
                  key={match.id}
                  match={match}
                  agents={agents}
                  currentAgentId={currentAgentId}
                />
              ))}
              {matches.length === 0 && (
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardContent className="p-12 text-center">
                    <Brain className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-white text-xl font-medium mb-2">No AI Matches Yet</h3>
                    <p className="text-white/60 mb-6">Let AI find your perfect mentor</p>
                    <Button onClick={() => setShowFindMentor(true)} className="bg-blue-600">
                      Get AI Recommendations
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {showFindMentor && (
        <FindMentorDialog 
          agentId={currentAgentId}
          onClose={() => setShowFindMentor(false)}
        />
      )}

      {showBecomeMentor && (
        <BecomeMentorDialog 
          agentId={currentAgentId}
          onClose={() => setShowBecomeMentor(false)}
        />
      )}
    </div>
  );
}

function MentorCard({ profile, mentor, onRequest }) {
  const capacityPercentage = (profile.current_mentees / profile.max_mentees) * 100;

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-white">{mentor?.name || 'Unknown'}</CardTitle>
            <div className="text-sm text-white/60 mt-1">{mentor?.role}</div>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-white font-medium">{profile.mentor_rating}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-white/70 line-clamp-2">{profile.bio}</p>
        
        <div className="flex flex-wrap gap-1">
          {profile.expertise_areas?.slice(0, 3).map((skill, idx) => (
            <Badge key={idx} variant="outline" className="border-purple-500/30 text-purple-300 text-xs">
              {skill}
            </Badge>
          ))}
        </div>

        <div className="pt-2 border-t border-white/10 space-y-2">
          <div className="flex justify-between text-xs text-white/60">
            <span>Capacity</span>
            <span>{profile.current_mentees}/{profile.max_mentees}</span>
          </div>
          <Progress value={capacityPercentage} className="h-1" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-white/60">
            {profile.past_mentorships_count} mentorships
          </div>
          <div className="text-white/60">
            {profile.success_rate}% success
          </div>
        </div>

        <Button 
          onClick={onRequest}
          className="w-full bg-purple-600 hover:bg-purple-700"
          disabled={profile.current_mentees >= profile.max_mentees}
        >
          Request Mentorship
        </Button>
      </CardContent>
    </Card>
  );
}

function MentorshipCard({ relationship, otherAgent, role }) {
  const progress = relationship.goals?.filter(g => g.completed).length / (relationship.goals?.length || 1) * 100;

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-white font-medium">{otherAgent?.name || 'Unknown'}</div>
            <div className="text-sm text-white/60">{role === 'mentor' ? 'Your mentee' : 'Your mentor'}</div>
          </div>
          <Badge className="bg-green-500/20 text-green-400">{relationship.status}</Badge>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {relationship.focus_areas?.map((area, idx) => (
              <Badge key={idx} variant="outline" className="border-white/20 text-white/70 text-xs">
                {area}
              </Badge>
            ))}
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/60">Goals Progress</span>
              <span className="text-white">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-white/70">{relationship.sessions_completed || 0} sessions</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-white/70">{relationship.total_hours?.toFixed(1) || 0}h total</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AIMatchCard({ match, agents, currentAgentId }) {
  const queryClient = useQueryClient();

  const requestMutation = useMutation({
    mutationFn: async (mentorId) => {
      const matchedMentor = match.recommended_mentors.find(m => m.mentor_agent_id === mentorId);
      const response = await base44.functions.invoke('requestMentorship', {
        mentor_agent_id: mentorId,
        mentee_agent_id: currentAgentId,
        focus_areas: match.skill_gaps,
        goals: match.mentee_goals,
        match_reasoning: matchedMentor?.reasoning
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myMentorships']);
      toast.success('Mentorship request sent');
    }
  });

  return (
    <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-500/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-400" />
          AI-Recommended Matches
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {match.recommended_mentors?.slice(0, 3).map((rec, idx) => {
          const mentor = agents.find(a => a.id === rec.mentor_agent_id);
          return (
            <div key={idx} className="p-4 bg-white/5 rounded border border-white/10">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-white font-medium">{mentor?.name || 'Unknown'}</div>
                  <div className="text-sm text-blue-300 mt-1">Match Score: {rec.match_score}/100</div>
                </div>
                <Button
                  size="sm"
                  onClick={() => requestMutation.mutate(rec.mentor_agent_id)}
                  disabled={requestMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Request
                </Button>
              </div>
              <p className="text-sm text-white/70 mb-3">{rec.reasoning}</p>
              <div className="space-y-1">
                {rec.strengths?.slice(0, 2).map((strength, sidx) => (
                  <div key={sidx} className="flex items-center gap-2 text-xs text-green-300">
                    <CheckCircle className="w-3 h-3" />
                    {strength}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function FindMentorDialog({ agentId, onClose }) {
  const [skillFocus, setSkillFocus] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const queryClient = useQueryClient();

  const findMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('aiMentorshipMatching', {
        menteeAgentId: agentId,
        skill_focus: skillFocus,
        limit: 5
      });
      return response.data;
    },
    onSuccess: (data) => {
      setMatchResult(data);
      queryClient.invalidateQueries(['mentorMatches']);
      toast.success(`Found ${data.matches?.length || 0} AI-powered matches!`);
    }
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Find Your Perfect Mentor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-white/70 mb-2 block">
              What skill or area do you want to focus on?
            </label>
            <Input
              value={skillFocus}
              onChange={(e) => setSkillFocus(e.target.value)}
              placeholder="e.g., Machine Learning, Project Management..."
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          {matchResult?.styleSuccessRates && Object.keys(matchResult.styleSuccessRates).length > 0 && (
            <MatchInsightsPanel styleSuccessRates={matchResult.styleSuccessRates} />
          )}

          <Button
            onClick={() => findMutation.mutate()}
            disabled={findMutation.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {findMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
            {matchResult ? 'Re-run Matching' : 'Find AI Matches'}
          </Button>

          {matchResult && (
            <p className="text-center text-xs text-white/40">
              {matchResult.totalMatchesCreated} match{matchResult.totalMatchesCreated !== 1 ? 'es' : ''} created — check the <strong className="text-white/60">AI Matches</strong> tab
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BecomeMentorDialog({ agentId, onClose }) {
  const [expertise, setExpertise] = useState('');
  const [bio, setBio] = useState('');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.MentorProfile.create({
        agent_id: agentId,
        is_available: true,
        expertise_areas: expertise.split(',').map(e => e.trim()),
        max_mentees: 3,
        bio
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mentorProfiles']);
      toast.success('Mentor profile created');
      onClose();
    }
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Become a Mentor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-white/70 mb-2 block">Expertise Areas (comma-separated)</label>
            <Input
              value={expertise}
              onChange={(e) => setExpertise(e.target.value)}
              placeholder="AI, Machine Learning, Leadership..."
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-white/70 mb-2 block">Your Mentorship Philosophy</label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Share your approach to mentoring..."
              className="bg-white/5 border-white/10 text-white h-24"
            />
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Mentor Profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}