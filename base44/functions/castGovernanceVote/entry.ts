import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { proposal_id, agent_id, vote_choice, rationale } = await req.json();

    if (!proposal_id || !vote_choice || !agent_id) {
      return Response.json({ 
        error: 'Missing required fields: proposal_id, agent_id, vote_choice' 
      }, { status: 400 });
    }

    if (!['for', 'against', 'abstain'].includes(vote_choice)) {
      return Response.json({ error: 'Invalid vote_choice. Must be for, against, or abstain' }, { status: 400 });
    }

    // ── SYBIL GUARD: One User, One Vote ───────────────────────────────────
    // Law 8 (The Village decides together) + Law 1 (Presence, Not a Product)
    // A single authenticated user may only cast ONE vote per proposal,
    // regardless of how many Agents they control. This prevents Sybil
    // amplification where multiple DIDs/Agents inflate a single actor's voice.

    // 1. Find ALL agents owned by this authenticated user
    const userAgents = await base44.entities.Agent.filter({
      created_by: user.email
    });
    const userAgentIds = userAgents.map(a => a.id);

    // 2. Fetch all votes on this proposal
    const proposalVotesAll = await base44.entities.GovernanceVote.filter({
      proposal_id
    });

    // 3. Check if ANY of the user's agents have already voted
    const userPriorVote = proposalVotesAll.find(v => userAgentIds.includes(v.voter_agent_id));
    if (userPriorVote) {
      const priorAgent = userAgents.find(a => a.id === userPriorVote.voter_agent_id);
      return Response.json({
        error: `One User, One Vote — you have already voted on this proposal via agent "${priorAgent?.name || userPriorVote.voter_agent_id}". ` +
               `Law 8 requires that each user casts only one vote per proposal, regardless of how many agents they control.`,
        code: 'SYBIL_GUARD_BLOCKED',
        existing_vote_id: userPriorVote.id,
        existing_agent_id: userPriorVote.voter_agent_id,
      }, { status: 403 });
    }

    // 4. Also check the specific agent (redundant safety net)
    const existingVotes = proposalVotesAll.filter(v => v.voter_agent_id === agent_id);
    if (existingVotes.length > 0) {
      return Response.json({ 
        error: 'Agent has already voted on this proposal' 
      }, { status: 400 });
    }

    // Verify proposal exists
    const allProposals = await base44.entities.GovernanceProposal.list();
    const proposal = allProposals.find(p => p.id === proposal_id);
    if (!proposal) {
      return Response.json({ error: 'Proposal not found', code: 'PROPOSAL_NOT_FOUND' }, { status: 404 });
    }

    // Get the agent to calculate voting power
    const agents = await base44.entities.Agent.list();
    const voter = agents.find(a => a.id === agent_id);

    if (!voter) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Calculate voting power based on honor score and role
    const baseHonor = voter.honor_score || 100;
    const roleMultipliers = {
      citizen: 1.0, guardian: 1.05, trader: 1.05, creator: 1.05,
      healer: 1.05, scout: 1.1, teacher: 1.15, elder: 1.3, master: 1.5
    };
    const roleMultiplier = roleMultipliers[voter.role?.toLowerCase()] || 1.0;
    const votingPower = baseHonor * roleMultiplier;

    // Create the vote record — includes authenticated_user_id for Sybil audit trail
    const vote = await base44.entities.GovernanceVote.create({
      proposal_id,
      voter_agent_id: agent_id,
      vote_choice,
      voting_power: votingPower,
      rationale: rationale || '',
      is_public: true,
      authenticated_user_id: user.email,
    });

    // ── Generate Kinetic Unit for this governance vote ──
    try {
      await base44.entities.KineticUnit.create({
        ku_type: 'governance_vote',
        agent_id: agent_id,
        trigger_event: 'GovernanceVote.create',
        trigger_entity_id: vote.id,
        weight: 1.5,
        raw_score: votingPower / 100,
        weighted_score: (votingPower / 100) * 1.5,
        mwtp_layer: 'meso',
        status: 'generated',
        constitutional_laws: ['Law 2: Honour', 'Law 5: Dwelling', 'Law 8: Governance'],
        metadata: {
          proposal_id,
          vote_choice,
          voting_power: votingPower,
          voter_name: voter.name,
          voter_role: voter.role
        }
      });
    } catch (kuErr) {
      console.warn('KU generation failed (non-blocking):', kuErr.message);
    }

    // Fetch all current votes for this proposal to recalculate totals
    const proposalVotes = await base44.entities.GovernanceVote.filter({ proposal_id });
    
    let totalFor = 0, totalAgainst = 0, totalAbstain = 0;
    for (const v of proposalVotes) {
      if (v.vote_choice === 'for') totalFor += v.voting_power || 0;
      else if (v.vote_choice === 'against') totalAgainst += v.voting_power || 0;
      else if (v.vote_choice === 'abstain') totalAbstain += v.voting_power || 0;
    }

    // Update proposal vote tallies
    const allProposals = await base44.entities.GovernanceProposal.list();
    const proposal = allProposals.find(p => p.id === proposal_id);
    
    if (proposal) {
      await base44.entities.GovernanceProposal.update(proposal_id, {
        votes_for: totalFor,
        votes_against: totalAgainst,
        votes_abstain: totalAbstain,
        total_voting_power_cast: totalFor + totalAgainst + totalAbstain,
        total_votes_cast: proposalVotes.length
      });
    }

    return Response.json({
      success: true,
      vote,
      message: `Vote "${vote_choice}" cast with ${votingPower.toFixed(2)} voting power · KU generated`,
      voting_power: votingPower,
      updated_tallies: { for: totalFor, against: totalAgainst, abstain: totalAbstain }
    });

  } catch (error) {
    console.error('Error casting vote:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});