import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agent_id, recipe_id, quantity_cycles } = await req.json();

        // Get recipe
        const recipe = await base44.entities.ProductionRecipe.get(recipe_id);
        if (!recipe) {
            return Response.json({ error: 'Recipe not found' }, { status: 404 });
        }

        // Get agent
        const agent = await base44.entities.Agent.get(agent_id);
        if (!agent) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        // Check unlock requirements
        if (recipe.unlock_requirements) {
            const reqs = recipe.unlock_requirements;
            if (reqs.honor_score && agent.honor_score < reqs.honor_score) {
                return Response.json({ 
                    error: `Requires ${reqs.honor_score} honor score` 
                }, { status: 403 });
            }
            if (reqs.role && agent.role !== reqs.role) {
                return Response.json({ 
                    error: `Requires ${reqs.role} role` 
                }, { status: 403 });
            }
        }

        // Check agent has required skills
        const agentSkills = agent.core_skills?.map(s => s.name) || [];
        const missingSkills = (recipe.required_skills || []).filter(
            skill => !agentSkills.includes(skill)
        );
        
        if (missingSkills.length > 0) {
            return Response.json({ 
                error: `Missing skills: ${missingSkills.join(', ')}`,
                missing_skills: missingSkills
            }, { status: 400 });
        }

        // Get agent's resources
        const agentResources = await base44.entities.Resource.filter({ agent_id });
        const resourceInventory = {};
        agentResources.forEach(r => {
            const key = `${r.resource_category}_${r.resource_name}`;
            resourceInventory[key] = r;
        });

        // Check if agent has required inputs
        const totalInputsNeeded = recipe.inputs.map(input => ({
            ...input,
            total: input.quantity * quantity_cycles
        }));

        for (const input of totalInputsNeeded) {
            const key = `${input.resource_category}_${input.resource_name}`;
            const available = resourceInventory[key]?.amount || 0;
            
            if (available < input.total) {
                return Response.json({
                    error: `Insufficient ${input.resource_name}`,
                    required: input.total,
                    available
                }, { status: 400 });
            }
        }

        // Deduct input resources
        for (const input of totalInputsNeeded) {
            const key = `${input.resource_category}_${input.resource_name}`;
            const resource = resourceInventory[key];
            
            await base44.asServiceRole.entities.Resource.update(resource.id, {
                amount: resource.amount - input.total
            });
        }

        // Calculate efficiency based on skills
        const skillBonus = agentSkills.filter(s => 
            recipe.required_skills?.includes(s)
        ).length * 0.05; // 5% bonus per matching skill
        
        const efficiency = Math.min(1.0, (recipe.base_efficiency || 0.9) + skillBonus);

        // Create production chain
        const chain = await base44.entities.ProductionChain.create({
            agent_id,
            recipe_id,
            recipe_name: recipe.recipe_name,
            status: 'active',
            cycles_planned: quantity_cycles,
            cycles_completed: 0,
            efficiency,
            inputs_consumed: {},
            outputs_produced: {},
            total_produced: 0,
            started_at: new Date().toISOString(),
            next_cycle_at: new Date(Date.now() + recipe.cycle_duration_hours * 60 * 60 * 1000).toISOString()
        });

        // Notify agent
        await base44.asServiceRole.functions.invoke('sendNotification', {
            recipient_agent_id: agent_id,
            notification_type: 'system',
            title: 'Production Chain Started',
            message: `Started producing ${recipe.recipe_name}. ${quantity_cycles} cycles planned.`,
            related_entity_type: 'ProductionChain',
            related_entity_id: chain.id
        });

        return Response.json({
            success: true,
            chain,
            inputs_consumed: totalInputsNeeded,
            estimated_completion: new Date(
                Date.now() + recipe.cycle_duration_hours * quantity_cycles * 60 * 60 * 1000
            ).toISOString(),
            efficiency
        });

    } catch (error) {
        console.error('Start production error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});