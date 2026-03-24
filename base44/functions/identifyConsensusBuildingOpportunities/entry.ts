import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { proposal_id } = await req.json();

    if (!proposal_id) {
      return Response.json({ error: 'proposal_id required' }, { status: 400 });
    }

    const proposals = await base44.entities.GovernanceProposal.filter({
      id: proposal_id
    });

    if (proposals.length === 0) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const proposal = proposals[0];

    // Get current voting split
    const forVotes = proposal.votes_for || 0;
    const againstVotes = proposal.votes_against || 0;
    const abstainVotes = proposal.votes_abstain || 0;
    const totalVotes = forVotes + againstVotes + abstainVotes;

    if (totalVotes === 0) {
      return Response.json({
        status: 'success',
        message: 'No votes cast yet. Consensus-building opportunities will emerge once voting begins.',
        consensus_opportunities: []
      });
    }

    // Analyze voting patterns
    const forPercentage = (forVotes / totalVotes) * 100;
    const againstPercentage = (againstVotes / totalVotes) * 100;
    const abstainPercentage = (abstainVotes / totalVotes) * 100;

    const opportunities = [];

    // Opportunity 1: High abstention indicates confusion
    if (abstainPercentage > 30) {
      opportunities.push({
        type: 'clarification_needed',
        severity: 'high',
        description: 'Over 30% of voters are abstaining—proposal language may be unclear',
        action: 'Host Q&A session or publish clarification document addressing common concerns'
      });
    }

    // Opportunity 2: Close vote suggests potential compromise
    if (Math.abs(forPercentage - againstPercentage) < 20 && totalVotes >= 5) {
      opportunities.push({
        type: 'compromise_potential',
        severity: 'medium',
        description: `Vote is close (${forPercentage.toFixed(0)}% for, ${againstPercentage.toFixed(0)}% against)—room for negotiation`,
        action: 'Identify concerns from opposing side and explore amendments that address both viewpoints'
      });
    }

    // Opportunity 3: Low participation despite active voting
    if (totalVotes < 8) {
      opportunities.push({
        type: 'engagement_low',
        severity: 'medium',
        description: `Only ${totalVotes} agents have voted so far—broader input needed`,
        action: 'Reach out to non-voters, especially respected agents, to gather perspectives'
      });
    }

    // Opportunity 4: Overwhelming consensus (>80%) suggests education gap
    if (forPercentage > 80 || againstPercentage > 80) {
      opportunities.push({
        type: 'polarized_consensus',
        severity: 'low',
        description: `Strong consensus detected (${Math.max(forPercentage, againstPercentage).toFixed(0)}%)—ensure all voices heard`,
        action: 'Solicit minority perspectives to stress-test the consensus and identify blind spots'
      });
    }

    // Opportunity 5: Timing opportunity
    const deadline = new Date(proposal.voting_period_end);
    const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 3 && totalVotes < 10) {
      opportunities.push({
        type: 'time_available',
        severity: 'low',
        description: `${daysLeft} days remaining—sufficient time for coalition building`,
        action: 'Use remaining time for targeted outreach and discussion facilitation'
      });
    }

    return Response.json({
      status: 'success',
      proposal_id: proposal.id,
      proposal_title: proposal.title,
      voting_summary: {
        total_votes: totalVotes,
        for_votes: forVotes,
        for_percentage: forPercentage.toFixed(1),
        against_votes: againstVotes,
        against_percentage: againstPercentage.toFixed(1),
        abstain_votes: abstainVotes,
        abstain_percentage: abstainPercentage.toFixed(1)
      },
      consensus_opportunities: opportunities,
      message: opportunities.length > 0 
        ? `${opportunities.length} consensus-building opportunities identified` 
        : 'Voting pattern stable—continue monitoring'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});