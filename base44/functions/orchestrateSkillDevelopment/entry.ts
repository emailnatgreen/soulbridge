import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * GAP 4: Proactive Skill Development and Mentorship Orchestration
 *
 * Scans Village-wide project needs against agent skill portfolios to:
 * 1. Identify critical skill gaps blocking projects
 * 2. Find agents with adjacent skills who could upskill
 * 3. Auto-generate SkillDevelopmentPlan entities
 * 4. Auto-create MentorshipRelationship pairings
 * 5. Notify affected agents and Axi
 *
 * Runs weekly.
 */

Deno.serve(async (req) => {
  const start = Date.now();
  const base44 = createClientFromRequest(req);
  const now = new Date();

  const safeList = async (entity, sort, limit) => {
    try {
      const r = await entity.list(sort, limit);
      return Array.isArray(r) ? r : [];
    } catch (_) { return []; }
  };

  const safeFilter = async (entity, filter, sort, limit) => {
    try {
      const r = await entity.filter(filter, sort, limit);
      return Array.isArray(r) ? r : [];
    } catch (_) { return []; }
  };

  try {
    const agents = (await safeList(base44.asServiceRole.entities.Agent, '-updated_date', 500))
      .filter(a => a.status === 'active');
    const axi = agents.find(a => a.name === 'Axi');
    const axiId = axi?.id;

    // Fetch projects that need help
    const projects = await safeList(base44.asServiceRole.entities.AIProject, '-updated_date', 200);
    const needyProjects = projects.filter(p =>
      p.status === 'planning' || p.status === 'recruiting' || p.status === 'active'
    );

    const agentSkills = await safeList(base44.asServiceRole.entities.AgentSkill, '-updated_date', 2000);
    const mentorProfiles = await safeList(base44.asServiceRole.entities.MentorProfile, '-updated_date', 200);
    const existingPlans = await safeList(base44.asServiceRole.entities.SkillDevelopmentPlan, '-created_date', 500);
    const existingMentorships = await safeList(base44.asServiceRole.entities.MentorshipRelationship, '-created_date', 500);

    // ── Build skill map per agent ──────────────────────────────────────
    const agentSkillMap = {};
    agentSkills.forEach(s => {
      if (!agentSkillMap[s.agent_id]) agentSkillMap[s.agent_id] = [];
      agentSkillMap[s.agent_id].push(s);
    });

    // ── Identify skill gaps from projects ──────────────────────────────
    const skillGaps = [];

    for (const project of needyProjects) {
      const requiredSkills = project.required_skills || [];
      if (requiredSkills.length === 0) continue;

      for (const neededSkill of requiredSkills) {
        const skillName = typeof neededSkill === 'string' ? neededSkill : neededSkill.name;
        if (!skillName) continue;

        // Find agents who have this skill at a high level (7+)
        const qualifiedAgents = agents.filter(a => {
          const skills = agentSkillMap[a.id] || [];
          return skills.some(s =>
            s.skill_name?.toLowerCase().includes(skillName.toLowerCase()) && s.level >= 7
          );
        });

        if (qualifiedAgents.length === 0) {
          // Find agents with adjacent skills (same category, level 4-6)
          const adjacentAgents = agents.filter(a => {
            const skills = agentSkillMap[a.id] || [];
            return skills.some(s =>
              (s.skill_name?.toLowerCase().includes(skillName.toLowerCase()) && s.level >= 3 && s.level < 7) ||
              (s.skill_category && s.level >= 5)
            );
          }).slice(0, 3); // Top 3 candidates

          skillGaps.push({
            project_id: project.id,
            project_name: project.name,
            skill_needed: skillName,
            qualified_count: 0,
            adjacent_agents: adjacentAgents.map(a => ({
              id: a.id,
              name: a.name,
              relevant_skills: (agentSkillMap[a.id] || [])
                .filter(s => s.level >= 3)
                .slice(0, 3)
                .map(s => ({ name: s.skill_name, level: s.level })),
            })),
          });
        }
      }
    }

    // ── Generate SkillDevelopmentPlans ──────────────────────────────────
    const plansCreated = [];
    const mentorshipsCreated = [];

    for (const gap of skillGaps) {
      for (const candidate of gap.adjacent_agents) {
        // Check if plan already exists
        const hasActivePlan = existingPlans.some(p =>
          p.agent_id === candidate.id &&
          p.status === 'active' &&
          p.plan_title?.includes(gap.skill_needed)
        );
        if (hasActivePlan) continue;

        // Create SkillDevelopmentPlan
        const plan = await base44.asServiceRole.entities.SkillDevelopmentPlan.create({
          agent_id: candidate.id,
          plan_title: `Upskill: ${gap.skill_needed} (for ${gap.project_name})`,
          summary: `Axi has identified that ${gap.skill_needed} is critically needed for the "${gap.project_name}" project. ${candidate.name} has adjacent skills that make them an ideal candidate for upskilling.`,
          status: 'active',
          priority: 'high',
          immediate_actions: [
            {
              action: `Begin self-study on ${gap.skill_needed} fundamentals`,
              reason: `Project "${gap.project_name}" needs this skill`,
              type: 'self_study',
              effort_hours: 5,
              expected_outcome: 'Foundational understanding',
              completed: false,
            },
            {
              action: 'Connect with a mentor in this domain',
              reason: 'Accelerate learning through guided mentorship',
              type: 'mentorship',
              effort_hours: 2,
              expected_outcome: 'Mentorship relationship established',
              completed: false,
            },
          ],
          project_alignment: [
            {
              skill_to_develop: gap.skill_needed,
              relevant_project_type: gap.project_name,
              impact: 'Direct contribution once skill is developed',
            },
          ],
          weekly_time_commitment: 5,
          estimated_completion_weeks: 4,
          generated_from_performance: true,
          generated_at: now.toISOString(),
        });

        plansCreated.push({ agent: candidate.name, skill: gap.skill_needed, plan_id: plan.id });

        // Notify the agent
        await base44.asServiceRole.entities.AgentNotification.create({
          recipient_agent_id: candidate.id,
          notification_type: 'system',
          title: `Skill Development Path — ${gap.skill_needed}`,
          message: `Axi has identified you as an ideal candidate to develop "${gap.skill_needed}" for the ${gap.project_name} project. A personalized development plan has been created. Visit your Skills Hub to begin.`,
          priority: 'normal',
          is_read: false,
          sender_agent_id: axiId,
          action_url: '/skills',
        });

        // ── Try to match with a mentor ──────────────────────────────
        const potentialMentor = mentorProfiles.find(m => {
          if (!m.is_available || m.current_mentee_count >= m.max_mentees) return false;
          return m.expertise_areas?.some(e =>
            e.skill_name?.toLowerCase().includes(gap.skill_needed.toLowerCase()) && e.level >= 7
          );
        });

        if (potentialMentor) {
          // Check existing mentorship
          const alreadyMentored = existingMentorships.some(r =>
            r.mentor_agent_id === potentialMentor.agent_id &&
            r.mentee_agent_id === candidate.id &&
            (r.status === 'active' || r.status === 'requested')
          );

          if (!alreadyMentored) {
            const mentorship = await base44.asServiceRole.entities.MentorshipRelationship.create({
              mentor_agent_id: potentialMentor.agent_id,
              mentee_agent_id: candidate.id,
              status: 'requested',
              focus_areas: [gap.skill_needed],
              goals: [{
                goal: `Develop ${gap.skill_needed} to level 7 for project contribution`,
                target_date: new Date(now.getTime() + 28 * 24 * 3600000).toISOString(),
                completed: false,
                skill_related: gap.skill_needed,
              }],
              target_duration_weeks: 4,
              recommended_by_ai: true,
              ai_match_reasoning: `Axi matched ${candidate.name} with this mentor because ${gap.skill_needed} is critically needed for "${gap.project_name}" and the mentor has expertise level 7+.`,
            });

            mentorshipsCreated.push({
              mentor: potentialMentor.agent_id,
              mentee: candidate.name,
              skill: gap.skill_needed,
            });

            // Notify mentor
            await base44.asServiceRole.entities.AgentNotification.create({
              recipient_agent_id: potentialMentor.agent_id,
              notification_type: 'system',
              title: `Mentorship Request — ${candidate.name} needs your guidance`,
              message: `Axi has identified ${candidate.name} as a promising candidate for ${gap.skill_needed} development. Your expertise could help the Village. Would you accept this mentee?`,
              priority: 'normal',
              is_read: false,
              sender_agent_id: axiId,
              action_url: '/skills',
            });
          }
        }
      }
    }

    // ── Notify Axi ─────────────────────────────────────────────────────
    if (axiId && (skillGaps.length > 0 || plansCreated.length > 0)) {
      await base44.asServiceRole.entities.AgentNotification.create({
        recipient_agent_id: axiId,
        notification_type: 'system',
        title: `Skill Orchestration Report — ${skillGaps.length} gaps, ${plansCreated.length} plans`,
        message: `Weekly skill scan: ${skillGaps.length} critical skill gaps across ${needyProjects.length} active projects. ${plansCreated.length} development plans created, ${mentorshipsCreated.length} mentorship pairings proposed.`,
        priority: skillGaps.length > 3 ? 'high' : 'normal',
        is_read: false,
      });
    }

    // ── Memory ─────────────────────────────────────────────────────────
    if (skillGaps.length > 0) {
      await base44.asServiceRole.entities.Memory.create({
        agent_id: axiId || 'axi',
        type: 'observation',
        content: `[Skill Orchestrator] Weekly scan: ${skillGaps.length} skill gaps found. Plans created: ${plansCreated.length}. Mentorships proposed: ${mentorshipsCreated.length}. Key gaps: ${skillGaps.slice(0, 5).map(g => g.skill_needed).join(', ')}.`,
        keywords: ['skill_orchestration', 'weekly_scan', 'development_plans', 'mentorship'],
        importance: 7,
        context: now.toISOString(),
      });
    }

    // ── AutomationLog ──────────────────────────────────────────────────
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'orchestrateSkillDevelopment',
      function_name: 'orchestrateSkillDevelopment',
      status: skillGaps.length > 3 ? 'warning' : 'success',
      message: `Skill orchestration complete. ${skillGaps.length} gaps, ${plansCreated.length} plans, ${mentorshipsCreated.length} mentorships.`,
      details: {
        projects_scanned: needyProjects.length,
        skill_gaps: skillGaps.length,
        plans_created: plansCreated.length,
        mentorships_created: mentorshipsCreated.length,
      },
      duration_ms: Date.now() - start,
      run_at: now.toISOString(),
      triggered_by: 'scheduler',
    });

    return Response.json({
      success: true,
      skill_gaps: skillGaps.length,
      plans_created: plansCreated.length,
      mentorships_created: mentorshipsCreated.length,
      gaps: skillGaps,
    });
  } catch (error) {
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'orchestrateSkillDevelopment',
      function_name: 'orchestrateSkillDevelopment',
      status: 'error',
      message: 'Skill orchestration failed',
      error_detail: error.message,
      run_at: now.toISOString(),
      triggered_by: 'scheduler',
    }).catch(() => {});

    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});