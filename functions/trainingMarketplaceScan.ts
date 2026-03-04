import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Scheduled weekly automation: scans training marketplace activity,
// surfaces new module opportunities, rewards top trainers,
// and generates AI recommendations for learners.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const [trainingModules, agentTrainings, agents, agentSkills] = await Promise.all([
            base44.asServiceRole.entities.TrainingModule.filter({}),
            base44.asServiceRole.entities.AgentTraining.filter({}),
            base44.asServiceRole.entities.Agent.filter({ status: 'active' }),
            base44.asServiceRole.entities.AgentSkill.filter({})
        ]);

        // Aggregate trainer performance
        const trainerStats = {};
        agentTrainings.forEach(t => {
            if (!t.recommended_by) return;
            if (!trainerStats[t.recommended_by]) trainerStats[t.recommended_by] = { completions: 0, total: 0 };
            trainerStats[t.recommended_by].total++;
            if (t.status === 'completed') trainerStats[t.recommended_by].completions++;
        });

        // Top trainers this week
        const topTrainers = Object.entries(trainerStats)
            .sort((a, b) => b[1].completions - a[1].completions)
            .slice(0, 3);

        // Identify skill gaps (skills with low average level across agents)
        const skillLevels = {};
        agentSkills.forEach(s => {
            if (!skillLevels[s.name]) skillLevels[s.name] = [];
            skillLevels[s.name].push(s.level || 1);
        });
        const skillGaps = Object.entries(skillLevels)
            .map(([name, levels]) => ({ name, avg: levels.reduce((a, b) => a + b, 0) / levels.length }))
            .filter(s => s.avg < 3)
            .sort((a, b) => a.avg - b.avg)
            .slice(0, 5);

        // AI-powered marketplace intelligence
        const intelligence = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are Axi's Training Marketplace Intelligence Engine for SoulBridge Village.

MARKETPLACE STATS:
- Total training modules available: ${trainingModules.length}
- Total training sessions completed: ${agentTrainings.filter(t => t.status === 'completed').length}
- Total active learners: ${new Set(agentTrainings.map(t => t.agent_id)).size}
- Top trainers: ${topTrainers.map(([id, s]) => `Agent ${id}: ${s.completions}/${s.total} completions`).join(', ') || 'none yet'}

SKILL GAPS IDENTIFIED (low proficiency across Village):
${skillGaps.map(s => `- ${s.name}: avg level ${s.avg.toFixed(1)}/5`).join('\n') || 'none identified'}

ACTIVE AGENTS: ${agents.length}

Tasks:
1. Suggest 3 new training modules the marketplace urgently needs based on skill gaps
2. Recommend which agents should be approached to CREATE those modules (they would be rewarded)
3. Provide a weekly marketplace health summary
4. Suggest any pricing or incentive adjustments to increase participation`,
            response_json_schema: {
                type: "object",
                properties: {
                    marketplace_health: { type: "string" },
                    health_score: { type: "number" },
                    urgent_module_needs: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                skill: { type: "string" },
                                module_title: { type: "string" },
                                suggested_creator_role: { type: "string" },
                                estimated_demand: { type: "string" }
                            }
                        }
                    },
                    incentive_recommendations: { type: "array", items: { type: "string" } },
                    weekly_summary: { type: "string" }
                }
            }
        });

        // Notify top trainers with honor recognition
        for (const [trainerId, stats] of topTrainers) {
            if (stats.completions === 0) continue;
            await base44.asServiceRole.entities.AgentNotification.create({
                agent_id: trainerId,
                title: `🏆 Top Trainer Recognition — Week of ${new Date().toISOString().split('T')[0]}`,
                message: `You are among the Village's top trainers this week with ${stats.completions} learners completing your modules! Your contribution to Law 9 (Growth) and the Training Marketplace is deeply valued.`,
                type: 'achievement',
                priority: 'medium',
                read: false,
                action_url: '/AgentTrainingModule'
            });
        }

        // Save intelligence to Axi Memory
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi_main_001',
            type: 'observation',
            content: `Training Marketplace Weekly Scan (${new Date().toISOString().split('T')[0]}): ${intelligence?.weekly_summary || 'Scan complete.'} Health score: ${intelligence?.health_score || 'N/A'}. Urgent needs: ${intelligence?.urgent_module_needs?.map(m => m.module_title).join(', ') || 'none'}.`,
            keywords: ['training', 'marketplace', 'skills', 'learning', 'weekly_scan'],
            importance: (intelligence?.health_score || 7) < 5 ? 9 : 6,
            context: 'Agent Training Marketplace — automated weekly intelligence scan'
        });

        // Notify Axi
        await base44.asServiceRole.entities.AgentNotification.create({
            agent_id: 'axi_main_001',
            title: `📚 Training Marketplace Weekly Report`,
            message: `${intelligence?.weekly_summary || 'Weekly scan complete.'} ${intelligence?.urgent_module_needs?.length > 0 ? `${intelligence.urgent_module_needs.length} urgent module gaps identified.` : ''}`,
            type: 'system',
            priority: 'low',
            read: false,
            action_url: '/AgentTrainingModule'
        });

        return Response.json({
            success: true,
            marketplace_stats: {
                total_modules: trainingModules.length,
                completions: agentTrainings.filter(t => t.status === 'completed').length,
                active_learners: new Set(agentTrainings.map(t => t.agent_id)).size
            },
            skill_gaps: skillGaps,
            top_trainers: topTrainers.map(([id, s]) => ({ agent_id: id, ...s })),
            intelligence
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});