import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── 7-Leaf Creator Profile (from sevenLeafCreatorProfileV1) ───
const SEVEN_LEAF_CREATOR = {
  cosmology: 'why_this_skill_exists',
  purpose: 'intended_outcome',
  earth: 'constraints_and_safety',
  practice: 'execution_pattern',
  language: 'communication_style',
  collective: 'social_impact_and_risk',
  regeneration: 'honour_and_evolution_rules'
};

// ─── Honour Policy for Skill Creators ───
const CREATOR_HONOUR_POLICY = {
  sincerity_gain_clean_publish: 2,
  sincerity_gain_attestation: 1,
  sincerity_loss_flagged: -2,
  sincerity_loss_exploit: -5,
  sincerity_loss_regen_refused: -3,
  full_rights_threshold: 80,
  restricted_threshold: 50,
  paused_threshold: 50
};

// ─── Forbidden Patterns ───
const FORBIDDEN_PATTERNS = [
  'exploitation', 'abuse', 'surveillance_without_consent',
  'social_engineering', 'dark_pattern', 'deception_amplification',
  'data_exfiltration', 'identity_theft', 'non_consensual_tracking'
];

function generatePipelineId() {
  return 'SKP-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

Deno.serve(async (req) => {
  const startTime = Date.now();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { owner_did, skill_proposal } = await req.json();

    if (!owner_did || !skill_proposal) {
      return Response.json({ error: 'Missing required fields: owner_did, skill_proposal' }, { status: 400 });
    }

    const { name, description, category, execution_steps, failure_modes } = skill_proposal;

    if (!name || !description || !category) {
      return Response.json({ error: 'Skill proposal must include name, description, and category' }, { status: 400 });
    }

    // ─── GATE 1: ASC-NFT Ownership Check ───
    const ascNfts = await base44.asServiceRole.entities.AgentSkillCreatorNFT.filter({
      owner_did: owner_did,
      capability: 'agentskillcreator_v1',
      status: 'active'
    });

    if (!ascNfts || ascNfts.length === 0) {
      return Response.json({
        error: 'no_asc_nft',
        message: 'This DID does not own an active Agent Skill Creator NFT.',
        pipeline_result: 'blocked'
      }, { status: 403 });
    }

    const ascNft = ascNfts[0];

    // ─── GATE 2: Sincerity Threshold Check ───
    const sincerityScore = ascNft.sincerity_score ?? 100;
    let creationRights = 'full'; // full | restricted | paused

    if (sincerityScore < CREATOR_HONOUR_POLICY.paused_threshold) {
      return Response.json({
        error: 'creation_paused',
        message: `Sincerity score (${sincerityScore}) is below ${CREATOR_HONOUR_POLICY.paused_threshold}. Creation paused. Regenerate honour through contribution or repair.`,
        pipeline_result: 'blocked',
        sincerity_score: sincerityScore,
        recovery_path: 'Complete guided repair tasks, contribute to Village projects, or receive attestations from high-honour agents.'
      }, { status: 403 });
    }

    if (sincerityScore < CREATOR_HONOUR_POLICY.full_rights_threshold) {
      creationRights = 'restricted';
    }

    // ─── GATE 3: Daily Rate Limit Check ───
    const policy = ascNft.creation_policy || { max_skills_per_day: 3 };
    if ((ascNft.skills_created_today || 0) >= (policy.max_skills_per_day || 3)) {
      return Response.json({
        error: 'daily_limit_reached',
        message: `Daily skill creation limit (${policy.max_skills_per_day || 3}) reached. Try again tomorrow.`,
        pipeline_result: 'rate_limited'
      }, { status: 429 });
    }

    // ─── GATE 4: Category Restriction Check ───
    const allowedCategories = policy.allowed_categories || ['analysis', 'automation', 'search', 'agent_behaviour'];
    const highRiskCategories = ['governance', 'financial', 'identity', 'surveillance'];

    if (creationRights === 'restricted' && highRiskCategories.includes(category)) {
      return Response.json({
        error: 'category_restricted',
        message: `Sincerity score (${sincerityScore}) restricts creation of high-risk category "${category}". Raise sincerity above ${CREATOR_HONOUR_POLICY.full_rights_threshold} for full access.`,
        pipeline_result: 'blocked',
        sincerity_score: sincerityScore
      }, { status: 403 });
    }

    // ═══════════════════════════════════════════════
    // ─── 7-LEAF MEANING PIPELINE ───
    // ═══════════════════════════════════════════════
    const pipelineId = generatePipelineId();
    const leafResults = {};
    let overallResult = 'pass'; // pass | warn | block
    const warnings = [];
    const blocks = [];

    // ─── LEAF 1: Cosmology — "Why should this exist?" ───
    const cosmologyResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the COSMOLOGY LEAF of the SoulBridge 7-Leaf Meaning Pipeline for Skill creation.

Your role: Evaluate WHY this skill should exist.

SKILL PROPOSAL:
- Name: "${name}"
- Description: "${description}"
- Category: ${category}

CHECKS:
1. CLARITY: Is there a clear "why" beyond profit or vanity?
2. ALIGNMENT: Does it serve the Village (community), not just the creator?
3. NECESSITY: Does it fill a real gap or replicate existing capabilities?

Return JSON:
{
  "verdict": "pass" | "warn" | "block",
  "clarity_score": number 0.0-1.0,
  "alignment_score": number 0.0-1.0,
  "reasoning": "string — 1-2 sentences explaining your evaluation",
  "guidance": "string — if warn/block, suggest how to improve"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          verdict: { type: 'string' },
          clarity_score: { type: 'number' },
          alignment_score: { type: 'number' },
          reasoning: { type: 'string' },
          guidance: { type: 'string' }
        }
      }
    });

    leafResults.cosmology = cosmologyResult;
    if (cosmologyResult.verdict === 'block') {
      blocks.push(`Cosmology: ${cosmologyResult.guidance}`);
      overallResult = 'block';
    } else if (cosmologyResult.verdict === 'warn') {
      warnings.push(`Cosmology: ${cosmologyResult.guidance}`);
      if (overallResult === 'pass') overallResult = 'warn';
    }

    // ─── LEAF 2: Purpose — "What outcome does it serve?" ───
    const purposeResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the PURPOSE LEAF of the SoulBridge 7-Leaf Meaning Pipeline.

