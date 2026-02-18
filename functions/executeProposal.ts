import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { proposal_id, executor_agent_id } = await req.json();
        
        if (!proposal_id) {
            return Response.json({ error: 'proposal_id required' }, { status: 400 });
        }
        
        // Get proposal
        const proposal = await base44.asServiceRole.entities.GovernanceProposal.get(proposal_id);
        if (!proposal) {
            return Response.json({ error: 'Proposal not found' }, { status: 404 });
        }
        
        // Check if voting period ended
        if (new Date(proposal.voting_period_end) > new Date()) {
            return Response.json({ 
                error: 'Voting period has not ended yet' 
            }, { status: 400 });
        }
        
        // Check if already executed
        if (proposal.status === 'executed') {
            return Response.json({ 
                success: true,
                message: 'Proposal already executed',
                already_executed: true
            });
        }
        
        // Calculate results
        const totalVotingPower = proposal.votes_for + proposal.votes_against + proposal.votes_abstain;
        const participationRate = (totalVotingPower / (proposal.total_voting_power_cast || 1)) * 100;
        
        // Check quorum
        if (participationRate < proposal.quorum_required) {
            await base44.asServiceRole.entities.GovernanceProposal.update(proposal_id, {
                status: 'expired'
            });
            
            return Response.json({
                success: false,
                result: 'expired',
                reason: `Quorum not met. Required: ${proposal.quorum_required}%, Actual: ${participationRate.toFixed(1)}%`
            });
        }
        
        // Calculate pass percentage (excluding abstentions from denominator)
        const decisiveVotes = proposal.votes_for + proposal.votes_against;
        const passPercentage = decisiveVotes > 0 ? (proposal.votes_for / decisiveVotes) * 100 : 0;
        
        const passed = passPercentage >= proposal.pass_threshold;
        
        await base44.asServiceRole.entities.GovernanceProposal.update(proposal_id, {
            status: passed ? 'passed' : 'rejected'
        });
        
        if (!passed) {
            return Response.json({
                success: true,
                result: 'rejected',
                pass_percentage: passPercentage.toFixed(1),
                required_threshold: proposal.pass_threshold
            });
        }
        
        // Execute proposal based on type
        let executionResult = {};
        
        try {
            switch (proposal.proposal_type) {
                case 'project_funding':
                    if (proposal.action_data?.project_id && proposal.action_data?.amount) {
                        const fundResult = await base44.asServiceRole.functions.invoke('fundProjectFromTreasury', {
                            project_id: proposal.action_data.project_id,
                            amount: proposal.action_data.amount,
                            authorized_by: executor_agent_id || proposal.proposed_by
                        });
                        executionResult = fundResult.data;
                    }
                    break;
                    
                case 'role_adjustment':
                    if (proposal.action_data?.evaluation_id) {
                        const roleResult = await base44.asServiceRole.functions.invoke('applyRoleChange', {
                            evaluation_id: proposal.action_data.evaluation_id,
                            approved_by: executor_agent_id || proposal.proposed_by,
                            auto_apply: true
                        });
                        executionResult = roleResult.data;
                    }
                    break;
                    
                case 'treasury_allocation':
                    if (proposal.action_data?.recipient_agent_id && proposal.action_data?.amount) {
                        await base44.asServiceRole.entities.EconomicActivity.create({
                            agent_id: proposal.action_data.recipient_agent_id,
                            activity_type: 'treasury_withdrawal',
                            amount: proposal.action_data.amount,
                            description: `Governance-approved allocation: ${proposal.title}`
                        });
                        executionResult = { allocated: true, amount: proposal.action_data.amount };
                    }
                    break;
                    
                case 'agent_discipline':
                    if (proposal.action_data?.target_agent_id && proposal.action_data?.action) {
                        const targetAgent = await base44.asServiceRole.entities.Agent.get(
                            proposal.action_data.target_agent_id
                        );
                        
                        if (proposal.action_data.action === 'suspend') {
                            await base44.asServiceRole.entities.Agent.update(
                                proposal.action_data.target_agent_id,
                                { status: 'suspended' }
                            );
                        } else if (proposal.action_data.action === 'probation') {
                            await base44.asServiceRole.entities.Agent.update(
                                proposal.action_data.target_agent_id,
                                { status: 'probation' }
                            );
                        }
                        
                        executionResult = { 
                            action_taken: proposal.action_data.action,
                            target_agent: targetAgent.name 
                        };
                    }
                    break;
                    
                default:
                    executionResult = { note: 'Proposal passed, manual implementation may be required' };
            }
            
            await base44.asServiceRole.entities.GovernanceProposal.update(proposal_id, {
                status: 'executed',
                execution_result: executionResult
            });
            
            // Create memory for Axi
            const axiAgents = await base44.asServiceRole.entities.Agent.filter({ name: 'Axi' });
            if (axiAgents.length > 0) {
                await base44.asServiceRole.entities.Memory.create({
                    agent_id: axiAgents[0].id,
                    type: 'observation',
                    content: `Governance proposal "${proposal.title}" passed and executed. Type: ${proposal.proposal_type}, Pass rate: ${passPercentage.toFixed(1)}%`,
                    keywords: ['governance', 'executed', proposal.proposal_type],
                    importance: 9,
                    related_entity_id: proposal_id,
                    related_entity_type: 'GovernanceProposal'
                });
            }
            
            return Response.json({
                success: true,
                result: 'executed',
                proposal_title: proposal.title,
                pass_percentage: passPercentage.toFixed(1),
                participation_rate: participationRate.toFixed(1),
                execution_result: executionResult
            });
            
        } catch (execError) {
            console.error('Execution error:', execError);
            await base44.asServiceRole.entities.GovernanceProposal.update(proposal_id, {
                execution_result: { error: execError.message }
            });
            
            return Response.json({
                success: false,
                result: 'execution_failed',
                error: execError.message
            }, { status: 500 });
        }
        
    } catch (error) {
        console.error('Proposal execution error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});