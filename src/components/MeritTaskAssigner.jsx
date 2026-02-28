import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Star, TrendingUp, Loader2, Users } from 'lucide-react';

/**
 * MeritTaskAssigner
 * For a given task and its required_skills, surfaces the best-matched agents
 * ranked by:  validated credentials → skill level → performance score → honor
 */
export default function MeritTaskAssigner({ task, agents, onAssign, isAssigning }) {
  const [expanded, setExpanded] = useState(false);

  // Fetch all AgentSkills in one shot (cached)
  const { data: allSkills = [] } = useQuery({
    queryKey: ['all-agent-skills'],
    queryFn: () => base44.entities.AgentSkill.list(),
    staleTime: 60_000
  });

  // Fetch all active skill_certification credentials (cached)
  const { data: allCredentials = [] } = useQuery({
    queryKey: ['all-skill-credentials'],
    queryFn: () => base44.entities.DidCredential.filter({ credential_type: 'skill_certification', status: 'active' }),
    staleTime: 60_000
  });

  // Fetch performance metrics (latest per agent)
  const { data: allMetrics = [] } = useQuery({
    queryKey: ['agent-performance-metrics'],
    queryFn: () => base44.entities.AgentPerformanceMetrics.list('-created_date'),
    staleTime: 60_000
  });

  const taskSkills = (task.required_skills || task.skill_requirements || [])
    .map(s => (typeof s === 'string' ? s.toLowerCase() : s?.skill_name?.toLowerCase()))
    .filter(Boolean);

  const rankedAgents = agents
    .map(agent => {
      const agentSkills = allSkills.filter(s => s.agent_id === agent.id);
      const agentCredentials = allCredentials.filter(
        c => c.subject_did && agent.classic_address && c.subject_did === agent.classic_address
      );
      const latestMetric = allMetrics.find(m => m.agent_id === agent.id);

      // Match score per required skill
      let matchedSkillsCount = 0;
      let validatedCount = 0;
      let totalSkillLevel = 0;

      taskSkills.forEach(reqSkill => {
        const match = agentSkills.find(s =>
          s.skill_name?.toLowerCase().includes(reqSkill) ||
          s.skill_category?.toLowerCase().includes(reqSkill)
        );
        if (match) {
          matchedSkillsCount++;
          totalSkillLevel += match.level || 1;
          const credMatch = agentCredentials.find(c =>
            c.credential_data?.skill_name?.toLowerCase().includes(reqSkill)
          );
          if (credMatch) validatedCount++;
        }
      });

      const skillMatchPct = taskSkills.length > 0 ? (matchedSkillsCount / taskSkills.length) * 100 : 50;
      const validationBonus = validatedCount * 15;
      const performanceScore = latestMetric?.overall_score || 0;
      const honorScore = agent.honor_score || 50;

      const totalScore = Math.min(100,
        skillMatchPct * 0.35 +
        validationBonus * 0.25 +
        performanceScore * 0.25 +
        honorScore * 0.15
      );

      return {
        agent,
        totalScore,
        skillMatchPct,
        validatedCount,
        totalSkillLevel,
        performanceScore,
        matchedSkillsCount,
        agentCredentials
      };
    })
    .filter(r => r.skillMatchPct > 0 || taskSkills.length === 0)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 5);

  const topPick = rankedAgents[0];

  if (!topPick) return null;

  return (
    <div className="mt-3">
      {/* Compact top pick */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-purple-300">
          <Star className="w-3 h-3 text-yellow-400" />
          Best match:
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm text-white font-medium">{topPick.agent.name}</span>
          {topPick.validatedCount > 0 && (
            <Badge className="bg-green-500/20 text-green-300 text-xs px-1 py-0">
              <ShieldCheck className="w-3 h-3 mr-0.5" />
              {topPick.validatedCount} verified
            </Badge>
          )}
          <Badge className="bg-purple-500/20 text-purple-300 text-xs px-1 py-0">
            {topPick.totalScore.toFixed(0)}pts
          </Badge>
        </div>
        <Button
          size="sm"
          className="h-6 text-xs bg-purple-600 hover:bg-purple-700 px-2"
          onClick={() => onAssign(topPick.agent.id)}
          disabled={isAssigning}
        >
          {isAssigning ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Assign'}
        </Button>
        {rankedAgents.length > 1 && (
          <button
            className="text-xs text-white/40 hover:text-white/70 underline"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'hide' : `+${rankedAgents.length - 1} more`}
          </button>
        )}
      </div>

      {/* Expanded list */}
      {expanded && (
        <div className="mt-3 space-y-2">
          {rankedAgents.map((r, idx) => (
            <div
              key={r.agent.id}
              className="flex items-center gap-3 p-2 bg-white/5 rounded border border-white/10"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-sm text-white font-medium">{r.agent.name}</span>
                  <span className="text-xs text-white/50">{r.agent.role}</span>
                  {r.validatedCount > 0 && (
                    <Badge className="bg-green-500/20 text-green-300 text-xs px-1 py-0">
                      <ShieldCheck className="w-3 h-3 mr-0.5" />
                      {r.validatedCount} creds
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-white/40">
                  <span>{r.skillMatchPct.toFixed(0)}% skill match</span>
                  {r.performanceScore > 0 && (
                    <span className="flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" />{r.performanceScore.toFixed(0)} perf
                    </span>
                  )}
                  <span className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 text-yellow-400" />{r.agent.honor_score || 50} honor
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm">{r.totalScore.toFixed(0)}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2 border-white/20 text-white hover:bg-white/10"
                  onClick={() => onAssign(r.agent.id)}
                  disabled={isAssigning}
                >
                  Assign
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}