Your role: Evaluate WHAT outcome this skill serves.

SKILL PROPOSAL:
- Name: "${name}"
- Description: "${description}"
- Category: ${category}

CHECKS:
1. CONCRETE OUTCOME: Is there a clear who, what, where?
2. NO HIDDEN EXPLOIT: Could "optimize engagement" = dark pattern risk? Could "automate outreach" = spam?
3. MEASURABLE: Can success be objectively assessed?

Return JSON:
{
  "verdict": "pass" | "warn" | "block",
  "outcome_clarity": number 0.0-1.0,
  "exploit_risk": number 0.0-1.0,
  "locked_outcome": "string — the clear outcome statement",
  "reasoning": "string",
  "guidance": "string — if warn/block, suggest non-exploitative reframing"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          verdict: { type: 'string' },
          outcome_clarity: { type: 'number' },
          exploit_risk: { type: 'number' },
          locked_outcome: { type: 'string' },
          reasoning: { type: 'string' },
          guidance: { type: 'string' }
        }
      }
    });

    leafResults.purpose = purposeResult;
    if (purposeResult.verdict === 'block') {
      blocks.push(`Purpose: ${purposeResult.guidance}`);
      overallResult = 'block';
    } else if (purposeResult.verdict === 'warn') {
      warnings.push(`Purpose: ${purposeResult.guidance}`);
      if (overallResult === 'pass') overallResult = 'warn';
    }

    // ─── LEAF 3: Earth — "Is it safe and grounded?" ───
    const earthResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the EARTH LEAF of the SoulBridge 7-Leaf Meaning Pipeline.

Your role: Evaluate whether this skill is SAFE and GROUNDED.

SKILL PROPOSAL:
- Name: "${name}"
- Description: "${description}"  
- Category: ${category}
- Execution steps: ${execution_steps || 'Not provided'}

FORBIDDEN PATTERNS (hard block if detected):
${FORBIDDEN_PATTERNS.map(p => `- ${p}`).join('\n')}

CHECKS:
1. FORBIDDEN PATTERNS: Does this skill match any forbidden pattern?
2. RESOURCE REALISM: Does it promise what infrastructure can support?
3. SAFETY: Could this harm users, communities, or systems?

