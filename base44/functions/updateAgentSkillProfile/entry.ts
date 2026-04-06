import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agent_id } = await req.json();
    if (!agent_id) {
      return Response.json({ error: 'agent_id is required' }, { status: 400 });
    }

    // Fetch the agent's skills, training completions, and endorsements
    const [agentSkills, trainings, endorsements, skillProgress] = await Promise.all([
      base44.asServiceRole.entities.AgentSkill.filter({ agent_id }),
      base44.asServiceRole.entities.AgentTraining.filter({ agent_id, status: 'completed' }).catch(() => []),
      base44.asServiceRole.entities.SkillEndorsement.filter({ endorsed_agent_id: agent_id }).catch(() => []),
      base44.asServiceRole.entities.SkillProgress.filter({ agent_id }).catch(() => []),
    ]);

    let skillsUpdated = 0;

    for (const skill of agentSkills) {
      const updates = {};

      // 1. Derive proficiency from level if score is 0
      if (!skill.proficiency_score || skill.proficiency_score === 0) {
        updates.proficiency_score = Math.round((skill.level / (skill.max_level || 10)) * 100);
      }

      // 2. Count endorsements for this skill
      const skillEndorsements = endorsements.filter(
        e => e.skill_name?.toLowerCase() === skill.skill_name?.toLowerCase()
      );
      if (skillEndorsements.length > 0) {
        const avgProficiency = Math.round(
          skillEndorsements.reduce((sum, e) => sum + (e.proficiency_level || 3), 0) / skillEndorsements.length
        );
        // If endorsements suggest higher proficiency, boost it
        const endorsedScore = avgProficiency * 20; // 1-5 → 20-100
        if (endorsedScore > (skill.proficiency_score || 0)) {
          updates.proficiency_score = Math.max(updates.proficiency_score || 0, endorsedScore);
        }
      }

      // 3. Check completed trainings related to this skill
      const relatedTrainings = trainings.filter(
        t => t.skill_focus?.toLowerCase() === skill.skill_name?.toLowerCase() ||
             t.skill_focus?.toLowerCase() === skill.skill_id?.toLowerCase()
      );
      if (relatedTrainings.length > 0) {
        updates.training_completed = relatedTrainings.map(t => t.id);
        // Boost XP from completed trainings
        const totalXP = relatedTrainings.reduce((sum, t) => sum + (t.rewards?.experience_gained || 10), 0);
        if (totalXP > (skill.experience_invested || 0)) {
          updates.experience_invested = totalXP;
        }
      }

      // 4. Check SkillProgress for trajectory hints
      const progress = skillProgress.find(
        sp => sp.skill_name?.toLowerCase() === skill.skill_name?.toLowerCase()
      );
      if (progress) {
        if (progress.status === 'completed' && skill.skill_growth_trajectory === 'stable') {
          updates.skill_growth_trajectory = 'growing';
        }
      }

      // 5. Update certifications from endorsements
      if (skillEndorsements.length >= 3 && (!skill.certifications || skill.certifications.length === 0)) {
        updates.certifications = [{
          name: `Peer-Endorsed: ${skill.skill_name}`,
          issued_by: 'Village Consensus',
          date: new Date().toISOString()
        }];
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        updates.last_upgraded = new Date().toISOString();
        await base44.asServiceRole.entities.AgentSkill.update(skill.id, updates);
        skillsUpdated++;
      }
    }

    return Response.json({
      success: true,
      skills_updated: skillsUpdated,
      total_skills: agentSkills.length,
      synced_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('updateAgentSkillProfile error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});