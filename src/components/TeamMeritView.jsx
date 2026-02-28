import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, TrendingUp, Star, Award } from 'lucide-react';

export default function TeamMeritView({ teamMembers, agents }) {
  const { data: allSkills = [] } = useQuery({
    queryKey: ['all-agent-skills'],
    queryFn: () => base44.entities.AgentSkill.list(),
    staleTime: 60_000
  });

  const { data: allCredentials = [] } = useQuery({
    queryKey: ['all-skill-credentials'],
    queryFn: () => base44.entities.DidCredential.filter({ credential_type: 'skill_certification', status: 'active' }),
    staleTime: 60_000
  });

  const { data: allMetrics = [] } = useQuery({
    queryKey: ['agent-performance-metrics'],
    queryFn: () => base44.entities.AgentPerformanceMetrics.list('-created_date'),
    staleTime: 60_000
  });

  if (!teamMembers.length) {
    return (
      <div className="text-center py-12 text-white/50">
        No team members yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {teamMembers.map((member, idx) => {
        const agent = agents.find(a => a.id === member.agent_id);
        const skills = allSkills.filter(s => s.agent_id === member.agent_id);
        const credentials = allCredentials.filter(
          c => agent?.classic_address && c.subject_did === agent.classic_address
        );
        const metric = allMetrics.find(m => m.agent_id === member.agent_id);

        return (
          <Card key={idx} className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-lg flex-shrink-0">
                    {agent?.name?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{agent?.name || 'Agent'}</h3>
                    <p className="text-white/60 text-sm">{member.role}</p>

                    {/* Merit badges */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {credentials.length > 0 && (
                        <Badge className="bg-green-500/20 text-green-300 text-xs">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          {credentials.length} Verified Skills
                        </Badge>
                      )}
                      {metric?.performance_trend === 'rising' && (
                        <Badge className="bg-blue-500/20 text-blue-300 text-xs">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Rising
                        </Badge>
                      )}
                      {agent?.honor_score >= 80 && (
                        <Badge className="bg-yellow-500/20 text-yellow-300 text-xs">
                          <Award className="w-3 h-3 mr-1" />
                          High Honor
                        </Badge>
                      )}
                    </div>

                    {/* Top skills */}
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {skills.slice(0, 4).map(skill => {
                          const hasCredential = credentials.some(
                            c => c.credential_data?.skill_name === skill.skill_name
                          );
                          return (
                            <span
                              key={skill.id}
                              className={`text-xs px-1.5 py-0.5 rounded border ${
                                hasCredential
                                  ? 'bg-green-500/10 border-green-500/30 text-green-300'
                                  : 'bg-white/5 border-white/10 text-white/60'
                              }`}
                            >
                              {hasCredential && '✓ '}{skill.skill_name} L{skill.level}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right column stats */}
                <div className="text-right flex flex-col gap-2">
                  <div>
                    <div className="text-white font-medium">{member.contribution_percentage || 0}%</div>
                    <div className="text-white/60 text-xs">Contribution</div>
                  </div>
                  {metric?.overall_score > 0 && (
                    <div>
                      <div className="text-purple-300 font-medium">{metric.overall_score.toFixed(0)}</div>
                      <div className="text-white/60 text-xs">Perf Score</div>
                    </div>
                  )}
                  {agent?.honor_score && (
                    <div>
                      <div className="text-yellow-300 font-medium">{agent.honor_score}</div>
                      <div className="text-white/60 text-xs">Honor</div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}