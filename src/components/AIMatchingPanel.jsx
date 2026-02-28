import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Sparkles, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import MentorMatchCard from '@/components/MentorMatchCard';
import { toast } from 'sonner';

export default function AIMatchingPanel({ agents = [], currentAgentId, stagnationAlerts = [] }) {
  const [selectedAgentId, setSelectedAgentId] = useState(currentAgentId || '');
  const [matches, setMatches] = useState(null);
  const [acceptedIds, setAcceptedIds] = useState(new Set());
  const queryClient = useQueryClient();

  const stagnantAgentIds = new Set(stagnationAlerts.map(a => a.agent_id));
  const hasStagnation = selectedAgentId && stagnantAgentIds.has(selectedAgentId);

  const matchMutation = useMutation({
    mutationFn: async (agentId) => {
      const res = await base44.functions.invoke('aiMentorshipMatching', {
        menteeAgentId: agentId,
        limit: 5
      });
      return res.data;
    },
    onSuccess: (data) => {
      setMatches(data);
      setAcceptedIds(new Set());
      if (!data?.matches?.length) {
        toast.info('No mentor matches found — ensure mentor profiles are confirmed and available.');
      } else {
        toast.success(`Found ${data.matches.length} AI-matched mentor${data.matches.length > 1 ? 's' : ''}!`);
      }
    },
    onError: (err) => toast.error(`Matching failed: ${err.message}`)
  });

  const acceptMutation = useMutation({
    mutationFn: (relationshipId) => base44.entities.MentorshipRelationship.update(relationshipId, {
      status: 'active',
      started_date: new Date().toISOString()
    }),
    onSuccess: (_, relationshipId) => {
      setAcceptedIds(prev => new Set([...prev, relationshipId]));
      queryClient.invalidateQueries(['activeMentorships']);
      queryClient.invalidateQueries(['pendingMentorships']);
      toast.success('Mentorship activated!');
    }
  });

  const declineMutation = useMutation({
    mutationFn: (relationshipId) => base44.entities.MentorshipRelationship.update(relationshipId, {
      status: 'declined'
    }),
    onSuccess: (_, relationshipId) => {
      setMatches(prev => ({
        ...prev,
        matches: prev.matches.filter(m => m.relationshipId !== relationshipId)
      }));
    }
  });

  return (
    <div className="space-y-6">
      {/* Control panel */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            AI Mentor Matching
          </CardTitle>
          <p className="text-white/50 text-sm">
            Axi analyses skills, performance, validated credentials, learning style, and growth velocity to find your ideal mentor.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white flex-1">
                <SelectValue placeholder="Select agent to match..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                {agents.map(a => (
                  <SelectItem key={a.id} value={a.id} className="text-white">
                    <span className="flex items-center gap-2">
                      {a.name}
                      {stagnantAgentIds.has(a.id) && (
                        <AlertTriangle className="w-3 h-3 text-orange-400" />
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => matchMutation.mutate(selectedAgentId)}
              disabled={!selectedAgentId || matchMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 sm:w-auto"
            >
              {matchMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Matching...</>
                : <><Sparkles className="w-4 h-4 mr-2" />Find Matches</>
              }
            </Button>
          </div>

          {/* Stagnation warning */}
          {hasStagnation && (
            <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-orange-300 text-sm font-medium">Stagnation Alert Active</p>
                <p className="text-white/60 text-xs mt-0.5">
                  This agent has a mentorship stagnation alert. A re-match is recommended to address unresolved skill gaps with a more compatible mentor.
                </p>
              </div>
            </div>
          )}

          {/* Insights from last match */}
          {matches && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-white/10">
              {matches.learningStyle && (
                <Badge className="bg-cyan-500/20 text-cyan-300 text-xs">
                  Learning: {matches.learningStyle}
                </Badge>
              )}
              {matches.growthVelocity && (
                <Badge className="bg-purple-500/20 text-purple-300 text-xs">
                  Velocity: {matches.growthVelocity}
                </Badge>
              )}
              {matches.recommendedFocus && (
                <Badge className="bg-yellow-500/20 text-yellow-300 text-xs">
                  Focus: {matches.recommendedFocus}
                </Badge>
              )}
              {matches.urgentDeclines?.length > 0 && (
                <Badge className="bg-red-500/20 text-red-300 text-xs">
                  ⚠ Declining: {matches.urgentDeclines.join(', ')}
                </Badge>
              )}
              {matches.growthInsightsUsed && (
                <Badge className="bg-green-500/20 text-green-300 text-xs">
                  Growth insights applied
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Match results */}
      {matchMutation.isPending && (
        <div className="text-center py-12">
          <Brain className="w-12 h-12 text-purple-400 mx-auto mb-3 animate-pulse" />
          <p className="text-white/60">Axi is analysing skills, performance data, and mentor effectiveness...</p>
          <p className="text-white/30 text-sm mt-1">This may take a moment</p>
        </div>
      )}

      {matches && !matchMutation.isPending && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium">
              {matches.matches?.length || 0} Mentor Match{(matches.matches?.length || 0) !== 1 ? 'es' : ''} Found
            </h3>
            <Button
              size="sm"
              variant="ghost"
              className="text-white/40 hover:text-white"
              onClick={() => matchMutation.mutate(selectedAgentId)}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Re-run
            </Button>
          </div>

          {matches.matches?.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="text-center py-12">
                <p className="text-white/60">No available mentors found with sufficient expertise alignment.</p>
                <p className="text-white/30 text-sm mt-1">Ensure mentor profiles are confirmed and available, or broaden skill categories.</p>
              </CardContent>
            </Card>
          ) : (
            matches.matches.map((match) => (
              <MentorMatchCard
                key={match.relationshipId}
                match={{
                  ...match,
                  focusAreas: matches.focusAreas,
                  isReMatch: hasStagnation
                }}
                menteeAgentId={selectedAgentId}
                isAccepted={acceptedIds.has(match.relationshipId)}
                onAccept={() => acceptMutation.mutate(match.relationshipId)}
                onDecline={() => declineMutation.mutate(match.relationshipId)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}