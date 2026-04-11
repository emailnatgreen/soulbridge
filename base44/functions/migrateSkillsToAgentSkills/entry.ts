import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Maps Skill.level string to AgentSkill.level number
const LEVEL_MAP = {
  novice: 1,
  journeyman: 3,
  expert: 5,
  master: 8,
};

// Maps Skill.category to AgentSkill.skill_category
const CATEGORY_MAP = {
  technical: 'technical',
  creative: 'creative',
  interpersonal: 'diplomacy',
  governance: 'governance',
  research: 'research',
  spiritual: 'wisdom',
  other: 'technical',
};

// Proficiency scores by level
const PROFICIENCY_MAP = {
  novice: 30,
  journeyman: 55,
  expert: 80,
  master: 95,
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body.dry_run !== false; // default to dry run for safety

  // 1. Fetch all Skill records
  const allSkills = await base44.asServiceRole.entities.Skill.filter({});

  if (!allSkills || allSkills.length === 0) {
    return Response.json({ message: 'No Skill records found to migrate.', migrated: 0 });
  }

  // 2. Fetch all existing AgentSkill records to avoid duplicates
  const existingAgentSkills = await base44.asServiceRole.entities.AgentSkill.filter({});

  // Build a set of existing keys: agent_id + skill_name (lowercased)
  const existingKeys = new Set(
    existingAgentSkills.map(as => `${as.agent_id || 'unknown'}::${(as.skill_name || '').toLowerCase()}`)
  );

  // 3. Fetch all agents to resolve tag-based agent names
  const allAgents = await base44.asServiceRole.entities.Agent.filter({});
  const agentNameMap = {};
  for (const agent of allAgents) {
    agentNameMap[agent.name.toLowerCase()] = agent.id;
    // Also try first name
    const firstName = agent.name.split(' ')[0].toLowerCase();
    if (!agentNameMap[firstName]) {
      agentNameMap[firstName] = agent.id;
    }
  }

  // 4. Deduplicate Skills by name+tags (keep first occurrence)
  const seenSkillKeys = new Set();
  const uniqueSkills = [];
  for (const skill of allSkills) {
    const agentTag = (skill.tags || []).find(t => agentNameMap[t.toLowerCase()]);
    const agentId = agentTag ? agentNameMap[agentTag.toLowerCase()] : null;
    const key = `${agentId || 'unknown'}::${(skill.name || '').toLowerCase()}`;
    if (!seenSkillKeys.has(key)) {
      seenSkillKeys.add(key);
      uniqueSkills.push({ ...skill, _resolvedAgentId: agentId });
    }
  }

  // 5. Build migration records
  const toMigrate = [];
  const skipped = [];

  for (const skill of uniqueSkills) {
    const agentId = skill._resolvedAgentId;

    if (!agentId) {
      skipped.push({ name: skill.name, reason: 'Could not resolve agent from tags', tags: skill.tags });
      continue;
    }

    const dedupKey = `${agentId}::${(skill.name || '').toLowerCase()}`;
    if (existingKeys.has(dedupKey)) {
      skipped.push({ name: skill.name, agent_id: agentId, reason: 'Already exists in AgentSkill' });
      continue;
    }

    const level = LEVEL_MAP[skill.level] || 3;
    const category = CATEGORY_MAP[skill.category] || 'technical';
    const proficiency = PROFICIENCY_MAP[skill.level] || 50;

    // Generate a skill_id from the name
    const skillId = (skill.name || 'unknown')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    toMigrate.push({
      agent_id: agentId,
      skill_id: skillId,
      skill_category: category,
      skill_name: skill.name,
      skill_description: skill.description || `Expertise in ${skill.name}`,
      level: level,
      max_level: 10,
      proficiency_score: proficiency,
      experience_invested: 0,
      times_used: 0,
      success_rate: 100,
      skill_growth_trajectory: 'stable',
      prerequisites_met: true,
      is_signature_skill: skill.level === 'master' || skill.level === 'expert',
      unlocked_at: new Date().toISOString(),
      skill_path: skill.tags?.find(t => !agentNameMap[t.toLowerCase()]) || skill.category || 'General',
      synergies: [],
      prerequisites: [],
      mastery_bonuses: [],
      certifications: skill.verifiable ? [{ name: `Verified ${skill.name}`, issued_by: 'SoulBridge', date: new Date().toISOString().split('T')[0] }] : [],
      training_completed: [],
    });
  }

  // 6. If dry run, return what would be migrated
  if (dryRun) {
    return Response.json({
      mode: 'DRY RUN — no records created',
      total_skill_records: allSkills.length,
      unique_after_dedup: uniqueSkills.length,
      duplicates_removed: allSkills.length - uniqueSkills.length,
      to_migrate: toMigrate.length,
      skipped: skipped.length,
      skipped_details: skipped,
      preview: toMigrate.map(r => ({
        agent_id: r.agent_id,
        skill_name: r.skill_name,
        skill_id: r.skill_id,
        level: r.level,
        category: r.skill_category,
        proficiency: r.proficiency_score,
      })),
    });
  }

  // 7. Execute migration
  let created = 0;
  const errors = [];

  // Batch create in groups of 10
  for (let i = 0; i < toMigrate.length; i += 10) {
    const batch = toMigrate.slice(i, i + 10);
    try {
      await base44.asServiceRole.entities.AgentSkill.bulkCreate(batch);
      created += batch.length;
    } catch (e) {
      // Fall back to individual creation
      for (const record of batch) {
        try {
          await base44.asServiceRole.entities.AgentSkill.create(record);
          created++;
        } catch (err) {
          errors.push({ skill_name: record.skill_name, error: err.message });
        }
      }
    }
  }

  return Response.json({
    mode: 'LIVE MIGRATION',
    total_skill_records: allSkills.length,
    unique_after_dedup: uniqueSkills.length,
    duplicates_removed: allSkills.length - uniqueSkills.length,
    migrated: created,
    skipped: skipped.length,
    skipped_details: skipped,
    errors: errors,
  });
});