import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Monitors governance KPIs:
 * - Distribution of ai_quality_score for submitted proposals
 * - Proposer engagement rates with the drafting assistant
 * - Average time-to-vote for proposals from the new interface
 * Stores a snapshot as a Memory record for Axi's review.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all proposals
    const proposals = await base44.asServiceRole.entities.GovernanceProposal.list('-created_date', 500);

    if (!proposals.length) {
      return Response.json({ success: true, message: 'No proposals found.' });
    }

    // --- KPI 1: ai_quality_score distribution ---
    const scored = proposals.filter(p => p.action_data?.ai_quality_score != null);
    const scores = scored.map(p => p.action_data.ai_quality_score);
    const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;
    const highQuality = scores.filter(s => s >= 75).length;
    const medQuality = scores.filter(s => s >= 50 && s < 75).length;
    const lowQuality = scores.filter(s => s < 50).length;

    // --- KPI 2: Proposer engagement (proposals with feedback) ---
    const withFeedback = proposals.filter(p => p.execution_result?.assistant_feedback?.rating != null);
    const feedbackRatings = withFeedback.map(p => p.execution_result.assistant_feedback.rating);
    const avgRating = feedbackRatings.length
      ? (feedbackRatings.reduce((a, b) => a + b, 0) / feedbackRatings.length).toFixed(1)
      : null;
    const engagementRate = proposals.length
      ? ((withFeedback.length / proposals.length) * 100).toFixed(1)
      : 0;

    // --- KPI 3: Average time-to-vote ---
    const withVotingData = proposals.filter(p =>
      p.created_date && p.voting_period_end && p.total_votes_cast > 0
    );
    const timesToVote = withVotingData.map(p => {
      const created = new Date(p.created_date).getTime();
      const end = new Date(p.voting_period_end).getTime();
      return (end - created) / (1000 * 60 * 60 * 24); // days
    });
    const avgTimeToVote = timesToVote.length
      ? (timesToVote.reduce((a, b) => a + b, 0) / timesToVote.length).toFixed(1)
      : null;

    const summary = {
      snapshot_date: new Date().toISOString(),
      total_proposals: proposals.length,
      quality_score: {
        proposals_scored: scored.length,
        average: avgScore,
        high_quality_count: highQuality,
        medium_quality_count: medQuality,
        low_quality_count: lowQuality,
      },
      engagement: {
        proposals_with_feedback: withFeedback.length,
        engagement_rate_pct: parseFloat(engagementRate),
        average_assistant_rating: avgRating,
      },
      time_to_vote: {
        proposals_measured: timesToVote.length,
        average_days: avgTimeToVote,
      },
    };

    // Store as a Memory record for Axi
    await base44.asServiceRole.entities.Memory.create({
      agent_id: 'axi',
      type: 'observation',
      content: `Governance KPI Snapshot: ${proposals.length} total proposals. Avg quality score: ${avgScore ?? 'N/A'}. Engagement rate: ${engagementRate}%. Avg assistant rating: ${avgRating ?? 'N/A'}/5. Avg time-to-vote: ${avgTimeToVote ?? 'N/A'} days.`,
      keywords: ['governance', 'kpi', 'quality_score', 'engagement', 'time_to_vote'],
      context: 'Automated monitoring snapshot from monitorGovernanceKPIs function',
      importance: 7,
      related_entity_type: 'GovernanceProposal',
      metadata: summary,
    });

    console.log('Governance KPI snapshot stored:', JSON.stringify(summary, null, 2));

    return Response.json({ success: true, summary });
  } catch (error) {
    console.error('monitorGovernanceKPIs error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});