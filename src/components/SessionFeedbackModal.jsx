import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Star, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const SKILL_GAIN_OPTIONS = [
  'Much Improved', 'Somewhat Improved', 'No Change', 'Needs More Work'
];

function StarRating({ value, onChange, max = 5 }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => {
        const filled = (hovered ?? value) > i;
        return (
          <button
            key={i}
            type="button"
            className="transition-transform hover:scale-110"
            onMouseEnter={() => setHovered(i + 1)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onChange(i + 1)}
          >
            <Star className={`w-7 h-7 ${filled ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
          </button>
        );
      })}
    </div>
  );
}

export default function SessionFeedbackModal({ open, onClose, session, relationship, isMentor }) {
  const queryClient = useQueryClient();
  const [satisfaction, setSatisfaction] = useState(null);
  const [progressRating, setProgressRating] = useState(null);
  const [skillGain, setSkillGain] = useState('');
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Update session with feedback
      const sessionUpdate = isMentor
        ? {
            session_quality: satisfaction,
            progress_rating: progressRating,
            mentor_notes: comment || undefined
          }
        : {
            session_quality: satisfaction,
            mentee_notes: comment || undefined
          };
      await base44.entities.MentorshipSession.update(session.id, sessionUpdate);

      // Update relationship satisfaction
      const relUpdate = isMentor
        ? { mentor_satisfaction: satisfaction }
        : { mentee_satisfaction: satisfaction };
      await base44.entities.MentorshipRelationship.update(relationship.id, relUpdate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['activeMentorships'] });
      setDone(true);
      toast.success('Feedback submitted — thank you!');
    },
    onError: () => toast.error('Failed to submit feedback')
  });

  const handleClose = () => {
    setDone(false);
    setSatisfaction(null);
    setProgressRating(null);
    setSkillGain('');
    setComment('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Session Feedback</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="text-center py-8 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <p className="font-medium text-slate-800">Feedback received!</p>
            <p className="text-sm text-slate-500">Your insights help improve the mentorship program.</p>
            <Button onClick={handleClose} className="mt-2">Close</Button>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Overall satisfaction */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Overall Session Satisfaction
              </label>
              <StarRating value={satisfaction || 0} onChange={setSatisfaction} />
              {satisfaction && (
                <p className="text-xs text-slate-500 mt-1">
                  {['', 'Unsatisfactory', 'Below Average', 'Average', 'Good', 'Excellent'][satisfaction]}
                </p>
              )}
            </div>

            {/* Mentor-only: mentee progress rating */}
            {isMentor && (
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Mentee Progress This Session
                </label>
                <StarRating value={progressRating || 0} onChange={setProgressRating} max={10} />
              </div>
            )}

            {/* Mentee-only: perceived skill gain */}
            {!isMentor && (
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Perceived Skill Gain
                </label>
                <div className="flex flex-wrap gap-2">
                  {SKILL_GAIN_OPTIONS.map(opt => (
                    <Badge
                      key={opt}
                      variant={skillGain === opt ? 'default' : 'outline'}
                      className="cursor-pointer select-none"
                      onClick={() => setSkillGain(opt === skillGain ? '' : opt)}
                    >
                      {opt}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Comment */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                {isMentor ? 'Private Notes / Observations' : 'What would you like to share?'}
              </label>
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={isMentor
                  ? 'Notes on mentee progress, challenges, next steps…'
                  : 'What was most valuable? What could be improved?'
                }
                className="resize-none h-24"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
              <Button
                className="flex-1"
                disabled={!satisfaction || submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
              >
                {submitMutation.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</>
                  : 'Submit Feedback'
                }
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}