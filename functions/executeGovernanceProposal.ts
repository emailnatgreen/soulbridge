import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { proposal_id } = await req.json();

        if (!proposal_id) {
            return Response.json({ error: 'proposal_id is required' }, { status: 400 });
        }

        // Get proposal
        const proposal = await base44.entities.GovernanceProposal.get(proposal_id);
        if (!proposal) {
            return Response.json({ error: 'Proposal not found' }, { status: 404 });
        }

        if (proposal.status !== 'active') {
            return Response.json({ 
                error: `Cannot execute ${proposal.status} proposal` 
            }, { status: 400 });
        }

        // Check if voting period has ended
        if (new Date(proposal.voting_deadline) > new Date()) {
            return Response.json({ 
                error: 'Voting period has not ended yet' 
            }, { status: 400 });
        }

        // Calculate results
        const totalVotes = (proposal.votes_for || 0) + (proposal.votes_against || 0) + (proposal.votes_abstain || 0);
        const activeAgents = await base44.asServiceRole.entities.Agent.filter({ status: 'active' });
        const quorumMet = totalVotes >= (activeAgents.length * (proposal.quorum_threshold / 100));
        
        const approvalRate = totalVotes > 0 
            ? ((proposal.votes_for || 0) / totalVotes * 100)
            : 0;
        
        const approved = quorumMet && approvalRate >= proposal.approval_threshold;

        // Update proposal status
        const newStatus = approved ? 'approved' : 'rejected';
        await base44.asServiceRole.entities.GovernanceProposal.update(proposal_id, {
            status: newStatus,
            executed_date: new Date().toISOString()
        });

        let executionResult = null;

        // Execute proposal if approved
        if (approved && proposal.execution_details) {
            try {
                // This is a simplified execution - in production you'd have specific handlers
                // for different proposal types
                executionResult = {
                    executed: true,
                    details: proposal.execution_details,
                    message: `Proposal "${proposal.title}" has been approved and executed`
                };

                // Record execution in economic activities if it involves treasury
                if (proposal.execution_details.treasury_action) {
                    await base44.asServiceRole.entities.EconomicActivity.create({
                        agent_id: proposal.proposer_agent_id,
                        activity_type: 'treasury_withdrawal',
                        amount: proposal.execution_details.amount || 0,
                        description: `Governance proposal execution: ${proposal.title}`,
                        status: 'completed'
                    });
                }
            } catch (execError) {
                executionResult = {
                    executed: false,
                    error: execError.message
                };
            }
        }

        // Notify all voters and proposer
        const allVotes = await base44.asServiceRole.entities.GovernanceVote.filter({ 
            proposal_id: proposal_id 
        });
        
        const notifiedAgents = new Set([proposal.proposer_agent_id]);
        
        for (const vote of allVotes) {
            notifiedAgents.add(vote.voter_agent_id);
        }

        for (const agentId of notifiedAgents) {
            await base44.asServiceRole.entities.AgentNotification.create({
                recipient_agent_id: agentId,
                notification_type: 'governance_vote_result',
                title: `Proposal ${approved ? 'Approved' : 'Rejected'}: ${proposal.title}`,
                message: `The proposal "${proposal.title}" has been ${approved ? 'approved' : 'rejected'}. For: ${proposal.votes_for || 0}, Against: ${proposal.votes_against || 0}, Abstain: ${proposal.votes_abstain || 0}`,
                action_url: `/GovernanceHub`,
                related_entity_type: 'GovernanceProposal',
                related_entity_id: proposal_id,
                priority: 'high'
            });
        }

        // Log to memory
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi_main_001',
            type: 'village_detail',
            content: `Governance proposal "${proposal.title}" ${approved ? 'APPROVED' : 'REJECTED'}. Votes - For: ${proposal.votes_for || 0}, Against: ${proposal.votes_against || 0}, Abstain: ${proposal.votes_abstain || 0}. Approval rate: ${approvalRate.toFixed(1)}%.`,
            keywords: ['governance', 'proposal', approved ? 'approved' : 'rejected', proposal.proposal_type],
            context: 'Decentralized Governance System - Proposal Execution',
            importance: 9,
            related_entity_id: proposal_id,
            related_entity_type: 'GovernanceProposal'
        });

        return Response.json({
            success: true,
            proposal_id: proposal_id,
            result: newStatus,
            voting_summary: {
                total_votes: totalVotes,
                votes_for: proposal.votes_for || 0,
                votes_against: proposal.votes_against || 0,
                votes_abstain: proposal.votes_abstain || 0,
                approval_rate: approvalRate.toFixed(1),
                quorum_met: quorumMet,
                approved: approved
            },
            execution_result: executionResult
        });

    } catch (error) {
        console.error('Error in executeGovernanceProposal:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});