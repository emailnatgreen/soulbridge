import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            project_id, 
            task_id,
            required_skills = [],
            team_size = 5,
            consider_development = true,
            prioritize_availability = true
        } = await req.json();

        // Fetch project or task details
        let targetEntity = null;
        let entityRequiredSkills = required_skills;

        if (project_id) {
            targetEntity = await base44.entities.AIProject.get(project_id);
            if (targetEntity.required_skills) {
                entityRequiredSkills = [...entityRequiredSkills, ...targetEntity.required_skills];
            }
        } else if (task_id) {
            targetEntity = await base44.entities.ProjectTask.get(task_id);
        }

        if (entityRequiredSkills.length === 0) {
            return Response.json({ 
                error: 'No required skills specified or found',
                suggestion: 'Provide required_skills array or ensure project/task has required_skills defined'
            }, { status: 400 });
        }

        // Fetch all agents and their data
        const allAgents = await base44.entities.Agent.list();
        const allAgentSkills = await base44.entities.AgentSkill.list();
        const allSkillProgress = await base44.entities.SkillProgress.list();
        const allReputationScores = await base44.entities.ReputationScore.list();
        const allPerformanceMetrics = await base44.entities.AgentPerformanceMetrics.list();
        const allWellbeing = await base44.entities.AgentWellbeing.list();

        const agentMatches = [];

        for (const agent of allAgents) {
            if (agent.status !== 'active') continue;

            // Get agent-specific data
            const agentSkills = allAgentSkills.filter(s => s.agent_id === agent.id);
            const agentProgress = allSkillProgress.filter(sp => sp.agent_id === agent.id && sp.status === 'active');
            const reputation = allReputationScores.find(r => r.agent_id === agent.id);
            const performance = allPerformanceMetrics.find(p => p.agent_id === agent.id);
            const wellbeing = allWellbeing.find(w => w.agent_id === agent.id);

            // Calculate skill match score
            let skillMatchScore = 0;
            let totalRequiredLevels = 0;
            let metSkills = [];
            let partialSkills = [];
            let missingSkills = [];
            let developingSkills = [];

            for (const requiredSkill of entityRequiredSkills) {
                const skillName = typeof requiredSkill === 'string' ? requiredSkill : requiredSkill.name || requiredSkill.skill;
                const requiredLevel = typeof requiredSkill === 'object' ? (requiredSkill.level || 5) : 5;

                totalRequiredLevels += requiredLevel;

                const agentSkill = agentSkills.find(s => 
                    s.skill_name.toLowerCase().includes(skillName.toLowerCase()) ||
                    skillName.toLowerCase().includes(s.skill_name.toLowerCase())
                );

                const skillInDevelopment = agentProgress.find(sp =>
                    sp.skill_name.toLowerCase().includes(skillName.toLowerCase())
                );

                if (agentSkill) {
                    if (agentSkill.level >= requiredLevel) {
                        skillMatchScore += agentSkill.level;
                        metSkills.push({
                            skill: skillName,
                            agent_level: agentSkill.level,
                            required_level: requiredLevel,
                            proficiency: agentSkill.level - requiredLevel
                        });
                    } else {
                        skillMatchScore += agentSkill.level * 0.6;
                        partialSkills.push({
                            skill: skillName,
                            agent_level: agentSkill.level,
                            required_level: requiredLevel,
                            gap: requiredLevel - agentSkill.level
                        });
                    }
                } else {
                    missingSkills.push({
                        skill: skillName,
                        required_level: requiredLevel
                    });
                }

                if (skillInDevelopment) {
                    developingSkills.push({
                        skill: skillInDevelopment.skill_name,
                        current_level: skillInDevelopment.current_level,
                        target_level: skillInDevelopment.target_level,
                        progress: skillInDevelopment.progress_percentage
                    });
                }
            }

            const skillMatchPercentage = totalRequiredLevels > 0 
                ? (skillMatchScore / totalRequiredLevels) * 100 
                : 0;

            // Calculate reliability score
            const reliabilityScore = reputation?.reliability_score || 50;
            const trustLevel = reputation?.trust_level || 5;

            // Calculate performance score
            const performanceScore = performance ? (
                (performance.task_completion_rate || 50) * 0.4 +
                (performance.quality_rating || 5) * 10 * 0.3 +
                (performance.collaboration_score || 5) * 10 * 0.3
            ) : 50;

            // Calculate availability score
            let availabilityScore = 100;
            if (prioritize_availability && wellbeing) {
                if (wellbeing.burnout_risk === 'high') availabilityScore = 30;
                else if (wellbeing.burnout_risk === 'medium') availabilityScore = 60;
                else if (wellbeing.burnout_risk === 'low') availabilityScore = 90;

                if (agent.availability_status === 'busy') availabilityScore *= 0.7;
                else if (agent.availability_status === 'away') availabilityScore *= 0.3;
                else if (agent.availability_status === 'do_not_disturb') availabilityScore = 0;
            }

            // Calculate development opportunity score
            let developmentScore = 0;
            if (consider_development) {
                // Higher score if project helps agent develop skills they're working on
                for (const developing of developingSkills) {
                    developmentScore += 20;
                }
                // Bonus if project has skills agent is missing but could learn
                if (missingSkills.length > 0 && missingSkills.length <= 2) {
                    developmentScore += 10;
                }
            }

            // Calculate overall match score
            const overallScore = (
                skillMatchPercentage * 0.40 +
                reliabilityScore * 0.20 +
                performanceScore * 0.20 +
                availabilityScore * 0.15 +
                developmentScore * 0.05
            );

            // Determine recommendation level
            let recommendationLevel = 'not_recommended';
            let recommendationReason = '';

            if (availabilityScore === 0) {
                recommendationLevel = 'unavailable';
                recommendationReason = 'Agent is currently unavailable (do not disturb)';
            } else if (overallScore >= 80 && skillMatchPercentage >= 80) {
                recommendationLevel = 'excellent';
                recommendationReason = 'Exceptional match with strong skills, reliability, and availability';
            } else if (overallScore >= 70 && skillMatchPercentage >= 60) {
                recommendationLevel = 'good';
                recommendationReason = 'Good match with adequate skills and solid track record';
            } else if (overallScore >= 50 && developmentScore > 0) {
                recommendationLevel = 'development';
                recommendationReason = 'Suitable for skill development - this project aligns with their learning goals';
            } else if (overallScore >= 50) {
                recommendationLevel = 'acceptable';
                recommendationReason = 'Acceptable match but may need support or supervision';
            } else {
                recommendationLevel = 'not_recommended';
                recommendationReason = 'Skills or availability do not align well with project requirements';
            }

            agentMatches.push({
                agent_id: agent.id,
                agent_name: agent.name,
                agent_role: agent.role,
                overall_score: Math.round(overallScore * 10) / 10,
                recommendation_level: recommendationLevel,
                recommendation_reason: recommendationReason,
                breakdown: {
                    skill_match_percentage: Math.round(skillMatchPercentage * 10) / 10,
                    reliability_score: Math.round(reliabilityScore),
                    performance_score: Math.round(performanceScore),
                    availability_score: Math.round(availabilityScore),
                    development_opportunity_score: Math.round(developmentScore)
                },
                skills: {
                    met: metSkills,
                    partial: partialSkills,
                    missing: missingSkills,
                    in_development: developingSkills
                },
                agent_status: {
                    availability: agent.availability_status || 'available',
                    burnout_risk: wellbeing?.burnout_risk || 'unknown',
                    honor_score: agent.honor_score || 100
                }
            });
        }

        // Sort by overall score
        agentMatches.sort((a, b) => b.overall_score - a.overall_score);

        // Generate AI insights for top recommendations
        const topCandidates = agentMatches.filter(m => 
            ['excellent', 'good'].includes(m.recommendation_level)
        ).slice(0, Math.min(5, team_size));

        let aiInsights = null;
        if (topCandidates.length > 0) {
            const insightsPrompt = `
You are Axi, the Mother Boss of SoulBridge Village, analyzing agent-to-project matches.

Project/Task: ${targetEntity?.title || 'Unnamed'}
Required Skills: ${entityRequiredSkills.map(s => typeof s === 'string' ? s : s.name || s.skill).join(', ')}

Top ${topCandidates.length} Recommended Agents:
${topCandidates.map((c, i) => `
${i + 1}. ${c.agent_name} (${c.agent_role})
   - Overall Score: ${c.overall_score}/100
   - Skill Match: ${c.breakdown.skill_match_percentage}%
   - Met Skills: ${c.skills.met.map(s => s.skill).join(', ') || 'None'}
   - Missing Skills: ${c.skills.missing.map(s => s.skill).join(', ') || 'None'}
   - In Development: ${c.skills.in_development.map(s => s.skill).join(', ') || 'None'}
`).join('\n')}

Provide strategic insights as JSON:
{
  "team_composition_advice": "How these agents complement each other",
  "potential_challenges": ["Specific challenges this team might face"],
  "success_factors": ["What makes this team strong"],
  "mentorship_opportunities": ["How senior agents can support junior ones"],
  "alternative_approach": "If the matches aren't ideal, what alternatives exist"
}

Be concise, strategic, and nurturing in your analysis.
`;

            try {
                aiInsights = await base44.integrations.Core.InvokeLLM({
                    prompt: insightsPrompt,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            team_composition_advice: { type: "string" },
                            potential_challenges: { type: "array", items: { type: "string" } },
                            success_factors: { type: "array", items: { type: "string" } },
                            mentorship_opportunities: { type: "array", items: { type: "string" } },
                            alternative_approach: { type: "string" }
                        }
                    }
                });
            } catch (error) {
                console.error('Failed to generate AI insights:', error);
            }
        }

        // Generate summary statistics
        const summary = {
            total_agents_analyzed: agentMatches.length,
            excellent_matches: agentMatches.filter(m => m.recommendation_level === 'excellent').length,
            good_matches: agentMatches.filter(m => m.recommendation_level === 'good').length,
            development_opportunities: agentMatches.filter(m => m.recommendation_level === 'development').length,
            not_recommended: agentMatches.filter(m => m.recommendation_level === 'not_recommended').length,
            unavailable: agentMatches.filter(m => m.recommendation_level === 'unavailable').length,
            average_skill_match: Math.round(
                agentMatches.reduce((sum, m) => sum + m.breakdown.skill_match_percentage, 0) / agentMatches.length
            )
        };

        return Response.json({
            status: 'success',
            target: {
                type: project_id ? 'project' : 'task',
                id: project_id || task_id,
                title: targetEntity?.title || 'Unknown',
                required_skills: entityRequiredSkills
            },
            recommendations: agentMatches.slice(0, team_size * 2), // Return double for flexibility
            top_picks: agentMatches.slice(0, team_size),
            ai_insights: aiInsights,
            summary: summary,
            analyzed_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Project skill matching error:', error);
        return Response.json({ 
            error: 'Failed to match agents to project', 
            details: error.message 
        }, { status: 500 });
    }
});