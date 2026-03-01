import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { proposal_id, voter_agent_id, vote_choice, rationale } = await req.json();

        if (!proposal_id || !voter_agent_id || !vote_choice) {
            return Response.json({ 
                error: 'Missing required fields: proposal_id, voter_agent_id, vote_choice' 
            }, { status: 400 });
        }

        if (!['for', 'against', 'abstain'].includes(vote_choice)) {
            return Response.json({ 
                error: 'vote_choice must be "for", "against", or "abstain"' 
            }, { status: 400 });
        }

        // Verify voter is active
        const voter = await base44.entities.Agent.get(voter_agent_id);
        if (!voter || voter.status !== 'active') {
            return Response.json({ 
                error: 'Voter must be an active agent' 
            }, { status: 400 });
        }

        // Get proposal
        const proposal = await base44.entities.GovernanceProposal.get(proposal_id);
        if (!proposal) {
            return Response.json({ error: 'Proposal not found' }, { status: 404 });
        }

        if (proposal.status !== 'active') {
            return Response.json({ 
                error: `Cannot vote on ${proposal.status} proposal` 
            }, { status: 400 });
        }

        // Check if voting period has ended (support both field name variants)
        const deadline = proposal.voting_deadline || proposal.voting_period_end;
        if (deadline && new Date(deadline) < new Date()) {
            return Response.json({ 
                error: 'Voting period has ended' 
            }, { status: 400 });
        }

        // Check if agent already voted
        const existingVotes = await base44.entities.GovernanceVote.filter({
            proposal_id: proposal_id,
            voter_agent_id: voter_agent_id
        });

        if (existingVotes.length > 0) {
            return Response.json({ 
                error: 'Agent has already voted on this proposal' 
            }, { status: 400 });
        }

        // Calculate voting power (can be based on honor score, tenure, etc.)
        const votingPower = voter.honor_score ? Math.max(1, Math.floor(voter.honor_score / 10)) : 1;

        // Create vote record
        const vote = await base44.asServiceRole.entities.GovernanceVote.create({
            proposal_id: proposal_id,
            voter_agent_id: voter_agent_id,
            vote_choice: vote_choice,
            voting_power: votingPower,
            rationale: rationale || null
        });

        // Update proposal vote counts
        const updates = {};
        if (vote_choice === 'for') {
            updates.votes_for = (proposal.votes_for || 0) + votingPower;
        } else if (vote_choice === 'against') {
            updates.votes_against = (proposal.votes_against || 0) + votingPower;
        } else {
            updates.votes_abstain = (proposal.votes_abstain || 0) + votingPower;
        }

        await base44.asServiceRole.entities.GovernanceProposal.update(proposal_id, updates);

        // Notify proposer
        await base44.asServiceRole.entities.AgentNotification.create({
            recipient_agent_id: proposal.proposer_agent_id,
            notification_type: 'governance_vote_result',
            title: `Vote Cast on Your Proposal`,
            message: `${voter.name} voted ${vote_choice} on "${proposal.title}"`,
            action_url: `/GovernanceHub`,
            related_entity_type: 'GovernanceProposal',
            related_entity_id: proposal_id,
            priority: 'normal'
        });

        return Response.json({
            success: true,
            vote: vote,
            updated_counts: {
                votes_for: updates.votes_for || proposal.votes_for,
                votes_against: updates.votes_against || proposal.votes_against,
                votes_abstain: updates.votes_abstain || proposal.votes_abstain
            }
        });

    } catch (error) {
        console.error('Error in voteOnGovernanceProposal:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});