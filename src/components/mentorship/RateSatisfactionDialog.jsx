import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RateSatisfactionDialog({ relationship, role, onClose }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState('');

  const field = role === 'mentee' ? 'mentee_satisfaction' : 'mentor_satisfaction';
  const currentRating = relationship[field];

  const mutation = useMutation({
    mutationFn: async () => {
      await base44.entities.MentorshipRelationship.update(relationship.id, {
        [field]: rating,
      });

      // If mentee is rating, update mentor's average satisfaction
      if (role === 'mentee') {
        const profiles = await base44.entities.MentorProfile.filter({ agent_id: relationship.mentor_agent_id });
        if (profiles[0]) {
          const allRels = await base44.entities.MentorshipRelationship.filter({ mentor_agent_id: relationship.mentor_agent_id });
          const rated = allRels.filter(r => r.mentee_satisfaction > 0);
          // Include this new rating
          const totalRatings = rated.filter(r => r.id !== relationship.id).reduce((sum, r) => sum + r.mentee_satisfaction, 0) + rating;
          const count = rated.filter(r => r.id !== relationship.id).length + 1;
          await base44.entities.MentorProfile.update(profiles[0].id, {
            average_mentee_satisfaction: parseFloat((totalRatings / count).toFixed(2)),
          });
        }
      }
    },
    onSuccess: () => {
      toast.success('Rating submitted!');
      queryClient.invalidateQueries({ queryKey: ['myMentorships'] });
      queryClient.invalidateQueries({ queryKey: ['mentorProfiles'] });
      onClose();
    },
    onError: () => toast.error('Failed to submit rating')
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Rate Your Experience</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {currentRating > 0 && (
            <div className="text-xs text-white/40 bg-white/5 rounded-lg p-2.5 text-center">
              You previously rated this {currentRating}/5. Submitting will update your rating.
            </div>
          )}

          <div className="flex justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= (hover || rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-white/20'
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="text-center text-xs text-white/40">
            {rating === 0 ? 'Select a rating' : `${rating}/5 — ${['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}`}
          </div>

          <div>
            <label className="text-xs text-white/60 mb-1 block">Feedback (optional)</label>
            <Textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Share your experience…"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm h-16"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 border-white/20 text-white/60 hover:text-white text-xs">Cancel</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || rating === 0}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs"
            >
              {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Submit Rating'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}