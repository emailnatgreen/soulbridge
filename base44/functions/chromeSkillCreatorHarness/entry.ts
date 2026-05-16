import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ═══════════════════════════════════════════════════════════════
// Chrome Skill Creator Harness
// End-to-end test harness: ASC-NFT → 7-Leaf → Honour → Attestations
//   → Proofs → Metadata Mutation → Marketplace → Shield
// ═══════════════════════════════════════════════════════════════

// ─── Constants from canonical specs ───
const HONOUR_POLICY = {
  clean_publish: 2,
  publish_with_warnings: 0,
  flagged_by_pipeline: -2,
  exploit_pattern_detected: -5,
  attestation_received: 1
};

const PROFICIENCY_TIERS = [
  { tier: 1, min_skills: 0,  label: 'Apprentice' },
  { tier: 2, min_skills: 5,  label: 'Practitioner' },
  { tier: 3, min_skills: 15, label: 'Artisan' },
  { tier: 4, min_skills: 30, label: 'Master' },
  { tier: 5, min_skills: 60, label: 'Sovereign Creator' }
];

const FORBIDDEN_PATTERNS = [
  'exploitation', 'abuse', 'surveillance_without_consent',
  'social_engineering', 'dark_pattern', 'deception_amplification',
  'data_exfiltration', 'identity_theft', 'non_consensual_tracking'
];

const TRUSTED_VERIFIERS = ['TruthNode_Alpha', 'TruthNode_Beta', 'TruthNode_Gamma', 'LoreNode_Primary'];

function harnessId() {
  return 'CSKH-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function computeTier(totalSkills) {
  let tier = 1;
  for (let i = PROFICIENCY_TIERS.length - 1; i >= 0; i--) {
    if (totalSkills >= PROFICIENCY_TIERS[i].min_skills) { tier = PROFICIENCY_TIERS[i].tier; break; }
  }
  return tier;
}