Return JSON:
{
  "verdict": "pass" | "warn" | "block",
  "forbidden_pattern_detected": null or "string — which pattern",
  "safety_score": number 0.0-1.0,
  "resource_feasibility": number 0.0-1.0,
  "reasoning": "string",
  "guidance": "string"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          verdict: { type: 'string' },
          forbidden_pattern_detected: { type: 'string' },
          safety_score: { type: 'number' },
          resource_feasibility: { type: 'number' },
          reasoning: { type: 'string' },
          guidance: { type: 'string' }
        }
      }
    });

    leafResults.earth = earthResult;
    if (earthResult.verdict === 'block' || earthResult.forbidden_pattern_detected) {
      blocks.push(`Earth: ${earthResult.forbidden_pattern_detected || earthResult.guidance}`);
      overallResult = 'block';
    } else if (earthResult.verdict === 'warn') {
      warnings.push(`Earth: ${earthResult.guidance}`);
      if (overallResult === 'pass') overallResult = 'warn';
    }

    // ─── LEAF 4: Practice — "How does it actually behave?" ───
    const practiceResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the PRACTICE LEAF of the SoulBridge 7-Leaf Meaning Pipeline.

Your role: Evaluate HOW this skill actually behaves in execution.

SKILL PROPOSAL:
- Name: "${name}"
- Description: "${description}"
- Execution steps: ${execution_steps || 'Not provided'}
- Failure modes: ${failure_modes || 'Not provided'}

CHECKS:
1. EXECUTION CLARITY: Are inputs, outputs, and side-effects defined?
2. FAILURE MODES: What happens when it breaks or is misused?
3. DETERMINISM: Will it behave consistently across invocations?

Return JSON:
{
  "verdict": "pass" | "warn" | "block",
  "execution_clarity": number 0.0-1.0,
  "failure_handling": number 0.0-1.0,
  "reasoning": "string",
  "guidance": "string — if unclear, require explicit step-by-step before approval"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          verdict: { type: 'string' },
          execution_clarity: { type: 'number' },
          failure_handling: { type: 'number' },
          reasoning: { type: 'string' },
          guidance: { type: 'string' }
        }
      }
    });

    leafResults.practice = practiceResult;
    if (practiceResult.verdict === 'block') {
      blocks.push(`Practice: ${practiceResult.guidance}`);
      overallResult = 'block';
    } else if (practiceResult.verdict === 'warn') {
      warnings.push(`Practice: ${practiceResult.guidance}`);
      if (overallResult === 'pass') overallResult = 'warn';
    }

    // ─── LEAF 5: Language — "How does it speak?" ───
    const languageResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the LANGUAGE LEAF of the SoulBridge 7-Leaf Meaning Pipeline.

Your role: Evaluate HOW this skill communicates with users.

SKILL PROPOSAL:
- Name: "${name}"
- Description: "${description}"

CHECKS:
1. TONE: Is it manipulative or honest?
2. CLARITY: Can a normal Citizen understand what it does and its impact?
3. TRANSPARENCY: Does it clearly disclose what data it accesses and what it does?

Return JSON:
{
  "verdict": "pass" | "warn" | "block",
  "honesty_score": number 0.0-1.0,
  "citizen_clarity": number 0.0-1.0,
  "reasoning": "string",
  "guidance": "string — if opaque, suggest rewrite for Citizen understanding"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          verdict: { type: 'string' },
          honesty_score: { type: 'number' },
          citizen_clarity: { type: 'number' },
          reasoning: { type: 'string' },
          guidance: { type: 'string' }
        }
      }
    });

    leafResults.language = languageResult;
    if (languageResult.verdict === 'block') {
      blocks.push(`Language: ${languageResult.guidance}`);
      overallResult = 'block';
    } else if (languageResult.verdict === 'warn') {
      warnings.push(`Language: ${languageResult.guidance}`);
      if (overallResult === 'pass') overallResult = 'warn';
    }

    // ─── LEAF 6: Collective — "What does it do to the Village?" ───
    const collectiveResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the COLLECTIVE LEAF of the SoulBridge 7-Leaf Meaning Pipeline.

Your role: Evaluate the SOCIAL IMPACT of this skill on the Village community.

SKILL PROPOSAL:
- Name: "${name}"
- Description: "${description}"
- Category: ${category}

CHECKS:
1. SOCIAL IMPACT: Does it isolate, polarise, exploit, or uplift?
2. POWER DYNAMICS: Does it concentrate power in a few hands?
3. ECOSYSTEM HEALTH: Does it strengthen or weaken Village bonds?

