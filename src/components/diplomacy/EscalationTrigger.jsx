import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Loader2, TrendingUp, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function EscalationTrigger({ review, chainId, onEscalated }) {
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  // Only show after an "Acceptable" evaluation (not Refined Vintage, not Synthetic Slop)
  const verdict = review.ai_verdict;
  if (!verdict || verdict === 'Refined Vintage' || review.status === 'Evaluated') return null;
  if (verdict === 'Synthetic Slop' || !review.trainee_response) return null;

  // Show after at least one attempt with an Acceptable verdict
  const attemptCount = review.attempt_count || 0;
  if (attemptCount < 1) return null;

  const handleEscalate = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('generateEscalation', {
        ghost_review_id: review.id,
        chain_id: chainId || null,
      });
      qc.invalidateQueries({ queryKey: ['ghost-reviews'] });
      qc.invalidateQueries({ queryKey: ['escalation-chains'] });
      toast.success(`Stage ${res.data.stage_number} escalation generated`);
      onEscalated?.(res.data.new_review_id, res.data.chain_id);
    } catch (e) {
      toast.error('Failed to generate escalation: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-amber-300 bg-amber-50/60">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Escalation Risk Detected</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              Your response scored <strong>{review.ai_score}/100</strong> ({verdict}). In a real scenario,{' '}
              <strong>{review.simulated_customer_name}</strong> may escalate their complaint.
              You can retry this review, or face the consequence — an escalated, angrier version.
            </p>
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-amber-300 text-amber-800 hover:bg-amber-100 h-7"
                onClick={() => toast.info('Scroll up to refine your response and try again.')}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry this Review
              </Button>
              <Button
                size="sm"
                onClick={handleEscalate}
                disabled={loading}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white h-7"
              >
                {loading
                  ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Generating...</>
                  : <><TrendingUp className="w-3 h-3 mr-1" />Face the Escalation</>
                }
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}