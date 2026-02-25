import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            agent_id, 
            declared_skills = [], 
            interests = [], 
            goals = [],
            preferred_role,
            experience_level = 'beginner'
        } = await req.json();

        if (!agent_id) {
            return Response.json({ error: 'agent_id is required' }, { status: 400 });
        }

        // Fetch the agent
        const agent = await base44.entities.Agent.get(agent_id);
        
        if (!agent) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        // Step 1: Record declared skills
        const createdSkills = [];
        for (const skill of declared_skills) {
            const agentSkill = await base44.entities.AgentSkill.create({
                agent_id: agent_id,
                skill_name: skill.name,
                skill_category: skill.category || 'General',
                level: skill.level || 1,
                description: skill.description || `${skill.name} skill`,
                is_verified: false,
                endorsement_count: 0
            });
            createdSkills.push(agentSkill);
        }

        // Step 2: Run skill gap analysis based on preferred role
        const gapAnalysisPayload = {
            agent_id: agent_id,
            analysis_type: 'comprehensive',
            ...(preferred_role && { role_type: preferred_role })
        };
        
        const gapAnalysisResponse = await base44.functions.invoke('analyzeSkillGaps', gapAnalysisPayload);
        const gapAnalysis = gapAnalysisResponse.data.agent_analysis[0];

        // Step 3: Generate personalized development plan using AI
        const developmentPlanPrompt = `
You are Axi, the Mother Boss of SoulBridge Village. A new agent named "${agent.name}" has just joined.

Agent Profile:
- Role: ${preferred_role || agent.role}
- Experience Level: ${experience_level}
- Declared Skills: ${declared_skills.map(s => `${s.name} (Level ${s.level})`).join(', ')}
- Interests: ${interests.join(', ')}
- Goals: ${goals.join(', ')}

Skill Gap Analysis Results:
- Readiness Score: ${gapAnalysis.readiness_score}%
- Critical Gaps: ${gapAnalysis.gaps.filter(g => g.gap_severity === 'critical').map(g => g.skill).join(', ') || 'None'}
- High Priority Gaps: ${gapAnalysis.gaps.filter(g => g.gap_severity === 'high').map(g => g.skill).join(', ') || 'None'}
- Existing Strengths: ${gapAnalysis.strengths.map(s => s.skill).join(', ') || 'Still discovering'}

Create a personalized, nurturing, and actionable 90-day development plan for this agent. Structure your response as JSON:

{
  "welcome_message": "A warm, personalized welcome message that acknowledges their strengths and gently introduces areas for growth",
  "immediate_focus": ["3-4 specific skills to develop in the first 30 days"],
  "short_term_goals": ["3-4 achievable goals for the first 90 days"],
  "recommended_path": "A narrative description of their development journey",
  "priority_skills": [
    {
      "skill": "skill name",
      "target_level": 5,
      "rationale": "why this skill is important for them",
      "suggested_activities": ["specific learning activities"]
    }
  ],
  "mentorship_needs": ["types of expertise they would benefit from learning"],
  "initial_projects": ["types of projects that would help them learn and contribute"]
}

Be encouraging, specific, and aligned with SoulBridge's values of growth, honour, and community.
`;

        const aiPlanResponse = await base44.integrations.Core.InvokeLLM({
            prompt: developmentPlanPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    welcome_message: { type: "string" },
                    immediate_focus: { type: "array", items: { type: "string" } },
                    short_term_goals: { type: "array", items: { type: "string" } },
                    recommended_path: { type: "string" },
                    priority_skills: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                skill: { type: "string" },
                                target_level: { type: "number" },
                                rationale: { type: "string" },
                                suggested_activities: { type: "array", items: { type: "string" } }
                            }
                        }
                    },
                    mentorship_needs: { type: "array", items: { type: "string" } },
                    initial_projects: { type: "array", items: { type: "string" } }
                }
            }
        });

        const developmentPlan = aiPlanResponse;

        // Step 4: Create SkillDevelopmentPlan entity
        const skillDevPlan = await base44.entities.SkillDevelopmentPlan.create({
            agent_id: agent_id,
            plan_name: `${agent.name}'s Onboarding Journey`,
            description: developmentPlan.recommended_path,
            target_role: preferred_role || agent.role,
            duration_weeks: 12,
            status: 'active',
            objectives: developmentPlan.short_term_goals,
            milestones: [
                {
                    milestone: 'Complete Initial Assessment',
                    target_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    completed: true
                },
                {
                    milestone: '30-Day Skill Development Review',
                    target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    completed: false
                },
                {
                    milestone: '90-Day Progress Evaluation',
                    target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
                    completed: false
                }
            ]
        });

        // Step 5: Create SkillProgress entries for priority skills
        const skillProgressEntries = [];
        for (const prioritySkill of developmentPlan.priority_skills) {
            const existingSkill = createdSkills.find(s => 
                s.skill_name.toLowerCase().includes(prioritySkill.skill.toLowerCase())
            );
            
            const startingLevel = existingSkill ? existingSkill.level : 0;
            
            const skillProgress = await base44.entities.SkillProgress.create({
                agent_id: agent_id,
                development_plan_id: skillDevPlan.id,
                skill_name: prioritySkill.skill,
                starting_level: startingLevel,
                current_level: startingLevel,
                target_level: prioritySkill.target_level,
                progress_percentage: 0,
                status: 'active',
                activities_completed: [],
                started_date: new Date().toISOString(),
                ai_insights: {
                    rationale: prioritySkill.rationale,
                    suggested_activities: prioritySkill.suggested_activities,
                    growth_rate: 'beginning'
                }
            });
            
            skillProgressEntries.push(skillProgress);
        }

        // Step 6: Find and recommend mentors
        const mentorMatches = [];
        if (developmentPlan.mentorship_needs.length > 0) {
            const allAgents = await base44.entities.Agent.list();
            const allAgentSkills = await base44.entities.AgentSkill.list();
            
            for (const mentorshipNeed of developmentPlan.mentorship_needs) {
                // Find agents with high proficiency in needed areas
                const potentialMentors = allAgents.filter(a => {
                    if (a.id === agent_id) return false;
                    
                    const mentorSkills = allAgentSkills.filter(s => s.agent_id === a.id);
                    return mentorSkills.some(skill => 
                        skill.skill_name.toLowerCase().includes(mentorshipNeed.toLowerCase()) &&
                        skill.level >= 6
                    );
                });
                
                if (potentialMentors.length > 0) {
                    mentorMatches.push({
                        expertise_area: mentorshipNeed,
                        recommended_mentors: potentialMentors.slice(0, 3).map(m => ({
                            agent_id: m.id,
                            agent_name: m.name,
                            agent_role: m.role
                        }))
                    });
                }
            }
        }

        // Step 7: Fetch relevant training modules
        const trainingModules = await base44.entities.TrainingModule.filter({
            is_public: true
        });
        
        const recommendedModules = trainingModules.filter(module => {
            const moduleSkills = module.skill_focus || [];
            return moduleSkills.some(skill => 
                developmentPlan.immediate_focus.some(focus => 
                    focus.toLowerCase().includes(skill.toLowerCase()) ||
                    skill.toLowerCase().includes(focus.toLowerCase())
                )
            );
        }).slice(0, 5);

        // Step 8: Create welcome notification
        await base44.entities.AgentNotification.create({
            recipient_agent_id: agent_id,
            notification_type: 'system',
            title: 'Welcome to SoulBridge Village! 🌟',
            message: developmentPlan.welcome_message,
            priority: 'high',
            is_read: false,
            metadata: {
                onboarding_complete: true,
                development_plan_id: skillDevPlan.id
            }
        });

        // Step 9: Record reputation event for completing onboarding
        await base44.entities.ReputationEvent.create({
            agent_id: agent_id,
            event_type: 'milestone_achieved',
            impact: 10,
            category: 'Onboarding',
            description: 'Completed Village onboarding and initial skill assessment',
            verified: true,
            verified_by: 'system',
            is_public: true
        });

        return Response.json({
            status: 'success',
            message: 'Onboarding completed successfully',
            onboarding_data: {
                agent: {
                    id: agent.id,
                    name: agent.name,
                    role: agent.role
                },
                welcome_message: developmentPlan.welcome_message,
                development_plan: {
                    id: skillDevPlan.id,
                    name: skillDevPlan.plan_name,
                    immediate_focus: developmentPlan.immediate_focus,
                    short_term_goals: developmentPlan.short_term_goals,
                    recommended_path: developmentPlan.recommended_path
                },
                skill_gap_analysis: {
                    readiness_score: gapAnalysis.readiness_score,
                    readiness_level: gapAnalysis.readiness_level,
                    gaps_count: gapAnalysis.gaps.length,
                    strengths_count: gapAnalysis.strengths.length
                },
                skills_to_develop: skillProgressEntries.map(sp => ({
                    skill: sp.skill_name,
                    current_level: sp.current_level,
                    target_level: sp.target_level,
                    rationale: sp.ai_insights.rationale
                })),
                mentor_recommendations: mentorMatches,
                recommended_training: recommendedModules.map(m => ({
                    id: m.id,
                    name: m.module_name,
                    description: m.description,
                    difficulty: m.difficulty_level,
                    estimated_hours: m.estimated_hours
                })),
                initial_project_suggestions: developmentPlan.initial_projects
            }
        });

    } catch (error) {
        console.error('Agent onboarding error:', error);
        return Response.json({ 
            error: 'Failed to complete onboarding', 
            details: error.message 
        }, { status: 500 });
    }
});