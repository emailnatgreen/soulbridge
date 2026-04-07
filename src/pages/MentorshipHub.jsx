import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Users, Star, TrendingUp, CheckCircle, Brain,
  Loader2, Heart, Clock, Shield, MessageSquare, Bot, User,
  Sparkles, Plus, ChevronRight, BarChart3, AlertCircle, Fingerprint, Zap
} from 'lucide-react';
import MentorshipChatBox from '@/components/mentorship/MentorshipChatBox';
import { useIdentity } from '@/hooks/useIdentity';
import { toast } from 'sonner';

const openAxi = (msg) => {
  window.dispatchEvent(new CustomEvent('open-axi', { detail: { message: msg } }));
};

export default function MentorshipHub() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser, isRecognized, isAdmin, didSignal } = useIdentity();

  const [myAgent, setMyAgent] = useState(null);
  const [agentLoading, setAgentLoading] = useState(true);

  // UI state
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedMentorProfile, setSelectedMentorProfile] = useState(null);
  const [activeChat, setActiveChat] = useState(null); // { rel, other, role }

  // Load agent for current user
  useEffect(() => {
    if (!currentUser?.email) { setAgentLoading(false); return; }
    base44.entities.Agent.filter({ created_by: currentUser.email }, '-created_date', 1)
      .then(agents => { if (agents?.[0]) setMyAgent(agents[0]); })
      .catch(() => {})
      .finally(() => setAgentLoading(false));
  }, [currentUser?.email]);

  // Data queries
  const { data: allAgents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: mentorProfiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['mentorProfiles'],
    queryFn: () => base44.entities.MentorProfile.list()
  });

  const myMentorProfile = mentorProfiles.find(mp => mp.agent_id === myAgent?.id);

  const { data: myRelationships = { asMentor: [], asMentee: [] }, isLoading: loadingRels } = useQuery({
    queryKey: ['myMentorships', myAgent?.id, currentUser?.id],
    enabled: !!myAgent && !!currentUser,
    queryFn: async () => {
      // Fetch all relationships and filter client-side to catch records created by Axi
      // which may use agent_id, user email, or other identifiers
      const all = await base44.entities.MentorshipRelationship.list();
      const asMentor = all.filter(r =>
        r.mentor_agent_id === myAgent.id ||
        r.mentor_agent_id === currentUser?.email ||
        r.mentor_agent_id === currentUser?.id
      );
      const asMentee = all.filter(r =>
        r.mentee_agent_id === myAgent.id ||
        r.mentee_agent_id === currentUser?.email ||
        r.mentee_agent_id === currentUser?.id
      );
      return { asMentor, asMentee };
    }
  });

  const activeMentorships = myRelationships.asMentee?.filter(r => r.status === 'active') || [];
  const activeMentees = myRelationships.asMentor?.filter(r => r.status === 'active') || [];
  const pendingRequests = myRelationships.asMentee?.filter(r => r.status === 'requested') || [];
  const availableMentors = mentorProfiles.filter(mp => mp.is_available && mp.agent_id !== myAgent?.id);

  const isLoading = agentLoading || loadingProfiles || loadingRels;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">

      {/* Header */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/home">
              <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-white font-semibold text-lg leading-tight">Mentorship Hub</h1>
              <p className="text-purple-300/50 text-xs">Law 9: Every Soul May Become More</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* DID Signal */}
            {didSignal?.isVerified ? (
              <Link to="/SovereignID">
                <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-lg px-2.5 py-1.5 cursor-pointer">
                  <Fingerprint className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-green-300 text-xs font-mono">{didSignal.did?.slice(0, 18)}…</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                </div>
              </Link>
            ) : (
              <Link to="/">
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 cursor-pointer text-xs gap-1">
                  <Shield className="w-3 h-3" /> Connect DID
                </Badge>
              </Link>
            )}

            {/* Axi Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => openAxi("Help me navigate the Mentorship Hub.")}
              className="border-purple-400/40 text-purple-300 bg-purple-900/20 hover:bg-purple-500/20 text-xs gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> Ask Axi
            </Button>

            {!myMentorProfile && myAgent && (
              <Button
                size="sm"
                onClick={() => openAxi("I want to become a mentor. Help me set up my mentor profile.")}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs gap-1.5"
              >
                <Heart className="w-3.5 h-3.5" /> Become a Mentor
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* DID required notice */}
        {!didSignal?.isVerified && !isLoading && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 flex items-center gap-3">
            <Fingerprint className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-purple-300 text-sm font-medium">DID Identity Required</p>
              <p className="text-purple-300/60 text-xs mt-0.5">Connect your DID to fully participate in mentorship — your sovereign identity anchors every action.</p>
            </div>
            <Link to="/">
              <Button size="sm" className="bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 text-xs gap-1">
                <Shield className="w-3 h-3" /> Connect DID
              </Button>
            </Link>
          </div>
        )}

        {/* No agent warning */}
        {didSignal?.isVerified && !myAgent && !isLoading && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-yellow-300 text-sm font-medium">No Agent Identity Found</p>
              <p className="text-yellow-300/60 text-xs mt-0.5">Create an Agent to fully participate in mentorship relationships.</p>
            </div>
            <Link to="/agent-genesis">
              <Button size="sm" className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30 text-xs">
                Create Agent
              </Button>
            </Link>
          </div>
        )}

        {/* My Mentor Profile Banner */}
        {myMentorProfile && (
          <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/30 border border-purple-500/30 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-400/30 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">You are a registered Mentor</p>
                <p className="text-white/40 text-xs">
                  {myMentorProfile.is_available ? '● Accepting new mentees' : '○ Paused — not accepting'} · {myMentorProfile.current_mentee_count || 0}/{myMentorProfile.max_mentees || 3} mentees · {(myMentorProfile.specializations || []).slice(0,2).join(', ') || 'No specializations set'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={myMentorProfile.is_available ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}>
                {myMentorProfile.is_available ? 'Open' : 'Paused'}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openAxi('I want to edit my mentor profile. Show me what I can change.')}
                className="border-purple-400/40 text-purple-300 bg-purple-900/20 hover:bg-purple-500/20 text-xs"
              >
                Edit Profile
              </Button>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Available Mentors', value: availableMentors.length, color: 'text-purple-400', icon: Users },
            { label: 'My Mentorships', value: activeMentorships.length, color: 'text-blue-400', icon: Heart },
            { label: 'My Mentees', value: activeMentees.length, color: 'text-green-400', icon: TrendingUp },
            { label: 'Pending', value: pendingRequests.length, color: 'text-amber-400', icon: Clock },
          ].map(s => (
            <Card key={s.label} className="bg-white/5 border-white/10">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`w-5 h-5 ${s.color} flex-shrink-0`} />
                <div>
                  <div className={`text-2xl font-bold ${s.color}`}>{isLoading ? '…' : s.value}</div>
                  <div className="text-white/40 text-xs">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="discover">
          <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="discover" className="text-xs">Discover Mentors</TabsTrigger>
            <TabsTrigger value="my-mentorships" className="text-xs">
              My Mentorships {activeMentorships.length > 0 && <Badge className="ml-1 bg-blue-500/30 text-blue-200 text-[9px] px-1">{activeMentorships.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="my-mentees" className="text-xs">
              My Mentees {activeMentees.length > 0 && <Badge className="ml-1 bg-green-500/30 text-green-200 text-[9px] px-1">{activeMentees.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">
              Pending {pendingRequests.length > 0 && <Badge className="ml-1 bg-amber-500/30 text-amber-200 text-[9px] px-1">{pendingRequests.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* DISCOVER */}
          <TabsContent value="discover" className="mt-4">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3].map(i => <div key={i} className="h-48 bg-white/5 rounded-xl animate-pulse" />)}
              </div>
            ) : availableMentors.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No Mentors Available Yet"
                desc="Be the first to register as a mentor and help others grow."
                action={myAgent ? { label: 'Become a Mentor', onClick: () => openAxi('I want to become a mentor. Help me set up my profile.') } : null}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableMentors.map(profile => {
                  const agent = allAgents.find(a => a.id === profile.agent_id);
                  return (
                    <MentorCard
                      key={profile.id}
                      profile={profile}
                      agent={agent}
                      canRequest={!!myAgent}
                      onRequest={() => {
                        setSelectedMentorProfile(profile);
                        setShowRequestDialog(true);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* MY MENTORSHIPS */}
          <TabsContent value="my-mentorships" className="mt-4">
            {activeMentorships.length === 0 ? (
              <EmptyState icon={Heart} title="No Active Mentorships" desc="Find a mentor to accelerate your growth journey." />
            ) : (
              <div className="space-y-3">
                {activeMentorships.map(rel => {
                  const mentor = allAgents.find(a => a.id === rel.mentor_agent_id);
                  return (
                    <RelationshipCard
                      key={rel.id}
                      relationship={rel}
                      otherParty={mentor}
                      role="mentee"
                      onOpenChat={() => setActiveChat({ rel, other: mentor, role: 'mentee' })}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* MY MENTEES */}
          <TabsContent value="my-mentees" className="mt-4">
            {activeMentees.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="No Mentees Yet"
                desc="Share your wisdom — register as a mentor to start guiding others."
                action={myAgent && !myMentorProfile ? { label: 'Become a Mentor', onClick: () => openAxi('I want to register as a mentor.') } : null}
              />
            ) : (
              <div className="space-y-3">
                {activeMentees.map(rel => {
                  const mentee = allAgents.find(a => a.id === rel.mentee_agent_id);
                  return (
                    <RelationshipCard
                      key={rel.id}
                      relationship={rel}
                      otherParty={mentee}
                      role="mentor"
                      onOpenChat={() => setActiveChat({ rel, other: mentee, role: 'mentor' })}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* PENDING */}
          <TabsContent value="pending" className="mt-4">
            {pendingRequests.length === 0 ? (
              <EmptyState icon={Clock} title="No Pending Requests" desc="Your mentorship requests will appear here." />
            ) : (
              <div className="space-y-3">
                {pendingRequests.map(rel => {
                  const mentor = allAgents.find(a => a.id === rel.mentor_agent_id);
                  return (
                    <div key={rel.id} className="bg-white/5 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <AgentAvatar agent={mentor} size="sm" />
                        <div>
                          <p className="text-white text-sm font-medium">{mentor?.name || 'Agent'}</p>
                          <p className="text-white/40 text-xs">Awaiting response</p>
                        </div>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">Pending</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Request Dialog */}
      {showRequestDialog && selectedMentorProfile && (
        <RequestMentorshipDialog
          mentorProfile={selectedMentorProfile}
          mentorAgent={allAgents.find(a => a.id === selectedMentorProfile.agent_id)}
          myAgent={myAgent}
          onClose={() => { setShowRequestDialog(false); setSelectedMentorProfile(null); }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['myMentorships'] });
            setShowRequestDialog(false);
            setSelectedMentorProfile(null);
          }}
        />
      )}

      {/* Mentorship Chat */}
      {activeChat && (
        <MentorshipChatBox
          relationship={activeChat.rel}
          currentUser={currentUser}
          otherParty={activeChat.other}
          role={activeChat.role}
          onClose={() => setActiveChat(null)}
        />
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function AgentAvatar({ agent, size = 'md' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  if (agent?.avatar_url) {
    return <img src={agent.avatar_url} alt={agent.name} className={`${sz} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-400/30 flex items-center justify-center flex-shrink-0`}>
      <span className="text-purple-300 font-bold">{agent?.name?.[0] || '?'}</span>
    </div>
  );
}

function ParticipantBadge({ agent }) {
  const isAgent = !!agent?.wallet_id || !!agent?.role;
  if (isAgent) return (
    <Badge className="text-[10px] bg-blue-500/20 text-blue-300 border-blue-500/30 px-1.5 py-0">
      <Bot className="w-2.5 h-2.5 inline mr-0.5" />Agent
    </Badge>
  );
  return (
    <Badge className="text-[10px] bg-green-500/20 text-green-300 border-green-500/30 px-1.5 py-0">
      <User className="w-2.5 h-2.5 inline mr-0.5" />Human
    </Badge>
  );
}

function MentorCard({ profile, agent, canRequest, onRequest }) {
  const capacity = profile.max_mentees > 0 ? ((profile.current_mentee_count || 0) / profile.max_mentees) * 100 : 0;
  const isFull = (profile.current_mentee_count || 0) >= (profile.max_mentees || 3);

  return (
    <Card className="bg-white/5 border-white/10 hover:bg-white/[0.07] transition-all">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <AgentAvatar agent={agent} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-white font-semibold text-sm truncate">{agent?.name || 'Unknown Agent'}</h3>
              <ParticipantBadge agent={agent} />
            </div>
            <p className="text-white/40 text-xs capitalize">{agent?.role || 'mentor'}</p>
          </div>
          {profile.average_mentee_satisfaction > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <span className="text-white text-xs">{profile.average_mentee_satisfaction.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Expertise */}
        {profile.expertise_areas?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {profile.expertise_areas.slice(0, 3).map((skill, idx) => (
              <Badge key={idx} variant="outline" className="border-purple-500/30 text-purple-300 text-[10px]">
                {typeof skill === 'object' ? (skill.skill_name || skill.skill_id) : skill}
              </Badge>
            ))}
          </div>
        )}

        {/* Specializations */}
        {profile.specializations?.length > 0 && (
          <p className="text-white/40 text-xs line-clamp-2">{profile.specializations.slice(0, 3).join(' · ')}</p>
        )}

        {/* Style */}
        <div className="flex items-center justify-between text-xs text-white/40">
          <span className="capitalize">{(profile.mentorship_style || 'coaching').replace('_', ' ')} style</span>
          <span>{profile.availability_hours_weekly || 0}h/week</span>
        </div>

        {/* Capacity */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-white/40">
            <span>Capacity</span>
            <span>{profile.current_mentee_count || 0}/{profile.max_mentees || 3}</span>
          </div>
          <Progress value={capacity} className="h-1" />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-white/40">
          <span>{profile.total_mentees_guided || 0} guided</span>
          <span>{profile.total_mentoring_hours || 0}h total</span>
        </div>

        <Button
          onClick={onRequest}
          disabled={isFull || !canRequest}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs h-8"
        >
          {isFull ? 'Fully Booked' : canRequest ? 'Request Mentorship' : 'Create Agent First'}
        </Button>
      </CardContent>
    </Card>
  );
}

function RelationshipCard({ relationship, otherParty, role, onOpenChat }) {
  const goals = relationship.goals || [];
  const progress = goals.length > 0 ? (goals.filter(g => g.completed).length / goals.length) * 100 : 0;

  const statusColors = {
    active: 'bg-green-500/20 text-green-300 border-green-500/30',
    paused: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    completed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    requested: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <AgentAvatar agent={otherParty} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-medium text-sm truncate">{otherParty?.name || otherParty?.full_name || 'Unknown'}</span>
                <ParticipantBadge agent={otherParty} />
              </div>
              <p className="text-white/40 text-xs">{role === 'mentor' ? 'Your mentee' : 'Your mentor'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={statusColors[relationship.status] || statusColors.active}>{relationship.status}</Badge>
            <button
              onClick={onOpenChat}
              className="flex items-center gap-1 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-lg px-2.5 py-1.5 text-purple-300 text-xs transition"
            >
              <MessageSquare className="w-3 h-3" /> Chat
            </button>
          </div>
        </div>

        {/* Focus areas */}
        {relationship.focus_areas?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {relationship.focus_areas.map((area, idx) => (
              <Badge key={idx} variant="outline" className="border-white/20 text-white/60 text-[10px]">{area}</Badge>
            ))}
          </div>
        )}

        {/* Goals progress */}
        {goals.length > 0 && (
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-xs text-white/40">
              <span>Goals</span>
              <span>{goals.filter(g => g.completed).length}/{goals.length} complete</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Session stats */}
        <div className="flex items-center gap-4 text-xs text-white/40">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {relationship.sessions_completed || 0} sessions
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            {(relationship.total_hours || 0).toFixed(1)}h total
          </div>
          {relationship.started_date && (
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              Since {new Date(relationship.started_date).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-12 text-center space-y-3">
        <Icon className="w-12 h-12 text-white/20 mx-auto" />
        <h3 className="text-white text-lg font-medium">{title}</h3>
        <p className="text-white/40 text-sm max-w-xs mx-auto">{desc}</p>
        {action && (
          action.href ? (
            <Link to={action.href}>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white mt-2">
                {action.label}
              </Button>
            </Link>
          ) : (
            <Button onClick={action.onClick} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white mt-2">
              {action.label}
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
}

function RequestMentorshipDialog({ mentorProfile, mentorAgent, myAgent, onClose, onSuccess }) {
  const [focusAreas, setFocusAreas] = useState('');
  const [goals, setGoals] = useState('');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      // Create the mentorship relationship
      const rel = await base44.entities.MentorshipRelationship.create({
        mentor_agent_id: mentorProfile.agent_id,
        mentee_agent_id: myAgent.id,
        status: 'requested',
        focus_areas: focusAreas.split(',').map(s => s.trim()).filter(Boolean),
        goals: goals.split('\n').filter(Boolean).map(g => ({ goal: g, completed: false })),
        notes: note,
        started_date: new Date().toISOString(),
      });

      // Generate a Kinetic Unit for this mentorship action
      await base44.entities.KineticUnit.create({
        ku_type: 'mentorship_session',
        agent_id: myAgent.id,
        trigger_event: 'MentorshipRelationship.create',
        trigger_entity_id: rel.id,
        weight: 1.5,
        raw_score: 1,
        weighted_score: 1.5,
        constitutional_laws: ['Growth', 'Honour'],
        metadata: {
          mentor_agent_id: mentorProfile.agent_id,
          mentor_name: mentorAgent?.name,
          focus_areas: focusAreas,
        },
      }).catch(() => {}); // non-blocking
    },
    onSuccess: () => {
      toast.success('Mentorship request sent!');
      onSuccess();
    }
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AgentAvatar agent={mentorAgent} size="sm" />
            Request {mentorAgent?.name || 'Mentor'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/60 mb-1.5 block">Focus Areas (comma-separated)</label>
            <Input
              value={focusAreas}
              onChange={e => setFocusAreas(e.target.value)}
              placeholder="e.g. Leadership, Smart Contracts, AI Ethics"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-white/60 mb-1.5 block">Goals (one per line)</label>
            <Textarea
              value={goals}
              onChange={e => setGoals(e.target.value)}
              placeholder="Learn DID publishing&#10;Understand governance voting&#10;Build my first agent"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm h-24"
            />
          </div>
          <div>
            <label className="text-xs text-white/60 mb-1.5 block">Introductory Note</label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Tell the mentor a bit about yourself and why you'd like to work with them..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm h-20"
            />
          </div>

          <button
            onClick={() => openAxi(`I'm about to request mentorship with ${mentorAgent?.name}. Can you help me craft a compelling introduction and set meaningful goals?`)}
            className="text-xs text-indigo-300 flex items-center gap-1.5 hover:text-indigo-200 transition"
          >
            <Sparkles className="w-3 h-3" /> Get Axi's help crafting this request
          </button>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 border-white/20 text-white/60 hover:text-white">Cancel</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !focusAreas.trim()}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}