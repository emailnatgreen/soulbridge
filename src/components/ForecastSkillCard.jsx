import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingUp, Lightbulb, Target, Users } from 'lucide-react';

const urgencyConfig = {
  critical: { cls: 'bg-red-500/20 text-red-300 border-red-500/30', bar: 'bg-red-500' },
  high:     { cls: 'bg-orange-500/20 text-orange-300 border-orange-500/30', bar: 'bg-orange-500' },
  medium:   { cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', bar: 'bg-yellow-500' },
};

export function InvestmentCard({ investment }) {
  const cfg = urgencyConfig[investment.urgency] || urgencyConfig.medium;
  return (
    <Card className={`bg-white/5 border ${cfg.cls}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-white text-base">{investment.skill}</CardTitle>
          <Badge className={`text-xs ${cfg.cls} flex-shrink-0`}>{investment.urgency}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-white/70">{investment.reason}</p>
        <div className="flex items-start gap-1.5 text-white/50">
          <Target className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{investment.recommended_action}</span>
        </div>
        {investment.demand_projects?.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {investment.demand_projects.map((p, i) => (
              <Badge key={i} className="text-xs bg-white/5 text-white/40 border-white/10">{p}</Badge>
            ))}
          </div>
        )}
        {investment.current_coverage && (
          <p className="text-white/40 text-xs italic">{investment.current_coverage}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function RiskFlagCard({ risk }) {
  const cfg = urgencyConfig[risk.severity] || urgencyConfig.medium;
  return (
    <div className={`p-3 rounded-lg border ${cfg.cls} space-y-1`}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-white/90 text-sm font-medium">{risk.risk}</p>
          <p className="text-white/50 text-xs mt-0.5">{risk.mitigation}</p>
          {risk.affected_projects?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {risk.affected_projects.map((p, i) => (
                <Badge key={i} className="text-xs bg-white/5 text-white/40 border-white/10">{p}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProjectDemandCard({ project }) {
  const priorityColor = {
    critical: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-slate-400'
  }[project.priority] || 'text-slate-400';

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-white text-sm">{project.project_title}</CardTitle>
            <p className={`text-xs ${priorityColor} capitalize`}>{project.status} · {project.priority} priority</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className={`text-xl font-light ${project.skill_readiness_pct >= 80 ? 'text-green-400' : project.skill_readiness_pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {project.skill_readiness_pct}%
            </div>
            <div className="text-white/40 text-xs">coverage</div>
          </div>
        </div>
        <Progress value={project.skill_readiness_pct} className="h-1 mt-1" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {project.coverage.map((cov, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-0.5">
              <span className={`${cov.team_covered ? 'text-white/60' : 'text-red-300'}`}>{cov.skill}</span>
              <div className="flex items-center gap-2">
                {cov.in_active_development && <Badge className="text-xs bg-blue-500/15 text-blue-300 border-blue-500/20 py-0">developing</Badge>}
                {cov.team_covered
                  ? <span className="text-green-400 text-xs">✓ covered</span>
                  : cov.village_has
                    ? <span className="text-yellow-400 text-xs">⚠ not on team</span>
                    : <span className="text-red-400 text-xs">✗ missing</span>
                }
              </div>
            </div>
          ))}
        </div>
        {project.missing_village_wide?.length > 0 && (
          <div className="mt-2 p-2 bg-red-500/10 rounded border border-red-500/20">
            <p className="text-red-300 text-xs font-medium mb-1">Village-wide gaps:</p>
            <div className="flex flex-wrap gap-1">
              {project.missing_village_wide.map((s, i) => (
                <Badge key={i} className="text-xs bg-red-500/20 text-red-300 border-red-500/20">{s}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}