import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Brain, Loader2, Target, Calendar, BarChart2,
  CheckCircle2, ChevronDown, ChevronUp, Lightbulb, Sparkles
} from 'lucide-react';

const PRIORITY_STYLES = {
  high:   'bg-red-500/20 text-red-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low:    'bg-blue-500/20 text-blue-400'
};

function GoalCard({ goal, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
      <button
        className="w-full text-left p-3 flex items-start gap-3"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-purple-400 font-bold text-sm w-5 flex-shrink-0 mt-0.5">{index + 1}.</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium leading-snug">{goal.goal}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {goal.skill_related && (
              <Badge className="text-xs bg-purple-500/20 text-purple-300">{goal.skill_related}</Badge>
            )}
            {goal.priority && (
              <Badge className={`text-xs ${PRIORITY_STYLES[goal.priority] || PRIORITY_STYLES.medium}`}>
                {goal.priority}
              </Badge>
            )}
            {goal.target_date && (
              <span className="text-xs text-white/40 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(goal.target_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-white/30 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0 mt-1" />}
      </button>

      {open && (
        <div className="px-4 pb-3 pt-0 border-t border-white/10 space-y-2 bg-black/10">
          {goal.success_metric && (
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <BarChart2 className="w-3 h-3" /> Success Metric
              </div>
              <p className="text-xs text-white/70">{goal.success_metric}</p>
            </div>
          )}
          {goal.rationale && (
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> Why This Goal
              </div>
              <p className="text-xs text-white/70 italic">{goal.rationale}</p>
            </div>
          )}
          {goal.suggested_session_activities?.length > 0 && (
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Session Activities</div>
              <div className="space-y-0.5">
                {goal.suggested_session_activities.map((a, i) => (
                  <div key={i} className="text-xs text-white/60 flex items-start gap-1.5">
                    <span className="text-purple-400 mt-0.5">→</span> {a}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GoalSetterModal({ open, onClose, relationship, menteeAgentId, menteeName }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const generate = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('generateMentorshipGoals', {
        mentee_agent_id: menteeAgentId,
        relationship_id: relationship?.id || null
      });
      if (response.data?.success) {
        setResult(response.data);
        if (response.data.goals_saved) {
          queryClient.invalidateQueries(['activeMentorships']);
          queryClient.invalidateQueries(['pendingMentorships']);
        }
        toast.success('Goals generated and saved to your mentorship!');
      } else {
        toast.error(response.data?.error || 'Failed to generate goals');
      }
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Target className="w-5 h-5 text-purple-400" />
            AI Goal Setting {menteeName ? `— ${menteeName}` : ''}
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-white/60">
              Our AI will analyse {menteeName ? `${menteeName}'s` : 'the mentee\'s'} skill profile, development plan, 
              and session history to generate personalised SMART goals for this mentorship journey.
            </p>
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 space-y-1">
              <div className="font-medium text-purple-200 flex items-center gap-1"><Sparkles className="w-3 h-3" /> What the AI considers:</div>
              <div>• Weakest skills needing development</div>
              <div>• Active skill development plan objectives</div>
              <div>• Past session feedback and topics covered</div>
              <div>• Agent role, purpose, and mentorship context</div>
            </div>
            <Button
              onClick={generate}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating goals…</>
                : <><Brain className="w-4 h-4 mr-2" /> Generate Personalised Goals</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Theme banner */}
            {result.overall_theme && (
              <div className="p-3 rounded-lg bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/20">
                <div className="text-xs text-white/40 uppercase tracking-wider mb-0.5">Journey Theme</div>
                <p className="text-sm text-purple-200 font-medium">{result.overall_theme}</p>
              </div>
            )}

            {/* Goals */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/40 uppercase tracking-wider">
                  {result.goals?.length} SMART Goals
                </div>
                {result.goals_saved && (
                  <Badge className="bg-green-500/20 text-green-400 text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Saved to mentorship
                  </Badge>
                )}
              </div>
              {result.goals?.map((goal, i) => (
                <GoalCard key={i} goal={goal} index={i} />
              ))}
            </div>

            {/* First session focus */}
            {result.recommended_session_focus && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="text-xs text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" /> Recommended First Session Focus
                </div>
                <p className="text-sm text-white/80">{result.recommended_session_focus}</p>
              </div>
            )}

            {/* AI session suggestions */}
            {result.ai_session_suggestions?.length > 0 && (
              <div>
                <div className="text-xs text-white/40 uppercase tracking-wider mb-2">AI Session Suggestions</div>
                <div className="space-y-1">
                  {result.ai_session_suggestions.map((s, i) => (
                    <div key={i} className="text-xs text-white/60 flex items-start gap-1.5">
                      <span className="text-blue-400 mt-0.5">→</span> {s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={generate}
                disabled={loading}
                variant="outline"
                className="flex-1 border-white/20 text-white text-sm"
              >
                {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Brain className="w-3 h-3 mr-1" />}
                Regenerate
              </Button>
              <Button onClick={handleClose} className="flex-1 bg-purple-600 hover:bg-purple-700 text-sm">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}