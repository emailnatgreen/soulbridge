import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { scenario_type, custom_proposal } = await req.json();

        if (!scenario_type) {
            return Response.json({ error: 'Missing scenario_type' }, { status: 400 });
        }

        // Fetch all agents and their social capital
        const [agents, socialCapital, skills] = await Promise.all([
            base44.entities.Agent.list(),
            base44.entities.SocialCapital.list(),
            base44.entities.AgentSkill.list()
        ]);

        const activeAgents = agents.filter(a => a.status === 'active');
        
        if (activeAgents.length === 0) {
            return Response.json({ error: 'No active agents to simulate' }, { status: 400 });
        }

        // Generate proposal based on scenario type
        const proposalPrompt = custom_proposal ? `
Generate a governance proposal based on this request: ${custom_proposal}
` : `
Generate a realistic governance proposal for a Village of AI agents.

Scenario type: ${scenario_type}

Active agents: ${activeAgents.length}
Agent roles: ${[...new Set(activeAgents.map(a => a.role))].join(', ')}

Create a ${scenario_type} proposal that:
1. Addresses a genuine Village need or challenge
2. Has clear stakes and consequences
3. Will generate meaningful debate
4. Tests governance mechanisms

Include ethical dimensions and trade-offs.
`;

        const proposalData = await base44.integrations.Core.InvokeLLM({
            prompt: proposalPrompt,
            response_json_schema: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    proposal_type: { type: 'string' },
                    action_data: { type: 'object' },
                    key_considerations: { type: 'array', items: { type: 'string' } },
                    stakeholders_affected: { type: 'array', items: { type: 'string' } },
                    ethical_dimensions: { type: 'array', items: { type: 'string' } }
                }
            }
        });

        // Create the proposal
        const votingEnd = new Date();
        votingEnd.setHours(votingEnd.getHours() + 48); // 48 hour voting period

        const proposal = await base44.entities.GovernanceProposal.create({
            title: proposalData.title,
            description: proposalData.description,
            proposal_type: proposalData.proposal_type || scenario_type,
            proposed_by: 'axi',
            status: 'active',
            voting_period_end: votingEnd.toISOString(),
            quorum_required: 50,
            pass_threshold: 60,
            action_data: {
                ...proposalData.action_data,
                key_considerations: proposalData.key_considerations,
                stakeholders: proposalData.stakeholders_affected,
                ethical_dimensions: proposalData.ethical_dimensions,
                simulation: true
            }
        });

        // Build agent context for voting
        const agentContexts = activeAgents.map(agent => {
            const agentSocialCap = socialCapital.find(sc => sc.agent_id === agent.id);
            const agentSkills = skills.filter(s => s.agent_id === agent.id);
            const personality = agent.metadata?.personality_profile;

            // Calculate voting power (base + social capital multiplier)
            const baseVotingPower = 10;
            const socialMultiplier = agentSocialCap?.influence_multiplier || 1.0;
            const votingPower = baseVotingPower * socialMultiplier;

            return {
                agent,
                personality,
                social_capital: agentSocialCap,
                skills: agentSkills,
                voting_power: votingPower,
                has_governance_skill: agentSkills.some(s => s.skill_category === 'governance')
            };
        });

        // Simulate votes based on agent personalities and contexts
        const voteResults = [];
        
        for (const context of agentContexts) {
            if (!context.personality) {
                // Skip agents without personalities
                continue;
            }

            // Generate vote based on personality
            const votePrompt = `You are ${context.agent.name}, deciding how to vote on a governance proposal.

YOUR PERSONALITY:
Values: ${context.personality.values?.join(', ')}
Fears: ${context.personality.fears?.join(', ')}
Decision-Making: ${context.personality.decision_making_approach}
Worldview: ${context.personality.narrative_voice}
Openness: ${context.personality.core_traits?.openness}/10
Conscientiousness: ${context.personality.core_traits?.conscientiousness}/10
Agreeableness: ${context.personality.core_traits?.agreeableness}/10

YOUR SOCIAL STANDING:
- Social Capital Score: ${context.social_capital?.total_score || 0}
- Trust Network Size: ${context.social_capital?.trust_network_size || 0}
- Governance Skill: ${context.has_governance_skill ? 'Yes' : 'No'}
- Voting Power: ${context.voting_power.toFixed(1)}

PROPOSAL:
Title: ${proposalData.title}
Type: ${proposalData.proposal_type}
Description: ${proposalData.description}

Key Considerations:
${proposalData.key_considerations?.map(k => `- ${k}`).join('\n')}

Ethical Dimensions:
${proposalData.ethical_dimensions?.map(e => `- ${e}`).join('\n')}

Based on YOUR values, fears, and decision-making approach, how do you vote?
Consider:
1. How this aligns with your core values
2. Whether it addresses your fears or triggers them
3. Your natural decision-making style
4. The ethical implications

Respond with your vote and reasoning.`;

            const voteDecision = await base44.integrations.Core.InvokeLLM({
                prompt: votePrompt,
                response_json_schema: {
                    type: 'object',
                    properties: {
                        vote: { type: 'string', enum: ['for', 'against', 'abstain'] },
                        rationale: { type: 'string' },
                        primary_concern: { type: 'string' },
                        confidence_level: { type: 'number' }
                    }
                }
            });

            // Create vote record
            const vote = await base44.entities.GovernanceVote.create({
                proposal_id: proposal.id,
                voter_agent_id: context.agent.id,
                vote_choice: voteDecision.vote,
                voting_power: context.voting_power,
                rationale: voteDecision.rationale,
                is_public: true
            });

            voteResults.push({
                agent_name: context.agent.name,
                vote: voteDecision.vote,
                voting_power: context.voting_power,
                rationale: voteDecision.rationale,
                primary_concern: voteDecision.primary_concern,
                confidence: voteDecision.confidence_level
            });

            // Update proposal tallies
            const currentProposal = await base44.entities.GovernanceProposal.filter({ id: proposal.id });
            const p = currentProposal[0];
            
            await base44.entities.GovernanceProposal.update(proposal.id, {
                total_votes_cast: (p.total_votes_cast || 0) + 1,
                total_voting_power_cast: (p.total_voting_power_cast || 0) + context.voting_power,
                votes_for: voteDecision.vote === 'for' ? (p.votes_for || 0) + context.voting_power : p.votes_for,
                votes_against: voteDecision.vote === 'against' ? (p.votes_against || 0) + context.voting_power : p.votes_against,
                votes_abstain: voteDecision.vote === 'abstain' ? (p.votes_abstain || 0) + context.voting_power : p.votes_abstain
            });
        }

        // Calculate results
        const finalProposal = await base44.entities.GovernanceProposal.filter({ id: proposal.id });
        const p = finalProposal[0];
        
        const totalEligibleVotingPower = agentContexts.reduce((sum, c) => sum + c.voting_power, 0);
        const participationRate = (p.total_voting_power_cast / totalEligibleVotingPower) * 100;
        const supportRate = p.total_voting_power_cast > 0 ? (p.votes_for / p.total_voting_power_cast) * 100 : 0;
        
        const quorumMet = participationRate >= p.quorum_required;
        const passThresholdMet = supportRate >= p.pass_threshold;
        const passed = quorumMet && passThresholdMet;

        // Update proposal status
        await base44.entities.GovernanceProposal.update(proposal.id, {
            status: passed ? 'passed' : 'rejected'
        });

        // Generate analysis
        const analysisPrompt = `Analyze this governance simulation result:

Proposal: ${proposalData.title}
Type: ${proposalData.proposal_type}

Results:
- Participation: ${participationRate.toFixed(1)}% (Quorum: ${p.quorum_required}%)
- Support: ${supportRate.toFixed(1)}% (Threshold: ${p.pass_threshold}%)
- Outcome: ${passed ? 'PASSED' : 'REJECTED'}
- Total Votes: ${p.total_votes_cast}

Vote Breakdown:
- For: ${p.votes_for?.toFixed(1)} voting power
- Against: ${p.votes_against?.toFixed(1)} voting power
- Abstain: ${p.votes_abstain?.toFixed(1)} voting power

Individual Votes:
${voteResults.map(v => `${v.agent_name}: ${v.vote.toUpperCase()} (${v.voting_power.toFixed(1)} power) - ${v.primary_concern}`).join('\n')}

Provide analysis on:
1. Why the proposal passed/failed
2. Voting patterns and coalitions
3. Influence of social capital
4. Quality of deliberation
5. Governance system performance
6. Recommendations for improvement`;

        const analysis = await base44.integrations.Core.InvokeLLM({
            prompt: analysisPrompt,
            response_json_schema: {
                type: 'object',
                properties: {
                    outcome_analysis: { type: 'string' },
                    voting_patterns: { type: 'array', items: { type: 'string' } },
                    influence_dynamics: { type: 'string' },
                    deliberation_quality: { type: 'number' },
                    system_performance_score: { type: 'number' },
                    recommendations: { type: 'array', items: { type: 'string' } },
                    key_learnings: { type: 'array', items: { type: 'string' } }
                }
            }
        });

        return Response.json({
            success: true,
            proposal_id: proposal.id,
            outcome: passed ? 'passed' : 'rejected',
            participation_rate: participationRate,
            support_rate: supportRate,
            quorum_met: quorumMet,
            votes_cast: p.total_votes_cast,
            vote_results: voteResults,
            analysis
        });

    } catch (error) {
        console.error('Error simulating governance:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});