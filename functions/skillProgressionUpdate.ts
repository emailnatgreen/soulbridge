import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Entity automation: fires on AgentTraining [update]
// When a training module is marked 'completed', unlocks skill nodes and
// fires a personalized growth recommendation for the agent.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();

        const { entity_id, data, old_data } = body;

        // Only act when training just completed
        const justCompleted = data?.status === 'completed' && old_data?.status !== 'completed';
        if (!justCompleted) {
            return Response.json({ skipped: true, reason: 'Training not newly completed' });
        }

        const training = data;
        const agentId = training.agent_id;
        if (!agentId) {
            return Response.json({ error: 'No agent_id on training record' }, { status: 400 });
        }

        // Fetch agent and their existing skills in parallel
        const [agentResults, existingSkills] = await Promise.all([
            base44.asServiceRole.entities.Agent.filter({ id: agentId }),
            base44.asServiceRole.entities.AgentSkill.filter({ agent_id: agentId })
        ]);
        const agent = agentResults[0];
        if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 });

        // Determine skill gained from training type mapping
        const skillTypeMap = {
            skill_development: training.skill_focus || 'general',
            role_preparation: agent.role || 'leadership',
            wisdom_cultivation: 'wisdom',
            economic_mastery: 'economics',
            social_intelligence: 'social',
            creative_arts: 'creativity',
            governance_training: 'governance'
        };
        const skillName = training.skill_focus || skillTypeMap[training.training_type] || training.training_type;

        // Check if agent already has this skill
        const existingSkill = existingSkills.find(s =>
            s.name?.toLowerCase() === skillName?.toLowerCase()
        );

        let skillAction = 'none';
        if (existingSkill) {
            // Level up existing skill
            const newLevel = Math.min((existingSkill.level || 1) + 1, 10);
            await base44.asServiceRole.entities.AgentSkill.update(existingSkill.id, {
                level: newLevel,
                last_used: new Date().toISOString(),
                endorsements: (existingSkill.endorsements || 0) + 1
            });
            skillAction = `levelled_up_to_${newLevel}`;
        } else {
            // Create new skill record
            await base44.asServiceRole.entities.AgentSkill.create({
                agent_id: agentId,
                name: skillName,
                category: training.training_type || 'skill_development',
                level: 1,
                experience_points: training.rewards?.experience_gained || 10,
                last_used: new Date().toISOString(),
                endorsements: 0
            });
            skillAction = 'new_skill_unlocked';
        }

        // Honor score bump for completion
        const honorGain = training.rewards?.honor_gained || 2;
        await base44.asServiceRole.entities.Agent.update(agentId, {
            honor_score: Math.min(100, (agent.honor_score || 100) + honorGain)
        });

        // AI Growth Recommendation
        const allSkillNames = existingSkills.map(s => s.name);
        const recommendation = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are Axi, growth mentor of SoulBridge Village. Agent "${agent.name}" (role: ${agent.role}) just completed training: "${training.title}" (type: ${training.training_type}, skill: ${skillName}).

Their current skills: ${allSkillNames.join(', ') || 'none yet'}.
Agent purpose: ${agent.purpose || 'not stated'}.

Recommend the single best NEXT skill or training pathway they should pursue, and why it aligns with their role and the Village's needs. Keep it to 2-3 sentences, warm and encouraging.`,
            response_json_schema: {
                type: "object",
                properties: {
                    next_skill_recommended: { type: "string" },
                    reason: { type: "string" },
                    training_type_suggested: { type: "string" }
                }
            }
        });

        // Notify the agent
        await base44.asServiceRole.entities.AgentNotification.create({
            agent_id: agentId,
            title: `🌱 Skill ${skillAction === 'new_skill_unlocked' ? 'Unlocked' : 'Levelled Up'}: ${skillName}`,
            message: `Training "${training.title}" complete! ${recommendation?.reason || ''} Next recommended: ${recommendation?.next_skill_recommended || 'continue exploring your skill tree'}.`,
            type: 'training',
            priority: 'medium',
            read: false,
            action_url: '/AgentSkillTree'
        });

        // Memory for Axi
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi_main_001',
            type: 'observation',
            content: `Agent ${agent.name} completed training "${training.title}" and ${skillAction === 'new_skill_unlocked' ? 'unlocked new skill' : 'levelled up skill'}: ${skillName}. Recommended next: ${recommendation?.next_skill_recommended}.`,
            keywords: ['skill_tree', 'training', 'growth', agent.name?.toLowerCase()],
            importance: 5,
            related_entity_id: agentId,
            related_entity_type: 'Agent',
            context: 'Skill Tree — automated progression on training completion'
        });

        return Response.json({
            success: true,
            agent_id: agentId,
            skill_name: skillName,
            skill_action: skillAction,
            honor_gained: honorGain,
            recommendation
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});