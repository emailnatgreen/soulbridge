import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, Zap, BookOpen, Users, Target, ChevronDown, ChevronUp, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';

const actionTypeIcon = {
  validate_skill: ShieldCheck,
  learn_skill: BookOpen,
  practice: Target,
  mentorship: Users,
  project: Zap
};

const actionTypeColor = {
  validate_skill: 'text-green-300 bg-green-500/20 border-green-500/30',
  learn_skill: 'text-blue-300 bg-blue-500/20 border-blue-500/30',
  practice: 'text-orange-300 bg-orange-500/20 border-orange-500/30',
  mentorship: 'text-purple-300 bg-purple-500/20 border-purple-500/30',
  project: 'text-yellow-300 bg-yellow-500/20 border-yellow-500/30'
};

const readinessColor = {
  ready_now: 'bg-green-500/20 text-green-300',
  ready: 'bg-green-500/20 text-green-300',
  needs_practice: 'bg-yellow-500/20 text-yellow-300',
  needs_work: 'bg-yellow-500/20 text-yellow-300',
  needs_training: 'bg-orange-500/20 text-orange-300',
  not_ready: 'bg-red-500/20 text-red-300',
};

export default function PersonalisedPlanCard({ plan, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [actionsExpanded, setActionsExpanded] = useState(true);
  const queryClient = useQueryClient();

  const toggleActionMutation = useMutation({
    mutationFn: async ({ actionIdx, completed }) => {
      const updatedActions = (plan.immediate_actions || []).map((a, i) =>
        i === actionIdx ? { ...a, completed } : a
      );
      return base44.entities.SkillDevelopmentPlan.update(plan.id, { immediate_actions: updatedActions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['skill-dev-plans']);
    }
  });

  const completedActions = (plan.immediate_actions || []).filter(a => a.completed).length;
  const totalActions = (plan.immediate_actions || []).length;
  const completionPct = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  const priorityColor = {
    critical: 'bg-red-500/20 text-red-300 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    medium: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  };

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge className={`text-xs border ${priorityColor[plan.priority] || priorityColor.high}`}>
                {plan.priority}
              </Badge>
              <Badge className="bg-white/10 text-white/60 text-xs">
                {completedActions}/{totalActions} actions
              </Badge>
              {plan.credential_count_at_generation > 0 && (
                <Badge className="bg-green-500/20 text-green-300 text-xs">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  {plan.credential_count_at_generation} creds at generation
                </Badge>
              )}
            </div>
            <CardTitle className="text-white text-lg">{plan.plan_title}</CardTitle>
            <p className="text-white/60 text-sm mt-1 leading-relaxed">{plan.summary}</p>
          </div>
          <div className="text-right text-sm flex-shrink-0">
            {plan.weekly_time_commitment && (
              <div className="text-white/60">{plan.weekly_time_commitment}h/week</div>
            )}
            {plan.estimated_completion_weeks && (
              <div className="text-purple-300">{plan.estimated_completion_weeks}wk path</div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span>Plan Progress</span>
            <span>{completionPct}%</span>
          </div>
          <Progress value={completionPct} className="h-1.5" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Immediate Actions */}
        {totalActions > 0 && (
          <div>
            <button
              className="flex items-center gap-2 text-white font-medium text-sm mb-2 w-full"
              onClick={() => setActionsExpanded(!actionsExpanded)}
            >
              <Zap className="w-4 h-4 text-yellow-400" />
              Immediate Actions ({totalActions})
              {actionsExpanded ? <ChevronUp className="w-4 h-4 ml-auto text-white/40" /> : <ChevronDown className="w-4 h-4 ml-auto text-white/40" />}
            </button>
            {actionsExpanded && (
              <div className="space-y-2">
                {plan.immediate_actions.map((action, idx) => {
                  const Icon = actionTypeIcon[action.type] || Zap;
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${action.completed ? 'opacity-50 bg-white/3' : 'bg-white/5'} border-white/10`}
                    >
                      <button
                        onClick={() => toggleActionMutation.mutate({ actionIdx: idx, completed: !action.completed })}
                        className="flex-shrink-0 mt-0.5"
                      >
                        {action.completed
                          ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                          : <Circle className="w-5 h-5 text-white/30 hover:text-white/60" />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className={`text-xs px-1.5 py-0.5 rounded border flex items-center gap-1 ${actionTypeColor[action.type] || 'text-white/60 bg-white/5 border-white/10'}`}>
                            <Icon className="w-3 h-3" />
                            {action.type?.replace(/_/g, ' ')}
                          </span>
                          {action.effort_hours && (
                            <span className="text-xs text-white/40">{action.effort_hours}h</span>
                          )}
                        </div>
                        <p className={`text-sm ${action.completed ? 'line-through text-white/40' : 'text-white'}`}>{action.action}</p>
                        {action.reason && <p className="text-xs text-white/50 mt-0.5">{action.reason}</p>}
                        {action.expected_outcome && !action.completed && (
                          <p className="text-xs text-purple-300 mt-1">→ {action.expected_outcome}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Validation Targets */}
        {plan.skill_validation_targets?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-white font-medium text-sm mb-2">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              Validation Targets
            </div>
            <div className="space-y-2">
              {plan.skill_validation_targets.map((target, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10">
                  <div>
                    <span className="text-white text-sm">{target.skill_name}</span>
                    {target.current_level && (
                      <span className="text-white/40 text-xs ml-2">L{target.current_level}</span>
                    )}
                    {target.next_step && (
                      <p className="text-xs text-white/50 mt-0.5">{target.next_step}</p>
                    )}
                  </div>
                  <Badge className={`text-xs ${readinessColor[target.validation_readiness] || 'bg-white/10 text-white/60'}`}>
                    {target.validation_readiness?.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expand / collapse phases & project alignment */}
        <button
          className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Show less' : 'Show learning phases & project alignment'}
        </button>

        {expanded && (
          <>
            {plan.learning_phases?.length > 0 && (
              <div>
                <div className="text-white font-medium text-sm mb-2">Learning Phases</div>
                <div className="space-y-2">
                  {plan.learning_phases.map((phase, idx) => (
                    <div key={idx} className="p-3 bg-purple-500/10 rounded border border-purple-500/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium text-sm">{phase.phase_name}</span>
                        <span className="text-purple-300 text-xs">{phase.duration_weeks}wk</span>
                      </div>
                      <p className="text-white/60 text-xs italic mb-2">Goal: {phase.milestone}</p>
                      {phase.key_activities?.slice(0, 3).map((act, i) => (
                        <p key={i} className="text-xs text-white/70">• {act}</p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {plan.project_alignment?.length > 0 && (
              <div>
                <div className="text-white font-medium text-sm mb-2">Project Alignment</div>
                <div className="space-y-2">
                  {plan.project_alignment.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-white/5 rounded border border-white/10">
                      <Target className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-white text-sm font-medium">{item.skill_to_develop}</span>
                        <span className="text-white/50 text-xs ml-2">→ {item.relevant_project_type}</span>
                        {item.impact && <p className="text-xs text-orange-300 mt-0.5">{item.impact}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}