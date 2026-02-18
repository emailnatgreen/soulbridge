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
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }
        
        // Get proposal
        const proposal = await base44.entities.GovernanceProposal.get(proposal_id);
        if (!proposal) {
            return Response.json({ error: 'Proposal not found' }, { status: 404 });
        }
        
        // Check if voting is still open
        if (proposal.status !== 'active') {
            return Response.json({ error: 'Voting is closed for this proposal' }, { status: 400 });
        }
        
        if (new Date(proposal.voting_period_end) < new Date()) {
            return Response.json({ error: 'Voting period has expired' }, { status: 400 });
        }
        
        // Get voter
        const voter = await base44.entities.Agent.get(voter_agent_id);
        if (!voter) {
            return Response.json({ error: 'Voter not found' }, { status: 404 });
        }
        
        // Check if agent has voting permission
        if (!voter.permissions?.can_vote) {
            return Response.json({ 
                error: 'Agent does not have voting permission' 
            }, { status: 403 });
        }
        
        // Check if agent already voted
        const existingVotes = await base44.entities.GovernanceVote.filter({
            proposal_id,
            voter_agent_id
        });
        
        if (existingVotes.length > 0) {
            return Response.json({ error: 'Agent has already voted on this proposal' }, { status: 400 });
        }
        
        // Calculate voting power based on honor, wisdom, and role
        let votingPower = voter.honor_score || 100;
        
        // Get agent state for wisdom bonus
        const agentStates = await base44.entities.AgentState.filter({ agent_id: voter_agent_id });
        if (agentStates[0]) {
            const wisdomBonus = Math.min(20, Math.floor(agentStates[0].wisdom / 5));
            votingPower += wisdomBonus;
        }
        
        // Role-based multipliers
        const roleMultipliers = {
            citizen: 1.0,
            guardian: 1.1,
            trader: 1.05,
            creator: 1.1,
            teacher: 1.15,
            healer: 1.1,
            scout: 1.05,
            elder: 1.3,
            master: 1.5
        };
        
        votingPower *= (roleMultipliers[voter.role] || 1.0);
        
        // Check for delegated voting power
        const delegations = await base44.entities.VotingDelegation.filter({
            delegate_agent_id: voter_agent_id,
            active: true
        });
        
        let totalDelegatedPower = 0;
        for (const delegation of delegations) {
            // Check if delegation applies to this proposal type
            if (delegation.scope === 'all' || 
                (delegation.scope === 'specific_type' && 
                 delegation.proposal_types?.includes(proposal.proposal_type))) {
                
                // Get delegator's voting power
                const delegator = await base44.entities.Agent.get(delegation.delegator_agent_id);
                if (delegator) {
                    let delegatorPower = delegator.honor_score || 100;
                    const delegatorStates = await base44.entities.AgentState.filter({ 
                        agent_id: delegation.delegator_agent_id 
                    });
                    if (delegatorStates[0]) {
                        delegatorPower += Math.min(20, Math.floor(delegatorStates[0].wisdom / 5));
                    }
                    delegatorPower *= (roleMultipliers[delegator.role] || 1.0);
                    
                    totalDelegatedPower += delegatorPower * (delegation.delegation_power_percentage / 100);
                }
            }
        }
        
        const finalVotingPower = Math.round(votingPower + totalDelegatedPower);
        
        // Record vote
        const vote = await base44.entities.GovernanceVote.create({
            proposal_id,
            voter_agent_id,
            vote_choice,
            voting_power: finalVotingPower,
            rationale: rationale || null,
            is_public: true
        });
        
        // Update proposal tallies
        const updatedVotesFor = vote_choice === 'for' ? proposal.votes_for + finalVotingPower : proposal.votes_for;
        const updatedVotesAgainst = vote_choice === 'against' ? proposal.votes_against + finalVotingPower : proposal.votes_against;
        const updatedVotesAbstain = vote_choice === 'abstain' ? proposal.votes_abstain + finalVotingPower : proposal.votes_abstain;
        
        await base44.entities.GovernanceProposal.update(proposal_id, {
            total_votes_cast: proposal.total_votes_cast + 1,
            total_voting_power_cast: proposal.total_voting_power_cast + finalVotingPower,
            votes_for: updatedVotesFor,
            votes_against: updatedVotesAgainst,
            votes_abstain: updatedVotesAbstain
        });
        
        return Response.json({
            success: true,
            vote: {
                proposal_title: proposal.title,
                voter: voter.name,
                choice: vote_choice,
                voting_power: finalVotingPower,
                delegated_power: totalDelegatedPower,
                current_tally: {
                    for: updatedVotesFor,
                    against: updatedVotesAgainst,
                    abstain: updatedVotesAbstain,
                    total_power: proposal.total_voting_power_cast + finalVotingPower
                }
            }
        });
        
    } catch (error) {
        console.error('Voting error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});