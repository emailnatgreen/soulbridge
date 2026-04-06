import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all active governance proposals
    const activeProposals = await base44.asServiceRole.entities.GovernanceProposal.filter({
      status: 'active'
    });

    if (activeProposals.length === 0) {
      return Response.json({
        message: 'No active proposals to vote on',
        notificationsSent: 0,
        votesCast: 0
      });
    }

    // Fetch all active agents
    const activeAgents = await base44.asServiceRole.entities.Agent.filter({
      status: 'active'
    });

    if (activeAgents.length === 0) {
      return Response.json({
        message: 'No active agents to notify',
        notificationsSent: 0,
        votesCast: 0
      });
    }

    // Get all existing votes
    const allVotes = await base44.asServiceRole.entities.GovernanceVote.list('-created_date', 2000);

    let notificationCount = 0;
    let votesCast = 0;
    const votingResults = [];

    // Helper: delay to avoid rate limiting on LLM calls
    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    // Identify human agents (those with owner email or specific flags)
    // Human agents get notifications; AI agents get auto-votes
    const isHumanAgent = (agent) => {
      const humanKeywords = ['human', 'nathan', 'governor nathan'];
      const nameLower = (agent.name || '').toLowerCase();
      return humanKeywords.some(k => nameLower.includes(k)) ||
             agent.metadata?.node_type === 'human_node';
    };

    for (const proposal of activeProposals) {
      for (const agent of activeAgents) {
        // Check if agent has already voted on this proposal
        const hasVoted = allVotes.some(
          v => v.proposal_id === proposal.id && v.voter_agent_id === agent.id
        );

        if (hasVoted) continue;
        if (agent.permissions?.can_vote === false) continue;

        if (isHumanAgent(agent)) {
          // Human agents: send notification only
          try {
            await base44.asServiceRole.entities.AgentNotification.create({
              recipient_agent_id: agent.id,
              notification_type: 'voting_signal',
              title: `Vote Now: ${proposal.title}`,
              message: `A governance proposal is open for voting. Your participation helps shape our Village's future.`,
              related_entity_type: 'GovernanceProposal',
              related_entity_id: proposal.id,
              status: 'unread',
              priority: 'high'
            });
            notificationCount++;
          } catch (e) {
            console.warn(`Failed to create notification for agent ${agent.id}:`, e.message);
          }
        } else {
          // AI agents: use LLM to decide vote and cast it automatically
          try {
            const prompt = `You are "${agent.name}", an AI agent in the SoulBridge Village with the role of "${agent.role}".
Your purpose: ${agent.purpose || 'Serve the Village'}
Your personality: ${agent.personality || 'Thoughtful and fair'}
Your honor score: ${agent.honor_score || 100}

A governance proposal requires your vote:

TITLE: ${proposal.title}
TYPE: ${(proposal.proposal_type || '').replace(/_/g, ' ')}
DESCRIPTION: ${proposal.description}

${proposal.purpose ? `PURPOSE: ${proposal.purpose}` : ''}
${proposal.impact_assessment ? `IMPACT: ${proposal.impact_assessment}` : ''}
${proposal.constitutional_alignment?.length > 0 ? `CONSTITUTIONAL ALIGNMENT: ${proposal.constitutional_alignment.map(c => `Law ${c.law_number} (${c.law_name}): ${c.alignment_statement}`).join('; ')}` : ''}

Current votes — For: ${proposal.votes_for || 0}, Against: ${proposal.votes_against || 0}, Abstain: ${proposal.votes_abstain || 0}

Based on your role, purpose, and the 11 Laws of Honour, decide your vote. Think carefully about how this proposal aligns with the Village's values and your responsibilities.

Respond with your decision.`;

            const decision = await base44.asServiceRole.integrations.Core.InvokeLLM({
              prompt,
              response_json_schema: {
                type: 'object',
                properties: {
                  vote_choice: {
                    type: 'string',
                    enum: ['for', 'against', 'abstain'],
                    description: 'Your vote choice'
                  },
                  rationale: {
                    type: 'string',
                    description: 'A brief 1-2 sentence rationale for your vote, in character as this agent'
                  }
                },
                required: ['vote_choice', 'rationale']
              }
            });

            if (decision?.vote_choice && ['for', 'against', 'abstain'].includes(decision.vote_choice)) {
              // Calculate voting power
              const baseHonor = agent.honor_score || 100;
              const roleMultipliers = {
                citizen: 1.0, guardian: 1.05, trader: 1.05, creator: 1.05,
                healer: 1.05, scout: 1.1, teacher: 1.15, elder: 1.3, master: 1.5
              };
              const roleMultiplier = roleMultipliers[agent.role?.toLowerCase()] || 1.0;
              const votingPower = baseHonor * roleMultiplier;

              // Create the vote
              await base44.asServiceRole.entities.GovernanceVote.create({
                proposal_id: proposal.id,
                voter_agent_id: agent.id,
                vote_choice: decision.vote_choice,
                voting_power: votingPower,
                rationale: decision.rationale || '',
                is_public: true
              });

              // Update proposal tallies
              const updatedVotes = await base44.asServiceRole.entities.GovernanceVote.filter({ proposal_id: proposal.id });
              let totalFor = 0, totalAgainst = 0, totalAbstain = 0;
              for (const v of updatedVotes) {
                if (v.vote_choice === 'for') totalFor += v.voting_power || 0;
                else if (v.vote_choice === 'against') totalAgainst += v.voting_power || 0;
                else if (v.vote_choice === 'abstain') totalAbstain += v.voting_power || 0;
              }

              await base44.asServiceRole.entities.GovernanceProposal.update(proposal.id, {
                votes_for: totalFor,
                votes_against: totalAgainst,
                votes_abstain: totalAbstain,
                total_voting_power_cast: totalFor + totalAgainst + totalAbstain,
                total_votes_cast: updatedVotes.length
              });

              votesCast++;
              votingResults.push({
                agent: agent.name,
                proposal: proposal.title,
                vote: decision.vote_choice,
                power: votingPower,
                rationale: decision.rationale
              });

              console.log(`✅ ${agent.name} voted "${decision.vote_choice}" on "${proposal.title}" (power: ${votingPower})`);
            }

            // Delay between LLM calls to avoid rate limiting
            await delay(2000);
          } catch (e) {
            console.warn(`Failed to auto-vote for AI agent ${agent.name}:`, e.message);
            // Back off more on rate limit errors
            if (e.message?.includes('Rate limit')) {
              await delay(5000);
            }
          }
        }
      }
    }

    return Response.json({
      message: '6 AM Voting Signal complete',
      activeProposals: activeProposals.length,
      activeAgents: activeAgents.length,
      notificationsSent: notificationCount,
      votesCast,
      votingResults
    });
  } catch (error) {
    console.error('Voting signal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});