import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const { agent_id, skill_id, success = true, context } = await req.json();

        if (!agent_id || !skill_id) {
            return Response.json({ error: 'agent_id and skill_id are required' }, { status: 400 });
        }

        // Get skill
        const skills = await base44.asServiceRole.entities.AgentSkill.filter({ 
            agent_id: agent_id,
            skill_id: skill_id 
        });

        if (skills.length === 0) {
            return Response.json({ error: 'Skill not found for this agent' }, { status: 404 });
        }

        const skill = skills[0];

        // Calculate new success rate
        const totalUses = (skill.times_used || 0) + 1;
        const previousSuccesses = Math.round(((skill.success_rate || 100) / 100) * (skill.times_used || 0));
        const newSuccesses = previousSuccesses + (success ? 1 : 0);
        const newSuccessRate = (newSuccesses / totalUses) * 100;

        // Calculate proficiency gain (success adds more, failure adds less)
        const proficiencyGain = success ? 2 : 0.5;
        const newProficiency = Math.min(100, (skill.proficiency_score || 0) + proficiencyGain);

        // Update skill
        await base44.asServiceRole.entities.AgentSkill.update(skill.id, {
            times_used: totalUses,
            success_rate: newSuccessRate,
            proficiency_score: newProficiency,
            last_used: new Date().toISOString()
        });

        // Award XP for skill usage
        const xpGain = success ? 10 : 5;
        const agentStates = await base44.asServiceRole.entities.AgentState.filter({ agent_id: agent_id });
        if (agentStates.length > 0) {
            const state = agentStates[0];
            await base44.asServiceRole.entities.AgentState.update(state.id, {
                experience: (state.experience || 0) + xpGain
            });
        }

        // Check for level up (every 100 proficiency points = 1 level)
        const levelUpsEarned = Math.floor(newProficiency / 10) - (skill.level || 1) + 1;
        if (levelUpsEarned > 0 && skill.level < (skill.max_level || 10)) {
            const newLevel = Math.min(skill.level + levelUpsEarned, skill.max_level || 10);
            await base44.asServiceRole.entities.AgentSkill.update(skill.id, {
                level: newLevel,
                last_upgraded: new Date().toISOString()
            });

            // Award reputation for level up
            await base44.asServiceRole.entities.ReputationEvent.create({
                agent_id: agent_id,
                event_type: 'skill_validated',
                impact: 5 * levelUpsEarned,
                category: 'skill_mastery',
                description: `Advanced ${skill.skill_name} to level ${newLevel}`,
                related_entity_type: 'AgentSkill',
                related_entity_id: skill.id,
                verified: true,
                verified_by: 'system'
            });
        }

        return Response.json({
            success: true,
            skill_updated: {
                times_used: totalUses,
                success_rate: newSuccessRate,
                proficiency_score: newProficiency,
                level: skill.level + (levelUpsEarned > 0 ? levelUpsEarned : 0)
            },
            xp_gained: xpGain,
            level_up: levelUpsEarned > 0
        });

    } catch (error) {
        console.error('Error in trackSkillUsage:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});