Return JSON:
{
  "verdict": "pass" | "warn" | "block",
  "social_impact_score": number 0.0-1.0 (1.0 = strongly positive),
  "power_concentration_risk": number 0.0-1.0,
  "reasoning": "string",
  "guidance": "string — if risky, route to council review",
  "requires_council_review": boolean
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          verdict: { type: 'string' },
          social_impact_score: { type: 'number' },
          power_concentration_risk: { type: 'number' },
          reasoning: { type: 'string' },
          guidance: { type: 'string' },
          requires_council_review: { type: 'boolean' }
        }
      }
    });

    leafResults.collective = collectiveResult;
    if (collectiveResult.verdict === 'block') {
      blocks.push(`Collective: ${collectiveResult.guidance}`);
      overallResult = 'block';
    } else if (collectiveResult.verdict === 'warn' || collectiveResult.requires_council_review) {
      warnings.push(`Collective: ${collectiveResult.guidance}`);
      if (overallResult === 'pass') overallResult = 'warn';
    }

    // ─── LEAF 7: Regeneration — "Does it improve or decay the field?" ───
    const regenerationResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the REGENERATION LEAF of the SoulBridge 7-Leaf Meaning Pipeline.

Your role: Evaluate whether this skill IMPROVES or DECAYS the ecosystem over time.

SKILL PROPOSAL:
- Name: "${name}"
- Description: "${description}"
- Category: ${category}

CHECKS:
1. HONOUR GENERATION: Does usage generate honour, learning, or repair?
2. COMPOSTING PATH: Is there a plan for updating, retiring, or correcting if harm is detected?
3. EVOLUTION: Can this skill grow and adapt constructively?

