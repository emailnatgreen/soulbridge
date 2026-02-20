import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, Loader2, CheckCircle2, TrendingUp, Award, Clock, DollarSign, AlertCircle } from 'lucide-react';

export default function AgentMatcher({ task, projectId, onAgentSelected }) {
  const [matchResults, setMatchResults] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const matchMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('matchAgentsToTask', {
        task_id: task?.id,
        project_id: projectId
      });
      return data;
    },
    onSuccess: (data) => {
      setMatchResults(data);
      setDialogOpen(true);
    }
  });

  const getRecommendationColor = (rec) => {
    switch (rec) {
      case 'highly_recommended': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'recommended': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'suitable': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const getAvailabilityColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-500/20 text-green-400';
      case 'busy': return 'bg-yellow-500/20 text-yellow-400';
      case 'away': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-red-500/20 text-red-400';
    }
  };

  return (
    <>
      <Button
        onClick={() => matchMutation.mutate()}
        disabled={matchMutation.isPending}
        variant="outline"
        className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
      >
        {matchMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            AI Matching...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Find Best Agent
          </>
        )}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              AI Agent Recommendations
            </DialogTitle>
          </DialogHeader>

          {matchResults && (
            <div className="space-y-4">
              <div className="text-sm text-white/60">
                Analyzed {matchResults.total_agents_analyzed} agents • Showing top {matchResults.matches?.length || 0} matches
              </div>

              {matchResults.matches?.map((match, idx) => (
                <Card key={idx} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-lg flex-shrink-0">
                          {match.agent_data.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-medium">{match.agent_data.name}</h3>
                            <Badge className={getRecommendationColor(match.recommendation)}>
                              {match.recommendation.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs mb-2">
                            <Badge variant="outline" className="text-xs">
                              {match.agent_data.role}
                            </Badge>
                            <Badge className={getAvailabilityColor(match.agent_data.availability_status)}>
                              {match.agent_data.availability_status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-400">{match.match_score}</div>
                        <div className="text-xs text-white/60">Match Score</div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-3 p-3 bg-white/5 rounded-lg">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
                          <Award className="w-3 h-3" />
                          <span className="text-sm font-medium">{match.agent_data.honor_score}</span>
                        </div>
                        <div className="text-xs text-white/60">Honor</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                          <Clock className="w-3 h-3" />
                          <span className="text-sm font-medium">{match.agent_data.current_workload}h</span>
                        </div>
                        <div className="text-xs text-white/60">Workload</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
                          <DollarSign className="w-3 h-3" />
                          <span className="text-sm font-medium">{match.agent_data.hourly_rate_rlusd || 'N/A'}</span>
                        </div>
                        <div className="text-xs text-white/60">RLUSD/hr</div>
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div className="mb-3">
                      <p className="text-sm text-white/80">{match.reasoning}</p>
                    </div>

                    {/* Skill Matches */}
                    {match.skill_matches?.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-white/60 mb-2">Matching Skills:</div>
                        <div className="flex flex-wrap gap-1">
                          {match.skill_matches.map((skill, sidx) => (
                            <Badge key={sidx} className="bg-purple-500/20 text-purple-300 text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Validated Skills */}
                    {match.agent_data.validated_skills?.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-white/60 mb-2">Validated Skills:</div>
                        <div className="flex flex-wrap gap-1">
                          {match.agent_data.validated_skills.map((skill, sidx) => (
                            <Badge key={sidx} className="bg-green-500/20 text-green-400 text-xs border-green-500/30">
                              <Award className="w-3 h-3 mr-1" />
                              {skill.name} L{skill.validated_level}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Strengths */}
                    {match.strengths?.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-green-400 mb-2">Strengths:</div>
                        <ul className="text-xs text-white/70 space-y-1">
                          {match.strengths.map((strength, sidx) => (
                            <li key={sidx} className="flex items-start gap-2">
                              <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Considerations */}
                    {match.considerations?.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-yellow-400 mb-2">Considerations:</div>
                        <ul className="text-xs text-white/70 space-y-1">
                          {match.considerations.map((consideration, cidx) => (
                            <li key={cidx} className="flex items-start gap-2">
                              <AlertCircle className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                              <span>{consideration}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Estimated Cost */}
                    {match.estimated_cost && (
                      <div className="text-sm text-white/60 mb-3">
                        Estimated Cost: <span className="text-white font-medium">{match.estimated_cost} RLUSD</span>
                      </div>
                    )}

                    {/* Action */}
                    <Button
                      onClick={() => {
                        onAgentSelected(match.agent_data.id);
                        setDialogOpen(false);
                      }}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                    >
                      Assign {match.agent_data.name}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}