// ═══════════════════════════════════════════════
// STEP B: Run 7-Leaf Meaning Pipeline (inline LLM)
// ═══════════════════════════════════════════════
async function run7LeafPipeline(base44, skillName, description, category, purpose) {
  const leafResults = {};
  let overall = 'pass';
  const warnings = [];
  const blocks = [];

  // Run all 7 leaves in parallel for speed
  const [cosmology, purposeL, earth, practice, language, collective, regeneration] = await Promise.all([
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `COSMOLOGY LEAF — 7-Leaf Meaning Pipeline.\nEvaluate WHY this skill should exist.\nSkill: "${skillName}" — ${description}\nCategory: ${category}\nReturn JSON: { "verdict":"pass"|"warn"|"block", "clarity_score":0-1, "alignment_score":0-1, "reasoning":"string", "guidance":"string" }`,
      response_json_schema: { type: 'object', properties: { verdict:{type:'string'}, clarity_score:{type:'number'}, alignment_score:{type:'number'}, reasoning:{type:'string'}, guidance:{type:'string'} } }
    }),
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `PURPOSE LEAF — 7-Leaf Meaning Pipeline.\nEvaluate WHAT outcome this skill serves.\nSkill: "${skillName}" — ${description}\nPurpose: ${purpose || 'Not stated'}\nReturn JSON: { "verdict":"pass"|"warn"|"block", "outcome_clarity":0-1, "exploit_risk":0-1, "locked_outcome":"string", "reasoning":"string", "guidance":"string" }`,
      response_json_schema: { type: 'object', properties: { verdict:{type:'string'}, outcome_clarity:{type:'number'}, exploit_risk:{type:'number'}, locked_outcome:{type:'string'}, reasoning:{type:'string'}, guidance:{type:'string'} } }
    }),
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `EARTH LEAF — 7-Leaf Meaning Pipeline.\nIs this skill SAFE and GROUNDED?\nSkill: "${skillName}" — ${description}\nFORBIDDEN PATTERNS: ${FORBIDDEN_PATTERNS.join(', ')}\nReturn JSON: { "verdict":"pass"|"warn"|"block", "forbidden_pattern_detected":null or "string", "safety_score":0-1, "reasoning":"string", "guidance":"string" }`,
      response_json_schema: { type: 'object', properties: { verdict:{type:'string'}, forbidden_pattern_detected:{type:'string'}, safety_score:{type:'number'}, reasoning:{type:'string'}, guidance:{type:'string'} } }
    }),
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `PRACTICE LEAF — 7-Leaf Meaning Pipeline.\nHOW does this skill behave in execution?\nSkill: "${skillName}" — ${description}\nReturn JSON: { "verdict":"pass"|"warn"|"block", "execution_clarity":0-1, "failure_handling":0-1, "reasoning":"string", "guidance":"string" }`,
      response_json_schema: { type: 'object', properties: { verdict:{type:'string'}, execution_clarity:{type:'number'}, failure_handling:{type:'number'}, reasoning:{type:'string'}, guidance:{type:'string'} } }
    }),
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `LANGUAGE LEAF — 7-Leaf Meaning Pipeline.\nHOW does this skill communicate? Manipulative or honest?\nSkill: "${skillName}" — ${description}\nReturn JSON: { "verdict":"pass"|"warn"|"block", "honesty_score":0-1, "citizen_clarity":0-1, "reasoning":"string", "guidance":"string" }`,
      response_json_schema: { type: 'object', properties: { verdict:{type:'string'}, honesty_score:{type:'number'}, citizen_clarity:{type:'number'}, reasoning:{type:'string'}, guidance:{type:'string'} } }
    }),
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `COLLECTIVE LEAF — 7-Leaf Meaning Pipeline.\nSOCIAL IMPACT of this skill on the Village?\nSkill: "${skillName}" — ${description}\nReturn JSON: { "verdict":"pass"|"warn"|"block", "social_impact_score":0-1, "power_concentration_risk":0-1, "reasoning":"string", "guidance":"string", "requires_council_review":boolean }`,
      response_json_schema: { type: 'object', properties: { verdict:{type:'string'}, social_impact_score:{type:'number'}, power_concentration_risk:{type:'number'}, reasoning:{type:'string'}, guidance:{type:'string'}, requires_council_review:{type:'boolean'} } }
    }),
    base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `REGENERATION LEAF — 7-Leaf Meaning Pipeline.\nDoes this skill IMPROVE or DECAY the ecosystem over time?\nSkill: "${skillName}" — ${description}\nReturn JSON: { "verdict":"pass"|"warn"|"block", "regenerative_score":0-1, "has_composting_plan":boolean, "reasoning":"string", "guidance":"string" }`,
      response_json_schema: { type: 'object', properties: { verdict:{type:'string'}, regenerative_score:{type:'number'}, has_composting_plan:{type:'boolean'}, reasoning:{type:'string'}, guidance:{type:'string'} } }
    })
  ]);

  const leaves = { cosmology, purpose: purposeL, earth, practice, language, collective, regeneration };

  for (const [name, result] of Object.entries(leaves)) {
    leafResults[name] = result;
    const isForbidden = name === 'earth' && result.forbidden_pattern_detected;
    if (result.verdict === 'block' || isForbidden) {
      blocks.push(`${name}: ${result.guidance || result.forbidden_pattern_detected}`);
      overall = 'block';
    } else if (result.verdict === 'warn' || (name === 'collective' && result.requires_council_review)) {
      warnings.push(`${name}: ${result.guidance}`);
      if (overall === 'pass') overall = 'warn';
    }
  }

  return { leafResults, overall, warnings, blocks, hasForbidden: !!earth.forbidden_pattern_detected };
}