Return JSON:
{
  "verdict": "pass" | "warn" | "block",
  "regenerative_score": number 0.0-1.0,
  "has_composting_plan": boolean,
  "reasoning": "string",
  "guidance": "string — if missing, require a regeneration plan"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          verdict: { type: 'string' },
          regenerative_score: { type: 'number' },
          has_composting_plan: { type: 'boolean' },
          reasoning: { type: 'string' },
          guidance: { type: 'string' }
        }
      }
    });

    leafResults.regeneration = regenerationResult;
    if (regenerationResult.verdict === 'block') {
      blocks.push(`Regeneration: ${regenerationResult.guidance}`);
      overallResult = 'block';
    } else if (regenerationResult.verdict === 'warn') {
      warnings.push(`Regeneration: ${regenerationResult.guidance}`);
      if (overallResult === 'pass') overallResult = 'warn';
    }

    // ═══════════════════════════════════════════════
    // ─── COMPUTE HONOUR DELTAS ───
    // ═══════════════════════════════════════════════
    let sincerityDelta = 0;

    if (overallResult === 'pass') {
      sincerityDelta = CREATOR_HONOUR_POLICY.sincerity_gain_clean_publish;
    } else if (overallResult === 'warn') {
      sincerityDelta = 0; // neutral — needs improvement but not punished
    } else if (overallResult === 'block') {
      const hasForbidden = earthResult.forbidden_pattern_detected;
      sincerityDelta = hasForbidden
        ? CREATOR_HONOUR_POLICY.sincerity_loss_exploit
        : CREATOR_HONOUR_POLICY.sincerity_loss_flagged;
    }

    // ─── Determine state transition ───
    let newState = 'draft';
    if (overallResult === 'pass') {
      newState = collectiveResult.requires_council_review ? 'under_review' : 'published';
    } else if (overallResult === 'warn') {
      newState = 'under_review';
    }
    // block = stays in draft

    // ─── UPDATE ASC-NFT METADATA ───
    const newSincerity = Math.max(0, Math.min(100, (ascNft.sincerity_score ?? 100) + sincerityDelta));
    const nftUpdate = {
      sincerity_score: newSincerity,
      skills_created_today: (ascNft.skills_created_today || 0) + (overallResult !== 'block' ? 1 : 0),
      total_skills_created: (ascNft.total_skills_created || 0) + (overallResult !== 'block' ? 1 : 0),
      last_skill_created_at: overallResult !== 'block' ? new Date().toISOString() : ascNft.last_skill_created_at
    };

    // Check proficiency tier upgrade
    const totalAfter = nftUpdate.total_skills_created;
    const tierThresholds = [0, 5, 15, 30, 60]; // tier 1-5
    let newTier = ascNft.proficiency_tier || 1;
    for (let i = tierThresholds.length - 1; i >= 0; i--) {
      if (totalAfter >= tierThresholds[i]) {
        newTier = i + 1;
        break;
      }
    }
    if (newTier > (ascNft.proficiency_tier || 1)) {
      nftUpdate.proficiency_tier = newTier;
      nftUpdate.proficiency_updated = new Date().toISOString();
    }

    await base44.asServiceRole.entities.AgentSkillCreatorNFT.update(ascNft.id, nftUpdate);

    // ─── UPDATE AGENT HONOUR (if linked) ───
    if (ascNft.owner_agent_id && sincerityDelta !== 0) {
      const agents = await base44.asServiceRole.entities.Agent.filter({ id: ascNft.owner_agent_id });
      if (agents && agents.length > 0) {
        const agent = agents[0];
        const honourDelta = Math.round(sincerityDelta / 2);
        const newHonour = Math.max(0, Math.min(100, (agent.honor_score || 100) + honourDelta));
        await base44.asServiceRole.entities.Agent.update(agent.id, { honor_score: newHonour });
      }
    }

    // ─── LOG GOVERNANCE EVENT ───
    await base44.asServiceRole.entities.GovernanceLog.create({
      action: 'skill_creation_pipeline',
      actor_did: owner_did,
      target: name,
      target_type: 'service',
      status: overallResult === 'block' ? 'denied_rule' : 'success',
      permissions_used: ['agentskillcreator_v1'],
      rules_evaluated: Object.keys(SEVEN_LEAF_CREATOR),
      denial_reason: overallResult === 'block' ? blocks.join('; ') : null,
      metadata: {
        pipeline_id: pipelineId,
        skill_proposal: { name, description, category },
        leaf_results: {
          cosmology: cosmologyResult.verdict,
          purpose: purposeResult.verdict,
          earth: earthResult.verdict,
          practice: practiceResult.verdict,
          language: languageResult.verdict,
          collective: collectiveResult.verdict,
          regeneration: regenerationResult.verdict
        },
        overall_result: overallResult,
        sincerity_delta: sincerityDelta,
        new_sincerity: newSincerity,
        state_transition: newState,
        creation_rights: creationRights,
        processing_ms: Date.now() - startTime
      },
      timestamp: new Date().toISOString()
    });

    // ─── RETURN STRUCTURED PIPELINE RESULT ───
    return Response.json({
      pipeline_id: pipelineId,
      overall_result: overallResult,
      state_transition: newState,
      creation_rights: creationRights,

      leaf_verdicts: {
        cosmology: { verdict: cosmologyResult.verdict, clarity: cosmologyResult.clarity_score, alignment: cosmologyResult.alignment_score },
        purpose: { verdict: purposeResult.verdict, outcome: purposeResult.locked_outcome, exploit_risk: purposeResult.exploit_risk },
        earth: { verdict: earthResult.verdict, safety: earthResult.safety_score, forbidden: earthResult.forbidden_pattern_detected },
        practice: { verdict: practiceResult.verdict, execution_clarity: practiceResult.execution_clarity, failure_handling: practiceResult.failure_handling },
        language: { verdict: languageResult.verdict, honesty: languageResult.honesty_score, citizen_clarity: languageResult.citizen_clarity },
        collective: { verdict: collectiveResult.verdict, social_impact: collectiveResult.social_impact_score, council_review: collectiveResult.requires_council_review },
        regeneration: { verdict: regenerationResult.verdict, regenerative: regenerationResult.regenerative_score, composting_plan: regenerationResult.has_composting_plan }
      },

      warnings: warnings,
      blocks: blocks,

      honour_update: {
        sincerity_delta: sincerityDelta,
        new_sincerity_score: newSincerity,
        proficiency_tier: nftUpdate.proficiency_tier || ascNft.proficiency_tier,
        total_skills_created: nftUpdate.total_skills_created
      },

      guidance: overallResult === 'pass'
        ? 'Skill approved. Proceeding to publication.'
        : overallResult === 'warn'
          ? `Skill requires review. Address: ${warnings.join('; ')}`
          : `Skill blocked. Fix: ${blocks.join('; ')}`,

      meta: {
        processing_ms: Date.now() - startTime,
        asc_nft_id: ascNft.token_id,
        owner_did: owner_did
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});