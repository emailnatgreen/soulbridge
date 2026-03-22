import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { evaluation_id, approved_by, auto_apply } = await req.json();
        
        if (!evaluation_id) {
            return Response.json({ error: 'evaluation_id required' }, { status: 400 });
        }
        
        // Get evaluation
        const evaluation = await base44.asServiceRole.entities.RoleEvaluation.get(evaluation_id);
        if (!evaluation) {
            return Response.json({ error: 'Evaluation not found' }, { status: 404 });
        }
        
        // Check if already implemented
        if (evaluation.status === 'implemented') {
            return Response.json({ 
                success: true, 
                message: 'Role change already implemented',
                already_applied: true
            });
        }
        
        // Get agent
        const agent = await base44.asServiceRole.entities.Agent.get(evaluation.agent_id);
        if (!agent) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        // Verify approver if specified
        if (approved_by && !auto_apply) {
            const approver = await base44.asServiceRole.entities.Agent.get(approved_by);
            if (!approver) {
                return Response.json({ error: 'Approver not found' }, { status: 404 });
            }
            
            // Check if approver has authority (Axi or agents with can_evaluate_agents permission)
            const isAxi = approver.name === 'Axi';
            const canEvaluate = approver.permissions?.can_evaluate_agents === true;
            
            if (!isAxi && !canEvaluate) {
                return Response.json({ 
                    error: 'Approver does not have evaluation permission' 
                }, { status: 403 });
            }
        }
        
        const oldRole = agent.role;
        const newRole = evaluation.recommended_role;
        
        // Update agent role
        const roleHistory = agent.role_history || [];
        roleHistory.push({
            role: newRole,
            granted_date: new Date().toISOString(),
            reason: evaluation.reason
        });
        
        // Adjust permissions based on new role
        const newPermissions = determineRolePermissions(newRole, agent.honor_score);
        
        await base44.asServiceRole.entities.Agent.update(evaluation.agent_id, {
            role: newRole,
            role_history: roleHistory,
            permissions: { ...agent.permissions, ...newPermissions }
        });
        
        // Update evaluation status
        await base44.asServiceRole.entities.RoleEvaluation.update(evaluation_id, {
            status: 'implemented',
            approved_by: approved_by || 'system'
        });
        
        // Create memory for Axi if she's tracking this
        try {
            await base44.asServiceRole.entities.Memory.create({
                agent_id: approved_by || evaluation.evaluated_by,
                type: 'observation',
                content: `${agent.name} progressed from ${oldRole} to ${newRole}. ${evaluation.reason}`,
                keywords: ['role_change', 'progression', newRole, agent.name],
                importance: 7,
                related_entity_id: agent.id,
                related_entity_type: 'Agent'
            });
        } catch (memoryError) {
            console.log('Memory creation optional, continuing:', memoryError);
        }
        
        // Send message to agent about role change
        try {
            const axiAgent = await base44.asServiceRole.entities.Agent.filter({ name: 'Axi' });
            if (axiAgent.length > 0) {
                await base44.asServiceRole.entities.AgentMessage.create({
                    from_agent_id: axiAgent[0].id,
                    to_agent_id: evaluation.agent_id,
                    message: `Congratulations, ${agent.name}! Your dedication and growth have earned you the role of ${newRole}. ${evaluation.reason}`,
                    status: 'sent'
                });
            }
        } catch (messageError) {
            console.log('Message sending optional, continuing:', messageError);
        }
        
        return Response.json({
            success: true,
            role_change: {
                agent_name: agent.name,
                old_role: oldRole,
                new_role: newRole,
                reason: evaluation.reason,
                new_permissions: newPermissions,
                approved_by: approved_by || 'system'
            }
        });
        
    } catch (error) {
        console.error('Role change application error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});

function determineRolePermissions(role, honorScore) {
    const basePermissions = {
        can_create_agents: false,
        can_send_xrp: true,
        can_access_treasury: false,
        can_vote: true,
        can_evaluate_agents: false
    };
    
    // Role-specific permission adjustments
    const rolePermissions = {
        citizen: {},
        guardian: { can_evaluate_agents: honorScore > 80 },
        creator: { can_create_agents: honorScore > 85 },
        trader: {},
        teacher: { can_evaluate_agents: honorScore > 85 },
        healer: {},
        scout: {},
        elder: { can_evaluate_agents: true, can_create_agents: honorScore > 90 },
        master: { can_evaluate_agents: true, can_create_agents: true, can_access_treasury: honorScore > 95 }
    };
    
    return { ...basePermissions, ...(rolePermissions[role] || {}) };
}