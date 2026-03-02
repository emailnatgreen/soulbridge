import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Users, Sparkles, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProjectTeamRecommendation({ projectId, onTeamSelected }) {
  const [expanded, setExpanded] = useState(false);

  const { data: recommendations, isLoading, error } = useQuery({
    queryKey: ['project-team-recommendations', projectId],
    queryFn: async () => {
      const response = await base44.functions.invoke('recommendProjectTeam', { 
        project_id: projectId 
      });
      return response.data;
    },
    enabled: !!projectId && expanded
  });

  const handleSelectTeam = (team) => {
    if (onTeamSelected) {
      onTeamSelected(team);
    }
  };

  const confidenceBadgeColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-700 border-green-300';
    if (score >= 60) return 'bg-blue-100 text-blue-700 border-blue-300';
    if (score >= 40) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-orange-100 text-orange-700 border-orange-300';
  };

  if (!expanded) {
    return (
      <Button
        onClick={() => setExpanded(true)}
        variant="outline"
        className="w-full gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
      >
        <Sparkles className="w-4 h-4" />
        Recommend Team
      </Button>
    );
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-purple-600" />
            AI-Powered Team Recommendations
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(false)}
            className="h-6 w-6 p-0"
          >
            ✕
          </Button>
        </div>
        <CardDescription>
          Intelligent agent matching based on skills, growth trajectory, and project requirements
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8 gap-2 text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing project requirements and agent capabilities...
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2 items-start">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700">{error.message || 'Failed to generate recommendations'}</div>
          </div>
        )}

        {recommendations && !isLoading && (
          <>
            {/* Narrative */}
            {recommendations.team_composition_narrative && (
              <div className="p-3 bg-white rounded-lg border border-purple-200">
                <h4 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Composition Strategy
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {recommendations.team_composition_narrative}
                </p>
              </div>
            )}

            {/* Required Skills Overview */}
            {recommendations.required_skills?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-900">Required Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {recommendations.required_skills.map((skill, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="border-purple-200 bg-white text-purple-700"
                    >
                      {skill.skill_id}
                      <span className="text-xs ml-1 text-purple-600">
                        Lvl {skill.required_level}
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Team */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Top Recommended Agents
              </h4>
              <ScrollArea className="h-[400px] rounded-lg border border-gray-200 bg-white p-4">
                <div className="space-y-3">
                  {recommendations.recommended_team?.map((agent) => (
                    <div
                      key={agent.agent_id}
                      className="p-3 rounded-lg border border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50 hover:border-purple-300 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <div className="flex-1">
                          <h5 className="font-semibold text-gray-900 text-sm">{agent.agent_name}</h5>
                          <p className="text-xs text-gray-600">{agent.role}</p>
                        </div>
                        <Badge className={cn('text-xs', confidenceBadgeColor(agent.confidence_score))}>
                          {agent.confidence_score}%
                        </Badge>
                      </div>

                      {/* Match Progress */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">
                            {agent.matched_skills}/{agent.total_required} skills
                          </span>
                          <span className="text-xs font-semibold text-purple-600">
                            {agent.match_percentage}% match
                          </span>
                        </div>
                        <Progress value={agent.match_percentage} className="h-1.5" />
                      </div>

                      {/* Matched Skills */}
                      {agent.matched_skill_details?.length > 0 && (
                        <div className="text-xs space-y-1 mb-2 bg-white rounded p-2">
                          {agent.matched_skill_details.map((skill, idx) => (
                            <div key={idx} className="flex items-center justify-between text-gray-700">
                              <span>{skill.skill_name}</span>
                              <span className="text-purple-600 font-medium">
                                Lvl {skill.agent_level}/{skill.required_level}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Honor Score */}
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <TrendingUp className="w-3 h-3" />
                        Honor: {Math.round(agent.honor_score)}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectTeam([agent])}
                        className="w-full mt-2 text-xs h-7"
                      >
                        Select
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* All Ranked Agents */}
            {recommendations.all_agents_ranked && recommendations.all_agents_ranked.length > recommendations.recommended_team?.length && (
              <details className="border border-gray-200 rounded-lg p-3 bg-white">
                <summary className="cursor-pointer font-semibold text-sm text-gray-700 hover:text-gray-900">
                  View All {recommendations.all_agents_ranked.length} Ranked Agents
                </summary>
                <div className="mt-3 space-y-2 max-h-[300px] overflow-auto">
                  {recommendations.all_agents_ranked.slice(recommendations.recommended_team?.length || 0).map((agent) => (
                    <div key={agent.agent_id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                      <span className="text-gray-700 font-medium">{agent.agent_name}</span>
                      <span className="text-gray-500">{agent.confidence_score}% • {agent.match_percentage}% match</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}