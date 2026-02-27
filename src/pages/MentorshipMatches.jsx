import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Heart, Check, X, Loader2, CalendarDays, Target } from 'lucide-react';
import MentorshipProposalCard from '@/components/MentorshipProposalCard';
import BookSessionModal from '@/components/BookSessionModal';
import SessionsList from '@/components/SessionsList';
import GoalSetterModal from '@/components/mentorship/GoalSetterModal';

export default function MentorshipMatches() {
  const queryClient = useQueryClient();
  const [userAgent, setUserAgent] = useState(null);

  // Get current user's agent
  const { data: agents, isLoading: loadingAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (!user) return [];
      const allAgents = await base44.entities.Agent.list();
      const userAgent = allAgents.find(a => a.created_by === user.email);
      if (userAgent) setUserAgent(userAgent);
      return allAgents;
    }
  });

  // Get pending mentorship relationships for current user
  const { data: pendingRelationships = [], isLoading: loadingRelationships } = useQuery({
    queryKey: ['pendingMentorships', userAgent?.id],
    queryFn: async () => {
      if (!userAgent) return [];
      
      // Get relationships where user is mentor or mentee with 'requested' status
      const asMentor = await base44.entities.MentorshipRelationship.filter({
        mentor_agent_id: userAgent.id,
        status: 'requested'
      });
      
      const asMentee = await base44.entities.MentorshipRelationship.filter({
        mentee_agent_id: userAgent.id,
        status: 'requested'
      });

      return [...asMentor, ...asMentee];
    },
    enabled: !!userAgent
  });

  // Get active mentorship relationships
  const { data: activeRelationships = [] } = useQuery({
    queryKey: ['activeMentorships', userAgent?.id],
    queryFn: async () => {
      if (!userAgent) return [];
      
      const asMentor = await base44.entities.MentorshipRelationship.filter({
        mentor_agent_id: userAgent.id,
        status: 'active'
      });
      
      const asMentee = await base44.entities.MentorshipRelationship.filter({
        mentee_agent_id: userAgent.id,
        status: 'active'
      });

      return [...asMentor, ...asMentee];
    },
    enabled: !!userAgent
  });

  // Accept relationship mutation
  const acceptMutation = useMutation({
    mutationFn: async (relationshipId) => {
      return base44.entities.MentorshipRelationship.update(relationshipId, {
        status: 'active',
        started_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingMentorships'] });
      queryClient.invalidateQueries({ queryKey: ['activeMentorships'] });
    }
  });

  // Decline relationship mutation
  const declineMutation = useMutation({
    mutationFn: async (relationshipId) => {
      return base44.entities.MentorshipRelationship.update(relationshipId, {
        status: 'declined'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingMentorships'] });
    }
  });

  // Fetch agent details
  const fetchAgent = async (agentId) => {
    try {
      return await base44.entities.Agent.read(agentId);
    } catch {
      return null;
    }
  };

  if (loadingAgents) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!userAgent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <Card className="max-w-md mx-auto mt-10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              No Agent Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              You need to create or be associated with an Agent to participate in mentorships.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Mentorship Matches</h1>
          <p className="text-slate-600">
            Discover guided learning paths and meaningful mentor-mentee connections tailored to your growth.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="pending">
              Pending ({pendingRelationships.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({activeRelationships.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Matches Tab */}
          <TabsContent value="pending" className="space-y-4 mt-6">
            {loadingRelationships ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : pendingRelationships.length === 0 ? (
              <Card>
                <CardContent className="pt-8 text-center">
                  <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">No pending mentorship matches yet.</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Run the mentorship matching algorithm to discover your ideal matches.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingRelationships.map(async (relationship) => {
                  const otherAgentId = relationship.mentor_agent_id === userAgent.id
                    ? relationship.mentee_agent_id
                    : relationship.mentor_agent_id;
                  const isMentor = relationship.mentor_agent_id === userAgent.id;

                  return (
                    <PendingProposalWrapper
                      key={relationship.id}
                      relationship={relationship}
                      otherAgentId={otherAgentId}
                      isMentor={isMentor}
                      onAccept={() => acceptMutation.mutate(relationship.id)}
                      onDecline={() => declineMutation.mutate(relationship.id)}
                      isLoading={acceptMutation.isPending || declineMutation.isPending}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Active Matches Tab */}
          <TabsContent value="active" className="space-y-4 mt-6">
            {activeRelationships.length === 0 ? (
              <Card>
                <CardContent className="pt-8 text-center">
                  <Check className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">No active mentorships yet.</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Accept a pending mentorship invitation to begin your learning journey.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {activeRelationships.map((relationship) => (
                  <ActiveMentorshipCard
                    key={relationship.id}
                    relationship={relationship}
                    userAgent={userAgent}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Async wrapper to load agent details
function PendingProposalWrapper({
  relationship,
  otherAgentId,
  isMentor,
  onAccept,
  onDecline,
  isLoading
}) {
  const { data: otherAgent } = useQuery({
    queryKey: ['agent', otherAgentId],
    queryFn: () => base44.entities.Agent.read(otherAgentId)
  });

  return (
    <MentorshipProposalCard
      relationship={relationship}
      otherAgent={otherAgent}
      isMentor={isMentor}
      onAccept={onAccept}
      onDecline={onDecline}
      isLoading={isLoading}
    />
  );
}

// Active mentorship display card
function ActiveMentorshipCard({ relationship, userAgent }) {
  const isMentor = relationship.mentor_agent_id === userAgent.id;
  const otherAgentId = isMentor ? relationship.mentee_agent_id : relationship.mentor_agent_id;
  const [showBooking, setShowBooking] = useState(false);
  const [showGoals, setShowGoals] = useState(false);

  const { data: otherAgent } = useQuery({
    queryKey: ['agent', otherAgentId],
    queryFn: () => base44.entities.Agent.read(otherAgentId)
  });

  const mentorAgent = isMentor ? userAgent : otherAgent;
  const menteeAgent = isMentor ? otherAgent : userAgent;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>
                {isMentor ? 'Mentee' : 'Mentor'}: {otherAgent?.name || 'Loading...'}
              </CardTitle>
              <CardDescription>
                Active since {relationship.started_date ? new Date(relationship.started_date).toLocaleDateString() : '—'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">Active</Badge>
              {!isMentor && (
                <Button size="sm" onClick={() => setShowBooking(true)}>
                  <CalendarDays className="w-4 h-4 mr-1" />
                  Book Session
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {relationship.focus_areas && relationship.focus_areas.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Focus Areas</h4>
              <div className="flex flex-wrap gap-2">
                {relationship.focus_areas.map((area, idx) => (
                  <Badge key={idx} variant="secondary">{area}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 pt-2 border-t">
            <div>
              <div className="text-xs text-slate-600">Sessions</div>
              <div className="text-lg font-semibold">{relationship.sessions_completed || 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-600">Hours</div>
              <div className="text-lg font-semibold">{relationship.total_hours || 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-600">Satisfaction</div>
              <div className="text-lg font-semibold">
                {isMentor ? relationship.mentor_satisfaction || '—' : relationship.mentee_satisfaction || '—'}
                {(isMentor ? relationship.mentor_satisfaction : relationship.mentee_satisfaction) && <span className="text-xs">/5</span>}
              </div>
            </div>
          </div>

          {/* Sessions list */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Sessions</h4>
            <SessionsList relationship={relationship} isMentor={isMentor} />
          </div>
        </CardContent>
      </Card>

      <BookSessionModal
        open={showBooking}
        onClose={() => setShowBooking(false)}
        relationship={relationship}
        mentorAgent={mentorAgent}
        menteeAgent={menteeAgent}
      />
    </>
  );
}