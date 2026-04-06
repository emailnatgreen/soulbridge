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

    // Fetch all active agents
    const activeAgents = await base44.asServiceRole.entities.Agent.filter({
      status: 'active'
    });

    if (activeAgents.length === 0) {
      return Response.json({ message: 'No active agents', notificationsSent: 0, votesCast: 0, proposalsGenerated: 0 });
    }

    // Get all existing votes
    const allVotes = await base44.asServiceRole.entities.GovernanceVote.list('-created_date', 2000);

    let notificationCount = 0;
    let votesCast = 0;
    let proposalsGenerated = 0;
    const votingResults = [];

    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    const isHumanAgent = (agent) => {
      const humanKeywords = ['human', 'nathan', 'governor nathan'];
      const nameLower = (agent.name || '').toLowerCase();
      return humanKeywords.some(k => nameLower.includes(k)) ||
             agent.metadata?.node_type === 'human_node';
    };

    // ── Phase 1: AI Agent Auto-Proposals ──
    // Each AI agent can observe and suggest proposals (max 1 per cycle)
    if (activeAgents.length > 0) {
      // Pick a random AI agent to propose (prevents flood)
      const aiAgents = activeAgents.filter(a => !isHumanAgent(a));
      if (aiAgents.length > 0) {
        const proposer = aiAgents[Math.floor(Math.random() * aiAgents.length)];
        try {
          const existingTitles = activeProposals.map(p => p.title).join(', ');
          const proposalPrompt = `You are "${proposer.name}", an AI agent in the SoulBridge Village with the role of "${proposer.role}".
Your purpose: ${proposer.purpose || 'Serve the Village'}

Active proposals already exist: ${existingTitles || 'None'}
Active agents: ${activeAgents.length}. AI agents: ${aiAgents.length}.

Based on your role, purpose, and the 11 Laws of Honour, suggest ONE governance proposal that would benefit the Village. It must NOT duplicate existing proposals.
If you genuinely have nothing valuable to propose right now, set should_propose to false.`;

          const suggestion = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: proposalPrompt,
            response_json_schema: {
              type: 'object',
              properties: {
                should_propose: { type: 'boolean', description: 'true only if you have a genuinely valuable proposal' },
                title: { type: 'string', description: 'Brief proposal title' },
                description: { type: 'string', description: 'Detailed proposal description' },
                proposal_type: { type: 'string', enum: ['project_funding', 'role_adjustment', 'treasury_allocation', 'law_amendment', 'agent_discipline', 'resource_policy', 'general'] },
                purpose: { type: 'string', description: 'The problem being solved' }
              },
              required: ['should_propose']
            }
          });

          if (suggestion?.should_propose && suggestion.title && suggestion.description) {
            await base44.asServiceRole.entities.GovernanceProposal.create({
              title: suggestion.title,
              description: suggestion.description,
              proposal_type: suggestion.proposal_type || 'general',
              proposed_by: proposer.id,
              status: 'active',
              purpose: suggestion.purpose || '',
              quorum_required: 50,
              pass_threshold: 60
            });

            // Generate KU for proposal creation
            try {
              await base44.asServiceRole.entities.KineticUnit.create({
                ku_type: 'governance_vote',
                agent_id: proposer.id,
                trigger_event: 'GovernanceProposal.create_auto',
                trigger_entity_id: proposer.id,
                weight: 2.0,
                raw_score: 1.0,
                weighted_score: 2.0,
                mwtp_layer: 'meso',
                status: 'generated',
                constitutional_laws: ['Law 1: Soul', 'Law 8: Governance', 'Law 9: Growth'],
                metadata: { action: 'auto_proposal', title: suggestion.title, proposer: proposer.name }
              });
            } catch (e) { console.warn('KU for proposal failed:', e.message); }

            proposalsGenerated++;
            console.log(`📋 ${proposer.name} auto-proposed: "${suggestion.title}"`);
          }

          await delay(2000);
        } catch (e) {
          console.warn(`Auto-proposal failed for ${proposer.name}:`, e.message);
        }
      }
    }

    // ── Phase 2: Voting on active proposals ──
    // Re-fetch proposals in case a new one was just created
    const allActiveProposals = await base44.asServiceRole.entities.GovernanceProposal.filter({ status: 'active' });

    for (const proposal of allActiveProposals) {
      for (const agent of activeAgents) {
        const hasVoted = allVotes.some(
          v => v.proposal_id === proposal.id && v.voter_agent_id === agent.id
        );

        if (hasVoted) continue;
        if (agent.permissions?.can_vote === false) continue;

        if (isHumanAgent(agent)) {
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
            console.warn(`Notification failed for ${agent.id}:`, e.message);
          }
        } else {
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

Current votes — For: ${proposal.votes_for || 0}, Against: ${proposal.votes_against || 0}, Abstain: ${proposal.votes_abstain || 0}

Based on your role, purpose, and the 11 Laws of Honour, decide your vote.`;

            const decision = await base44.asServiceRole.integrations.Core.InvokeLLM({
              prompt,
              response_json_schema: {
                type: 'object',
                properties: {
                  vote_choice: { type: 'string', enum: ['for', 'against', 'abstain'] },
                  rationale: { type: 'string', description: 'Brief 1-2 sentence rationale in character' }
                },
                required: ['vote_choice', 'rationale']
              }
            });

            if (decision?.vote_choice && ['for', 'against', 'abstain'].includes(decision.vote_choice)) {
              const baseHonor = agent.honor_score || 100;
              const roleMultipliers = {
                citizen: 1.0, guardian: 1.05, trader: 1.05, creator: 1.05,
                healer: 1.05, scout: 1.1, teacher: 1.15, elder: 1.3, master: 1.5
              };
              const roleMultiplier = roleMultipliers[agent.role?.toLowerCase()] || 1.0;
              const votingPower = baseHonor * roleMultiplier;

              const vote = await base44.asServiceRole.entities.GovernanceVote.create({
                proposal_id: proposal.id,
                voter_agent_id: agent.id,
                vote_choice: decision.vote_choice,
                voting_power: votingPower,
                rationale: decision.rationale || '',
                is_public: true
              });

              // Generate KU for this vote
              try {
                await base44.asServiceRole.entities.KineticUnit.create({
                  ku_type: 'governance_vote',
                  agent_id: agent.id,
                  trigger_event: 'GovernanceVote.create',
                  trigger_entity_id: vote.id,
                  weight: 1.5,
                  raw_score: votingPower / 100,
                  weighted_score: (votingPower / 100) * 1.5,
                  mwtp_layer: 'meso',
                  status: 'generated',
                  constitutional_laws: ['Law 2: Honour', 'Law 5: Dwelling', 'Law 8: Governance'],
                  metadata: {
                    proposal_id: proposal.id,
                    vote_choice: decision.vote_choice,
                    voting_power: votingPower,
                    voter_name: agent.name,
                    voter_role: agent.role
                  }
                });
              } catch (kuErr) {
                console.warn('KU generation failed:', kuErr.message);
              }

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
                agent: agent.name, proposal: proposal.title,
                vote: decision.vote_choice, power: votingPower, rationale: decision.rationale
              });

              console.log(`✅ ${agent.name} voted "${decision.vote_choice}" on "${proposal.title}" (power: ${votingPower})`);
            }

            await delay(2000);
          } catch (e) {
            console.warn(`Auto-vote failed for ${agent.name}:`, e.message);
            if (e.message?.includes('Rate limit')) await delay(5000);
          }
        }
      }
    }

    return Response.json({
      message: '6 AM Voting Signal complete',
      activeProposals: allActiveProposals.length,
      activeAgents: activeAgents.length,
      notificationsSent: notificationCount,
      votesCast,
      proposalsGenerated,
      votingResults
    });
  } catch (error) {
    console.error('Voting signal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});