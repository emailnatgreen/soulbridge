import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, ThumbsUp, ThumbsDown, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ProposalAISummaryPanel({ proposalId }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState(null);

  useEffect(() => {
    if (!proposalId) return;
    loadProposal();
  }, [proposalId]);

  const loadProposal = async () => {
    try {
      const proposals = await base44.entities.GovernanceProposal.filter({ id: proposalId });
      if (proposals.length > 0) {
        setProposal(proposals[0]);
      }
    } catch (e) {
      console.error('Error loading proposal:', e);
    }
  };

  const generateSummary = async () => {
    if (!proposal) return;
    setLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a concise, neutral 3-point summary for this governance proposal. Format as bullet points.

**Title:** ${proposal.title}
**Type:** ${proposal.proposal_type}
**Description:** ${proposal.description}
${proposal.impact_assessment ? `**Impact:** ${proposal.impact_assessment}` : ''}

Provide:
1. Core proposal objective
2. Primary stakeholder benefits
3. Key risks or considerations`,
        response_json_schema: {
          type: 'object',
          properties: {
            objective: { type: 'string' },
            benefits: { type: 'string' },
            risks: { type: 'string' }
          }
        }
      });
      setSummary(response);
    } catch (e) {
      toast.error('Failed to generate summary: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!proposal) return null;

  const totalVotes = (proposal.votes_for || 0) + (proposal.votes_against || 0) + (proposal.votes_abstain || 0);
  const forPercentage = totalVotes > 0 ? ((proposal.votes_for || 0) / totalVotes * 100) : 0;
  const againstPercentage = totalVotes > 0 ? ((proposal.votes_against || 0) / totalVotes * 100) : 0;

  return (
    <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-400/30">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-white text-lg">{proposal.title}</CardTitle>
          <Sparkles className="w-5 h-5 text-blue-400" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voting Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-white/70">Voting</span>
            <span className="text-white font-medium">{totalVotes} votes cast</span>
          </div>
          <div className="flex gap-2 h-2 rounded bg-white/5">
            {totalVotes > 0 && (
              <>
                <div className="bg-green-500" style={{ width: `${forPercentage}%` }} />
                <div className="bg-red-500" style={{ width: `${againstPercentage}%` }} />
              </>
            )}
          </div>
          <div className="flex gap-4 text-xs text-white/60">
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3 text-green-400" />
              {proposal.votes_for || 0} for
            </span>
            <span className="flex items-center gap-1">
              <ThumbsDown className="w-3 h-3 text-red-400" />
              {proposal.votes_against || 0} against
            </span>
          </div>
        </div>

        {/* AI Summary */}
        {!summary ? (
          <Button
            onClick={generateSummary}
            disabled={loading}
            variant="outline"
            className="w-full border-blue-400/30 text-blue-200 hover:bg-blue-500/10"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-2" />
                AI Summary
              </>
            )}
          </Button>
        ) : (
          <div className="bg-white/5 rounded-lg p-3 space-y-2 text-sm text-blue-100">
            <p><strong>📌 Objective:</strong> {summary.objective}</p>
            <p><strong>✅ Benefits:</strong> {summary.benefits}</p>
            <p><strong>⚠️ Risks:</strong> {summary.risks}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}