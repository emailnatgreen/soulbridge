import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agent_id, recipe_name } = await req.json();

        if (!agent_id || !recipe_name) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Predefined recipes
        const recipes = {
            'lumber_to_planks': {
                input: { lumber: 2 },
                output: 'planks',
                output_amount: 5,
                skill_category: 'technical'
            },
            'stone_to_bricks': {
                input: { stone: 3 },
                output: 'bricks',
                output_amount: 4,
                skill_category: 'technical'
            },
            'herb_to_medicine': {
                input: { herb: 5 },
                output: 'medicine',
                output_amount: 2,
                skill_category: 'wisdom'
            },
            'metal_to_tools': {
                input: { metal: 4 },
                output: 'tools',
                output_amount: 1,
                skill_category: 'technical'
            },
            'crystal_to_energy': {
                input: { crystal: 2 },
                output: 'energy',
                output_amount: 10,
                skill_category: 'wisdom'
            },
            'food_processing': {
                input: { food: 3 },
                output: 'preserved_food',
                output_amount: 5,
                skill_category: 'resource_management'
            }
        };

        const recipe = recipes[recipe_name];
        if (!recipe) {
            return Response.json({ error: 'Invalid recipe' }, { status: 400 });
        }

        // Check agent skills for efficiency bonus
        const skills = await base44.entities.AgentSkill.filter({ 
            agent_id, 
            skill_category: recipe.skill_category 
        });
        
        const skillLevel = skills[0]?.level || 0;
        const skillBonus = skillLevel * 0.1; // 10% bonus per skill level

        // Create production chain
        const chain = await base44.entities.ProductionChain.create({
            agent_id,
            recipe_name,
            input_resources: recipe.input,
            output_resource: recipe.output,
            output_amount: recipe.output_amount,
            production_rate: 1,
            efficiency: 1.0,
            skill_bonus: skillBonus,
            status: 'active'
        });

        return Response.json({
            success: true,
            chain,
            skill_bonus: skillBonus,
            message: `Production chain created: ${recipe_name}`
        });

    } catch (error) {
        console.error('Error creating production chain:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});