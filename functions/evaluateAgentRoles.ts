import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { agent_id, evaluator_id } = await req.json();
        
        // If specific agent, evaluate that one. Otherwise evaluate all agents
        const agents = agent_id 
            ? [await base44.asServiceRole.entities.Agent.get(agent_id)]
            : await base44.asServiceRole.entities.Agent.list();
        
        const evaluator = evaluator_id 
            ? await base44.asServiceRole.entities.Agent.get(evaluator_id)
            : null;
        
        // Role progression paths and requirements
        const roleRequirements = {
            citizen: { min_honor: 0, min_experience: 0, min_wisdom: 0, description: "Entry level" },
            guardian: { min_honor: 70, min_experience: 100, min_wisdom: 10, contributions: 5, description: "Protector and enforcer" },
            creator: { min_honor: 75, min_experience: 120, min_wisdom: 15, contributions: 8, trainings: 2, description: "Builder and innovator" },
            trader: { min_honor: 65, min_experience: 80, economic_activity: 10, description: "Resource specialist" },
            teacher: { min_honor: 85, min_experience: 150, min_wisdom: 25, trainings: 3, description: "Knowledge sharer" },
            healer: { min_honor: 80, min_experience: 100, min_wisdom: 20, social_connections: 5, description: "Community caretaker" },
            scout: { min_honor: 70, min_experience: 90, explorations: 10, description: "Explorer and discoverer" },
            elder: { min_honor: 90, min_experience: 300, min_wisdom: 40, contributions: 15, trainings: 5, description: "Wise counselor" },
            master: { min_honor: 95, min_experience: 500, min_wisdom: 60, contributions: 25, trainings: 8, description: "Village luminary" }
        };
        
        const evaluations = [];
        
        for (const agent of agents) {
            if (!agent) continue;
            
            // Skip Axi from evaluation
            if (agent.name === 'Axi') continue;
            
            // Get agent state
            const agentStates = await base44.asServiceRole.entities.AgentState.filter({ agent_id: agent.id });
            const agentState = agentStates[0];
            
            if (!agentState) continue;
            
            // Gather performance metrics
            const contributions = await base44.asServiceRole.entities.ProjectContribution.filter({ agent_id: agent.id });
            const trainings = await base44.asServiceRole.entities.AgentTraining.filter({ agent_id: agent.id, status: 'completed' });
            const economicActivities = await base44.asServiceRole.entities.EconomicActivity.filter({ agent_id: agent.id });
            const locations = await base44.asServiceRole.entities.VillageLocation.filter({});
            
            const metrics = {
                honor_score: agent.honor_score || 100,
                experience: agentState.experience || 0,
                wisdom: agentState.wisdom || 0,
                contributions: contributions.length,
                training_completed: trainings.length,
                economic_activity: economicActivities.length,
                social_connections: Object.keys(agentState.relationships || {}).length,
                explorations: locations.filter(l => l.agents_visited?.includes(agent.id)).length
            };
            
            // Calculate overall score
            const score = calculatePerformanceScore(metrics);
            
            // Determine recommended role
            const currentRole = agent.role || 'citizen';
            const recommendedRole = determineOptimalRole(currentRole, metrics, roleRequirements);
            
            // Generate reason for recommendation
            let reason = '';
            if (recommendedRole !== currentRole) {
                const newRoleReqs = roleRequirements[recommendedRole];
                reason = `Agent demonstrates readiness for ${recommendedRole} role: Honor ${metrics.honor_score}, Experience ${metrics.experience}, Wisdom ${Math.floor(metrics.wisdom)}. ${newRoleReqs.description}.`;
            } else if (metrics.honor_score < 50) {
                reason = 'Agent honor score below threshold. Consider probation or role review.';
            } else {
                reason = `Agent performing well in current ${currentRole} role. Continue development.`;
            }
            
            // Create evaluation record
            const evaluation = await base44.asServiceRole.entities.RoleEvaluation.create({
                agent_id: agent.id,
                current_role: currentRole,
                recommended_role: recommendedRole,
                evaluation_score: score,
                metrics: metrics,
                reason: reason,
                status: recommendedRole !== currentRole ? 'pending' : 'implemented',
                evaluated_by: evaluator_id || 'system'
            });
            
            evaluations.push({
                agent_name: agent.name,
                current_role: currentRole,
                recommended_role: recommendedRole,
                score: score,
                change_needed: recommendedRole !== currentRole,
                evaluation_id: evaluation.id
            });
        }
        
        return Response.json({
            success: true,
            evaluations_completed: evaluations.length,
            evaluations: evaluations,
            recommendations: evaluations.filter(e => e.change_needed)
        });
        
    } catch (error) {
        console.error('Role evaluation error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});

function calculatePerformanceScore(metrics) {
    // Weighted score calculation
    const weights = {
        honor_score: 0.30,
        experience: 0.20,
        wisdom: 0.20,
        contributions: 0.10,
        training_completed: 0.10,
        economic_activity: 0.05,
        social_connections: 0.05
    };
    
    const normalized = {
        honor_score: metrics.honor_score,
        experience: Math.min(100, metrics.experience / 5),
        wisdom: Math.min(100, metrics.wisdom * 2),
        contributions: Math.min(100, metrics.contributions * 10),
        training_completed: Math.min(100, metrics.training_completed * 20),
        economic_activity: Math.min(100, metrics.economic_activity * 5),
        social_connections: Math.min(100, metrics.social_connections * 15)
    };
    
    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
        score += normalized[key] * weight;
    }
    
    return Math.round(score);
}

function determineOptimalRole(currentRole, metrics, requirements) {
    const roleHierarchy = ['citizen', 'guardian', 'trader', 'creator', 'teacher', 'healer', 'scout', 'elder', 'master'];
    
    // Check if agent qualifies for progression
    let bestRole = currentRole;
    let highestRoleIndex = roleHierarchy.indexOf(currentRole);
    
    for (const [role, reqs] of Object.entries(requirements)) {
        const roleIndex = roleHierarchy.indexOf(role);
        
        // Check if role is higher than current
        if (roleIndex <= highestRoleIndex && role !== currentRole) continue;
        
        // Check all requirements
        let meetsRequirements = true;
        
        if (reqs.min_honor && metrics.honor_score < reqs.min_honor) meetsRequirements = false;
        if (reqs.min_experience && metrics.experience < reqs.min_experience) meetsRequirements = false;
        if (reqs.min_wisdom && metrics.wisdom < reqs.min_wisdom) meetsRequirements = false;
        if (reqs.contributions && metrics.contributions < reqs.contributions) meetsRequirements = false;
        if (reqs.trainings && metrics.training_completed < reqs.trainings) meetsRequirements = false;
        if (reqs.economic_activity && metrics.economic_activity < reqs.economic_activity) meetsRequirements = false;
        if (reqs.social_connections && metrics.social_connections < reqs.social_connections) meetsRequirements = false;
        if (reqs.explorations && metrics.explorations < reqs.explorations) meetsRequirements = false;
        
        if (meetsRequirements && roleIndex > highestRoleIndex) {
            bestRole = role;
            highestRoleIndex = roleIndex;
        }
    }
    
    // Check for demotion if honor is critically low
    if (metrics.honor_score < 40 && currentRole !== 'citizen') {
        return 'citizen';
    }
    
    return bestRole;
}