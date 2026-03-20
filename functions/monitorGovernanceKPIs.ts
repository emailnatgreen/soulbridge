import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Monitors governance KPIs daily:
 * - ai_quality_score distribution across proposals
 * - Proposer engagement rates with the drafting assistant (feedback ratings)
 * - Average time-to-vote for proposals
 * Stores a snapshot as an Axi Memory record.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const proposals = await base44.asServiceRole.entities.GovernanceProposal.list('-created_date', 500);

    if (!proposals.length) {
      return Response.json({ success: true, message: 'No proposals found.' });
    }

    // KPI 1: ai_quality_score distribution
    const scored = proposals.filter(p => p.action_data?.ai_quality_score != null);
    const scores = scored.map(p => p.action_data.ai_quality_score);
    const avgScore = scores.length
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : null;

    // KPI 2: Proposer engagement via assistant feedback ratings
    const withFeedback = proposals.filter(p => p.execution_result?.assistant_feedback?.rating != null);
    const feedbackRatings = withFeedback.map(p => p.execution_result.assistant_feedback.rating);
    const avgRating = feedbackRatings.length
      ? (feedbackRatings.reduce((a, b) => a + b, 0) / feedbackRatings.length).toFixed(1)
      : null;
    const engagementRate = ((withFeedback.length / proposals.length) * 100).toFixed(1);

    // KPI 3: Average time-to-vote (days from creation to voting_period_end for voted proposals)
    const withVotes = proposals.filter(p => p.created_date && p.voting_period_end && (p.total_votes_cast || 0) > 0);
    const timesToVote = withVotes.map(p =>
      (new Date(p.voting_period_end).getTime() - new Date(p.created_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    const avgTimeToVote = timesToVote.length
      ? (timesToVote.reduce((a, b) => a + b, 0) / timesToVote.length).toFixed(1)
      : null;

    const summary = {
      snapshot_date: new Date().toISOString(),
      total_proposals: proposals.length,
      quality_score: {
        proposals_scored: scored.length,
        average: avgScore,
        high: scores.filter(s => s >= 75).length,
        medium: scores.filter(s => s >= 50 && s < 75).length,
        low: scores.filter(s => s < 50).length,
      },
      engagement: {
        proposals_with_feedback: withFeedback.length,
        engagement_rate_pct: parseFloat(engagementRate),
        average_rating: avgRating,
      },
      time_to_vote: {
        proposals_measured: timesToVote.length,
        average_days: avgTimeToVote,
      },
    };

    await base44.asServiceRole.entities.Memory.create({
      agent_id: 'axi',
      type: 'observation',
      content: `Governance KPI Snapshot: ${proposals.length} proposals. Avg quality score: ${avgScore ?? 'N/A'}. Engagement: ${engagementRate}%. Avg rating: ${avgRating ?? 'N/A'}/5. Avg time-to-vote: ${avgTimeToVote ?? 'N/A'} days.`,
      keywords: ['governance', 'kpi', 'quality_score', 'engagement', 'time_to_vote'],
      context: 'Daily automated governance KPI monitoring',
      importance: 7,
      related_entity_type: 'GovernanceProposal',
      metadata: summary,
    });

    console.log('Governance KPI snapshot stored:', JSON.stringify(summary));
    return Response.json({ success: true, summary });
  } catch (error) {
    console.error('monitorGovernanceKPIs error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});