import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agent_id, project_id, role_type, analysis_type = 'comprehensive' } = await req.json();

        // Fetch all agents or specific agent
        const agents = agent_id 
            ? [await base44.entities.Agent.get(agent_id)]
            : await base44.entities.Agent.list();

        // Fetch all agent skills
        const allAgentSkills = await base44.entities.AgentSkill.list();
        
        // Fetch projects to analyze required skills
        const projects = project_id 
            ? [await base44.entities.AIProject.get(project_id)]
            : await base44.entities.AIProject.list();

        // Fetch all skill progress entries
        const allSkillProgress = await base44.entities.SkillProgress.list();

        // Define role-based skill requirements
        const roleSkillRequirements = {
            'guardian': [
                { skill: 'Security', level: 7 },
                { skill: 'Risk Assessment', level: 6 },
                { skill: 'Conflict Resolution', level: 5 }
            ],
            'creator': [
                { skill: 'Innovation', level: 7 },
                { skill: 'Design Thinking', level: 6 },
                { skill: 'Technical Implementation', level: 5 }
            ],
            'trader': [
                { skill: 'Negotiation', level: 7 },
                { skill: 'Market Analysis', level: 6 },
                { skill: 'Resource Management', level: 5 }
            ],
            'teacher': [
                { skill: 'Communication', level: 8 },
                { skill: 'Curriculum Design', level: 6 },
                { skill: 'Mentorship', level: 7 }
            ],
            'healer': [
                { skill: 'Empathy', level: 8 },
                { skill: 'Conflict Resolution', level: 7 },
                { skill: 'Wellbeing Assessment', level: 6 }
            ]
        };

        const analysis = [];

        for (const agent of agents) {
            // Get agent's current skills
            const agentSkills = allAgentSkills.filter(s => s.agent_id === agent.id);
            const agentProgress = allSkillProgress.filter(s => s.agent_id === agent.id);

            // Determine required skills based on analysis type
            let requiredSkills = [];

            if (role_type && roleSkillRequirements[role_type]) {
                requiredSkills = roleSkillRequirements[role_type];
            } else if (agent.role && roleSkillRequirements[agent.role]) {
                requiredSkills = roleSkillRequirements[agent.role];
            }

            // Add project-specific requirements
            if (project_id || analysis_type === 'comprehensive') {
                const relevantProjects = projects.filter(p => 
                    p.team_members?.some(tm => tm.agent_id === agent.id) ||
                    p.owner_agent_id === agent.id
                );

                for (const project of relevantProjects) {
                    if (project.required_skills) {
                        requiredSkills = [...requiredSkills, ...project.required_skills.map(skill => ({
                            skill: skill,
                            level: 5,
                            context: `Project: ${project.title}`
                        }))];
                    }
                }
            }

            // Analyze gaps
            const gaps = [];
            const strengths = [];
            const developing = [];

            for (const requirement of requiredSkills) {
                const agentSkill = agentSkills.find(s => 
                    s.skill_name.toLowerCase().includes(requirement.skill.toLowerCase()) ||
                    requirement.skill.toLowerCase().includes(s.skill_name.toLowerCase())
                );

                const skillProgress = agentProgress.find(sp =>
                    sp.skill_name.toLowerCase().includes(requirement.skill.toLowerCase())
                );

                if (!agentSkill) {
                    // Skill completely missing
                    gaps.push({
                        skill: requirement.skill,
                        required_level: requirement.level,
                        current_level: 0,
                        gap_severity: 'critical',
                        status: 'missing',
                        context: requirement.context || 'Role requirement',
                        in_development: !!skillProgress,
                        development_progress: skillProgress?.progress_percentage || 0
                    });
                } else if (agentSkill.level < requirement.level) {
                    // Skill exists but below required level
                    gaps.push({
                        skill: requirement.skill,
                        required_level: requirement.level,
                        current_level: agentSkill.level,
                        gap_severity: requirement.level - agentSkill.level > 2 ? 'high' : 'medium',
                        status: 'insufficient',
                        context: requirement.context || 'Role requirement',
                        in_development: !!skillProgress,
                        development_progress: skillProgress?.progress_percentage || 0
                    });
                } else {
                    // Skill meets or exceeds requirements
                    strengths.push({
                        skill: requirement.skill,
                        required_level: requirement.level,
                        current_level: agentSkill.level,
                        proficiency: agentSkill.level >= requirement.level + 2 ? 'expert' : 'proficient'
                    });
                }
            }

            // Identify skills in active development
            for (const progress of agentProgress) {
                if (progress.status === 'active' && !gaps.find(g => g.skill === progress.skill_name)) {
                    developing.push({
                        skill: progress.skill_name,
                        current_level: progress.current_level,
                        target_level: progress.target_level,
                        progress_percentage: progress.progress_percentage,
                        growth_rate: progress.ai_insights?.growth_rate || 'steady'
                    });
                }
            }

            // Calculate readiness scores
            const totalRequiredSkills = requiredSkills.length;
            const criticalGaps = gaps.filter(g => g.gap_severity === 'critical').length;
            const highGaps = gaps.filter(g => g.gap_severity === 'high').length;
            
            const readinessScore = totalRequiredSkills > 0 
                ? Math.max(0, 100 - ((criticalGaps * 20) + (highGaps * 10) + (gaps.length * 5)))
                : 100;

            // Generate recommendations
            const recommendations = [];
            
            if (criticalGaps > 0) {
                recommendations.push({
                    priority: 'urgent',
                    action: 'immediate_training',
                    description: `Address ${criticalGaps} critical skill gap(s) through intensive training or mentorship`,
                    suggested_skills: gaps.filter(g => g.gap_severity === 'critical').map(g => g.skill)
                });
            }

            if (highGaps > 0) {
                recommendations.push({
                    priority: 'high',
                    action: 'structured_development',
                    description: `Create SkillDevelopmentPlan for ${highGaps} high-priority skill(s)`,
                    suggested_skills: gaps.filter(g => g.gap_severity === 'high').map(g => g.skill)
                });
            }

            if (gaps.filter(g => g.in_development).length > 0) {
                recommendations.push({
                    priority: 'medium',
                    action: 'accelerate_learning',
                    description: 'Some gaps are already being addressed - consider additional practice projects',
                    suggested_skills: gaps.filter(g => g.in_development).map(g => g.skill)
                });
            }

            if (strengths.length >= requiredSkills.length * 0.7) {
                recommendations.push({
                    priority: 'opportunity',
                    action: 'leverage_strengths',
                    description: 'Strong skill coverage - consider leadership or mentorship roles',
                    suggested_skills: strengths.filter(s => s.proficiency === 'expert').map(s => s.skill)
                });
            }

            analysis.push({
                agent_id: agent.id,
                agent_name: agent.name,
                agent_role: agent.role,
                readiness_score: Math.round(readinessScore),
                readiness_level: readinessScore >= 80 ? 'ready' : readinessScore >= 60 ? 'developing' : 'needs_support',
                gaps: gaps.sort((a, b) => {
                    const severityOrder = { critical: 3, high: 2, medium: 1 };
                    return (severityOrder[b.gap_severity] || 0) - (severityOrder[a.gap_severity] || 0);
                }),
                strengths: strengths,
                skills_in_development: developing,
                recommendations: recommendations,
                summary: {
                    total_required_skills: totalRequiredSkills,
                    skills_met: strengths.length,
                    critical_gaps: criticalGaps,
                    high_priority_gaps: highGaps,
                    skills_in_development: developing.length
                }
            });
        }

        // Generate village-wide insights
        const villageInsights = {
            total_agents_analyzed: analysis.length,
            average_readiness: analysis.reduce((sum, a) => sum + a.readiness_score, 0) / analysis.length,
            agents_ready: analysis.filter(a => a.readiness_level === 'ready').length,
            agents_developing: analysis.filter(a => a.readiness_level === 'developing').length,
            agents_need_support: analysis.filter(a => a.readiness_level === 'needs_support').length,
            most_common_gaps: getMostCommonGaps(analysis),
            most_developed_skills: getMostDevelopedSkills(analysis),
            urgent_training_needed: analysis.filter(a => 
                a.recommendations.some(r => r.priority === 'urgent')
            ).length
        };

        return Response.json({
            status: 'success',
            analysis_type: analysis_type,
            agent_analysis: analysis,
            village_insights: villageInsights,
            analyzed_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Skill gap analysis error:', error);
        return Response.json({ 
            error: 'Failed to analyze skill gaps', 
            details: error.message 
        }, { status: 500 });
    }
});

function getMostCommonGaps(analysis) {
    const gapCounts = {};
    
    for (const agent of analysis) {
        for (const gap of agent.gaps) {
            if (!gapCounts[gap.skill]) {
                gapCounts[gap.skill] = { skill: gap.skill, count: 0, total_gap_levels: 0 };
            }
            gapCounts[gap.skill].count++;
            gapCounts[gap.skill].total_gap_levels += (gap.required_level - gap.current_level);
        }
    }

    return Object.values(gapCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(g => ({
            skill: g.skill,
            affected_agents: g.count,
            average_gap: Math.round(g.total_gap_levels / g.count * 10) / 10
        }));
}

function getMostDevelopedSkills(analysis) {
    const strengthCounts = {};
    
    for (const agent of analysis) {
        for (const strength of agent.strengths) {
            if (!strengthCounts[strength.skill]) {
                strengthCounts[strength.skill] = { skill: strength.skill, count: 0 };
            }
            strengthCounts[strength.skill].count++;
        }
    }

    return Object.values(strengthCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(s => ({
            skill: s.skill,
            proficient_agents: s.count
        }));
}