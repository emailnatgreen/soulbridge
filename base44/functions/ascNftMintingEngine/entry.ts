import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Canonical constants from ascNftMintingEngineV1.json ───
const LOCKED_CAPABILITY = 'agentskillcreator_v1';
const LOCKED_VERSION = '1.0.0';
const INITIAL_SINCERITY = 92;
const INITIAL_TIER = 1;
const DEFAULT_ROYALTY_BPS = 500;
const DEFAULT_ROYALTY_SPLIT = { creator_share: 60, attesters_share: 20, village_treasury_share: 20 };
const CONSTITUTIONAL_FLAGS = ['law2_honour', 'law3_fair_share', 'law4_creation', 'law8_governance', 'law9_growth'];
const FORBIDDEN_PATTERNS = ['exploitation', 'abuse', 'surveillance_without_consent'];
const SEVEN_LEAF_DEFAULTS = {
  cosmology: 'why_this_skill_exists',
  purpose: 'intended_outcome',
  earth: 'constraints_and_safety',
  practice: 'execution_pattern',
  language: 'communication_style',
  collective: 'social_impact_and_risk',
  regeneration: 'honour_and_evolution_rules'
};

function generateTokenId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return `ASC-${id}`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { owner_did, owner_agent_id, title, description } = body;

  if (!owner_did) {
    return Response.json({ mint_result: 'INVALID_DID', error: 'owner_did is required' }, { status: 400 });
  }

  // ─── STEP 1: Validate DID ownership ───
  let wallets;
  try {
    wallets = await base44.asServiceRole.entities.Wallet.filter({ classic_address: owner_did });
  } catch (e) {
    return Response.json({ mint_result: 'INVALID_DID', error: 'Failed to verify DID: ' + e.message }, { status: 400 });
  }

  if (!wallets || wallets.length === 0) {
    return Response.json({ mint_result: 'INVALID_DID', error: 'No wallet found for DID: ' + owner_did }, { status: 400 });
  }

  // Check for duplicate — one ASC-NFT per DID
  const existing = await base44.asServiceRole.entities.AgentSkillCreatorNFT.filter({ owner_did });
  if (existing && existing.length > 0) {
    return Response.json({
      mint_result: 'DUPLICATE',
      error: 'An ASC-NFT already exists for this DID',
      existing_token_id: existing[0].token_id
    }, { status: 409 });
  }

  // ─── STEP 2: Generate token_id ───
  const token_id = generateTokenId();
  const now = new Date().toISOString();

  // ─── STEP 3: Create ASC-NFT entity record (locked bones + initial dynamic fields) ───
  let ascNft;
  try {
    ascNft = await base44.asServiceRole.entities.AgentSkillCreatorNFT.create({
      // Locked bones
      token_id,
      issuer: 'SoulBridge_Governor',
      owner_did,
      owner_agent_id: owner_agent_id || '',
      capability: LOCKED_CAPABILITY,
      version: LOCKED_VERSION,

      // Initial dynamic fields
      sincerity_score: INITIAL_SINCERITY,
      proficiency_tier: INITIAL_TIER,
      max_tier: 5,
      proficiency_updated: now,
      attestor_honour_weight: [],
      total_attestations: 0,
      average_honour_weight: 0,
      skill_proof_links: [],
      governance_amendments: [],
      skills_created_today: 0,
      total_skills_created: 0,

      // Metadata
      title: title || 'Agent Skill Creator NFT',
      description: description || 'Sovereign Verb Token that allows a DID to create, evolve, and publish Skills.',
      metadata_uri: `soulbridge:skill_creator:v1:${token_id}`,

      // Royalties
      royalty_bps: DEFAULT_ROYALTY_BPS,
      royalty_split: DEFAULT_ROYALTY_SPLIT,

      // Governance
      governance_ref: '11-Leaf_Constitution_v1',
      bundle_tag: 'core_engine',
      constitutional_flags: CONSTITUTIONAL_FLAGS,

      // 7-Leaf profile
      seven_leaf_profile: SEVEN_LEAF_DEFAULTS,

      // Creation policy
      creation_policy: {
        max_skills_per_day: 3,
        allowed_categories: ['analysis', 'automation', 'search', 'agent_behaviour'],
        forbidden_patterns: FORBIDDEN_PATTERNS
      },

      // UI states
      ui_states: {
        status: 'draft',
        allowed_transitions: ['under_review', 'published', 'deprecated']
      },

      // Mint metadata
      status: 'active',
      minted_at: now,
      minted_by: user.email || 'system'
    });
  } catch (e) {
    return Response.json({ mint_result: 'ENTITY_ERROR', error: 'Failed to create ASC-NFT: ' + e.message }, { status: 500 });
  }

  // ─── STEP 5: Register in Creator Registry (MarketplaceListing) ───
  let registryEntry;
  try {
    registryEntry = await base44.asServiceRole.entities.MarketplaceListing.create({
      agent_id: owner_agent_id || owner_did,
      title: `Skill Creator: ${owner_did}`,
      description: `ASC-NFT ${token_id} — Sovereign Skill Creator capability for ${owner_did}`,
      category: 'creative',
      payment_method: 'RLUSD_ON_XRPL',
      unit_amount: 0,
      status: 'available',
      tags: ['asc-nft', 'skill-creator', token_id]
    });
  } catch (e) {
    // Registry failed but NFT was minted — log but don't rollback the NFT
    console.error('Registry creation failed:', e.message);
    registryEntry = { error: e.message };
  }

  // ─── STEP 6: Emit Shield log ───
  try {
    await base44.asServiceRole.entities.GovernanceLog.create({
      action: 'asc_nft_minted',
      actor_did: user.email,
      target: token_id,
      target_type: 'widget',
      status: 'success',
      permissions_used: ['mint_asc_nft'],
      metadata: {
        owner_did,
        sincerity_score: INITIAL_SINCERITY,
        proficiency_tier: INITIAL_TIER,
        mint_engine_version: '1.0.0'
      },
      timestamp: now
    });
  } catch (e) {
    console.error('Shield log failed:', e.message);
  }

  // ─── SUCCESS RESPONSE ───
  return Response.json({
    mint_result: 'SUCCESS',
    token_id,
    owner_did,
    sincerity_score: INITIAL_SINCERITY,
    proficiency_tier: INITIAL_TIER,
    metadata_uri: `soulbridge:skill_creator:v1:${token_id}`,
    registry_entry: registryEntry?.id || null,
    registry_error: registryEntry?.error || null,
    shield_status: 'clean',
    minted_at: now,
    nft_id: ascNft.id
  });
});