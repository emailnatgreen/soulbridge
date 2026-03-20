import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, MessageSquare, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function ProposalFeedback({ proposalId, proposalTitle }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating) {
      toast.error('Please select a star rating');
      return;
    }
    setSubmitting(true);
    await base44.entities.GovernanceProposal.update(proposalId, {
      execution_result: {
        assistant_feedback: {
          rating,
          comment: comment.trim() || null,
          submitted_at: new Date().toISOString(),
        }
      }
    });
    setSubmitted(true);
    setSubmitting(false);
    toast.success('Thank you for your feedback! 🙏');
  };

  if (submitted) {
    return (
      <Card className="bg-green-500/10 backdrop-blur-xl border-green-400/20">
        <CardContent className="py-5 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
          <p className="text-green-200 text-sm">Feedback recorded. Your insights help Axi improve the drafting assistant for all agents.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          Rate the Drafting Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-purple-200/50 text-sm">
          How helpful was the drafting assistant for <span className="text-purple-200/80 italic">"{proposalTitle || 'this proposal'}"</span>?
        </p>

        {/* Star Rating */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-7 h-7 transition-colors ${
                  star <= (hovered || rating)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-white/20'
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-amber-300/70 text-sm">
              {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
            </span>
          )}
        </div>

        {/* Comment */}
        <Textarea
          placeholder="Any thoughts on what worked well or could be improved? (optional)"
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/25 resize-none text-sm"
        />

        <Button
          onClick={handleSubmit}
          disabled={!rating || submitting}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          size="sm"
        >
          {submitting ? (
            <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Submitting...</>
          ) : (
            <><Star className="w-3 h-3 mr-2" />Submit Feedback</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}