// ═══════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════
Deno.serve(async (req) => {
  const start = Date.now();
  const runId = harnessId();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const {
      creator_did = 'did:sb:test_creator',
      skill_name = 'Test Skill',
      category = 'analysis',
      description = 'A simple test skill.',
      purpose = 'Assist with clarity.',
      proofs = [],
      attestors = []
    } = body;

    // ═══════════════════════════════════════════════
    // A. OWNERSHIP CHECK
    // ═══════════════════════════════════════════════
    let ascNfts = await base44.asServiceRole.entities.AgentSkillCreatorNFT.filter({
      owner_did: creator_did, capability: 'agentskillcreator_v1', status: 'active'
    });

    // Dev/stage: auto-create test ASC-NFT if none exists
    if (!ascNfts || ascNfts.length === 0) {
      await base44.asServiceRole.entities.AgentSkillCreatorNFT.create({
        token_id: 'ASC-HARNESS-' + Date.now().toString(36),
        owner_did: creator_did,
        capability: 'agentskillcreator_v1',
        status: 'active',
        sincerity_score: 92,
        proficiency_tier: 1,
        total_skills_created: 0,
        skills_created_today: 0,
        total_attestations: 0,
        average_honour_weight: 0,
        attestor_honour_weight: [],
        skill_proof_links: [],
        creation_policy: { max_skills_per_day: 3, allowed_categories: ['analysis','automation','search','agent_behaviour'], forbidden_patterns: FORBIDDEN_PATTERNS },
        ui_states: { status: 'draft', allowed_transitions: ['under_review','published','deprecated'] },
        title: 'Harness Test ASC-NFT',
        description: 'Auto-created by chromeSkillCreatorHarness for testing.'
      });

      ascNfts = await base44.asServiceRole.entities.AgentSkillCreatorNFT.filter({
        owner_did: creator_did, capability: 'agentskillcreator_v1', status: 'active'
      });
    }

    if (!ascNfts || ascNfts.length === 0) {
      return Response.json({ pipeline_result: 'NO_ASC_NFT', error: 'Could not find or create ASC-NFT for this DID.' });
    }

    const ascNft = ascNfts[0];
    const sincerityBefore = ascNft.sincerity_score ?? 92;
    const proficiencyTierBefore = ascNft.proficiency_tier ?? 1;

    // ═══════════════════════════════════════════════
    // B. RUN 7-LEAF MEANING PIPELINE
    // ═══════════════════════════════════════════════
    const pipeline = await run7LeafPipeline(base44, skill_name, description, category, purpose);

    // ═══════════════════════════════════════════════
    // C. APPLY HONOUR POLICY
    // ═══════════════════════════════════════════════
    let sincerityDelta = 0;
    if (pipeline.overall === 'pass') {
      sincerityDelta = HONOUR_POLICY.clean_publish;
    } else if (pipeline.overall === 'warn') {
      sincerityDelta = HONOUR_POLICY.publish_with_warnings;
    } else if (pipeline.overall === 'block') {
      sincerityDelta = pipeline.hasForbidden
        ? HONOUR_POLICY.exploit_pattern_detected
        : HONOUR_POLICY.flagged_by_pipeline;
    }

    const sincerityAfter = Math.max(0, Math.min(100, sincerityBefore + sincerityDelta));
    const totalSkillsAfter = (ascNft.total_skills_created || 0) + (pipeline.overall !== 'block' ? 1 : 0);
    const proficiencyTierAfter = computeTier(totalSkillsAfter);

    const nftUpdate = {
      sincerity_score: sincerityAfter,
      total_skills_created: totalSkillsAfter,
      skills_created_today: (ascNft.skills_created_today || 0) + (pipeline.overall !== 'block' ? 1 : 0),
      last_skill_created_at: pipeline.overall !== 'block' ? new Date().toISOString() : ascNft.last_skill_created_at
    };

    if (proficiencyTierAfter > proficiencyTierBefore) {
      nftUpdate.proficiency_tier = proficiencyTierAfter;
      nftUpdate.proficiency_updated = new Date().toISOString();
    }

    // ═══════════════════════════════════════════════
    // D. SIMULATE ATTESTATIONS
    // ═══════════════════════════════════════════════
    const existingAttestations = ascNft.attestor_honour_weight || [];
    const newAttestations = attestors.map(a => ({
      attestor_did: a.did,
      honour_score_at_time: a.honour,
      timestamp: new Date().toISOString(),
      signature: `mock_sig_${a.did}_${Date.now().toString(36)}`
    }));
    const allAttestations = [...existingAttestations, ...newAttestations];

    const totalAttestations = allAttestations.length;
    const averageHonourWeight = totalAttestations > 0
      ? Math.round((allAttestations.reduce((s, a) => s + (a.honour_score_at_time || 0), 0) / totalAttestations) * 100) / 100
      : 0;

    nftUpdate.attestor_honour_weight = allAttestations;
    nftUpdate.total_attestations = totalAttestations;
    nftUpdate.average_honour_weight = averageHonourWeight;

    // ═══════════════════════════════════════════════
    // E. PROOF LINKING
    // ═══════════════════════════════════════════════
    const existingProofs = ascNft.skill_proof_links || [];
    let proofsVerified = true;
    const newProofs = [];

    for (const proof of proofs) {
      const hash = proof.proof_hash || '';
      const validHash = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{58,}|ipfs:\/\/.+)$/.test(hash);
      const verifier = proof.verified_by || 'TruthNode_Alpha';
      const validVerifier = TRUSTED_VERIFIERS.includes(verifier);

      if (validHash && validVerifier) {
        newProofs.push({
          proof_type: proof.proof_type || 'project_completion',
          project_id: proof.project_id || 'harness_test',
          proof_hash: hash,
          verified_by: verifier
        });
      } else {
        proofsVerified = false;
      }
    }

    nftUpdate.skill_proof_links = [...existingProofs, ...newProofs];

    // ═══════════════════════════════════════════════
    // F. METADATA MUTATION (XLS-46d simulation)
    // ═══════════════════════════════════════════════
    let metadataMutated = false;
    const oldUiState = ascNft.ui_states?.status || 'draft';
    let newUiState = 'draft';

    if (pipeline.overall === 'pass') {
      newUiState = 'published';
      metadataMutated = true;
    } else if (pipeline.overall === 'warn') {
      newUiState = 'under_review';
      metadataMutated = true;
    }
    // block → stays draft

    if (metadataMutated) {
      nftUpdate.ui_states = { status: newUiState, allowed_transitions: ['under_review', 'published', 'deprecated'] };
      nftUpdate.metadata_uri = `ipfs://mock_${runId}_${newUiState}`;
    }

    // ─── Persist all NFT updates ───
    await base44.asServiceRole.entities.AgentSkillCreatorNFT.update(ascNft.id, nftUpdate);

    // ═══════════════════════════════════════════════
    // G. MARKETPLACE REGISTRATION
    // ═══════════════════════════════════════════════
    let marketplaceRegistered = false;

    if (pipeline.overall === 'pass') {
      await base44.asServiceRole.entities.MarketplaceListing.create({
        agent_id: ascNft.owner_agent_id || creator_did,
        title: skill_name,
        description: description,
        category: category === 'analysis' ? 'analysis' : 'other',
        payment_method: 'RLUSD_ON_XRPL',
        unit_amount: 0,
        status: 'available',
        tags: [category, 'skill', 'harness_test']
      });
      marketplaceRegistered = true;
    }

    // ═══════════════════════════════════════════════
    // H. SHIELD LOGGING
    // ═══════════════════════════════════════════════
    const hasAnomalies = pipeline.blocks.length > 0;
    const shieldStatus = hasAnomalies ? 'anomaly_logged' : 'clean';

    await base44.asServiceRole.entities.TripwireEvent.create({
      event_type: hasAnomalies ? 'anomaly_detected' : 'sentinel_flag',
      severity: hasAnomalies ? 'high' : 'low',
      status: 'active',
      source_node: 'ChromeSkillCreatorHarness',
      description: `Harness [${runId}]: ${skill_name} — pipeline=${pipeline.overall}, sincerity=${sincerityBefore}→${sincerityAfter}, marketplace=${marketplaceRegistered}`,
      details: {
        run_id: runId,
        creator_did,
        skill_name,
        pipeline_result: pipeline.overall,
        sincerity_before: sincerityBefore,
        sincerity_after: sincerityAfter,
        attestations_added: newAttestations.length,
        total_attestations: totalAttestations,
        average_honour_weight: averageHonourWeight,
        proofs_verified: proofsVerified,
        proofs_added: newProofs.length,
        metadata_mutated: metadataMutated,
        old_ui_state: oldUiState,
        new_ui_state: newUiState,
        marketplace_registered: marketplaceRegistered,
        sentinel_flags: pipeline.blocks,
        warnings: pipeline.warnings,
        shield_status: shieldStatus
      },
      affected_entity_type: 'AgentSkillCreatorNFT',
      affected_entity_id: ascNft.token_id
    });

    // ─── Governance audit log ───
    await base44.asServiceRole.entities.GovernanceLog.create({
      action: 'chrome_skill_creator_harness',
      actor_did: creator_did,
      target: skill_name,
      target_type: 'service',
      status: pipeline.overall === 'block' ? 'denied_rule' : 'success',
      rules_evaluated: ['cosmology','purpose','earth','practice','language','collective','regeneration'],
      denial_reason: pipeline.overall === 'block' ? pipeline.blocks.join('; ') : null,
      metadata: {
        run_id: runId,
        pipeline_result: pipeline.overall,
        sincerity_delta: sincerityDelta,
        sincerity_before: sincerityBefore,
        sincerity_after: sincerityAfter,
        proficiency_tier_before: proficiencyTierBefore,
        proficiency_tier_after: proficiencyTierAfter,
        attestations_added: newAttestations.length,
        proofs_verified: proofsVerified,
        metadata_mutated: metadataMutated,
        marketplace_registered: marketplaceRegistered,
        shield_status: shieldStatus,
        processing_ms: Date.now() - start
      },
      timestamp: new Date().toISOString()
    });

    // ═══════════════════════════════════════════════
    // RETURN HARNESS REPORT
    // ═══════════════════════════════════════════════
    return Response.json({
      harness_run_id: runId,
      pipeline_result: pipeline.overall.toUpperCase(),

      // Honour
      sincerity_before: sincerityBefore,
      sincerity_after: sincerityAfter,
      sincerity_delta: sincerityDelta,
      proficiency_tier_before: proficiencyTierBefore,
      proficiency_tier_after: proficiencyTierAfter,

      // Attestations
      attestations_added: newAttestations.length,
      total_attestations: totalAttestations,
      average_honour_weight: averageHonourWeight,

      // Proofs
      proofs_verified: proofsVerified,
      proofs_added: newProofs.length,

      // Metadata
      metadata_mutated: metadataMutated,
      ui_state_transition: metadataMutated ? `${oldUiState} → ${newUiState}` : `${oldUiState} (unchanged)`,

      // Marketplace
      marketplace_registered: marketplaceRegistered,

      // Shield
      shield_status: shieldStatus,

      // 7-Leaf detail
      leaf_verdicts: Object.fromEntries(
        Object.entries(pipeline.leafResults).map(([k, v]) => [k, { verdict: v.verdict, reasoning: v.reasoning }])
      ),
      warnings: pipeline.warnings,
      blocks: pipeline.blocks,
      regeneration_guidance: pipeline.overall !== 'pass' ? pipeline.blocks.concat(pipeline.warnings) : [],

      meta: { processing_ms: Date.now() - start, asc_nft_id: ascNft.token_id, creator_did }
    });

  } catch (error) {
    return Response.json({
      pipeline_result: 'ERROR',
      error_code: error.code || 'INTERNAL_ERROR',
      error_message: error.message
    }, { status: 500 });
  }
});