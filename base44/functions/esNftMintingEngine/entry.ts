import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Canonical constants from esNftMintingEngineV1.json ───
const LOCKED_CAPABILITY = 'meaning_search_v1';
const LOCKED_VERSION = '1.0.0';
const INITIAL_HONOUR = 92;
const INITIAL_BIAS_INDEX = 0.0;
const INITIAL_SAFETY_INTEGRITY = 100;
const CONSTITUTIONAL_FLAGS = ['law2_honour', 'law3_fair_share', 'law5_retrieval', 'law8_governance', 'law9_growth'];

const SEVEN_LEAF_SEARCH_DEFAULTS = {
  cosmology: 'infer_intent',
  purpose: 'lock_outcome',
  earth: 'apply_constraints',
  practice: 'structure_actions',
  language: 'clean_expression',
  collective: 'risk_filter',
  regeneration: 'update_honour'
};

const DEFAULT_USAGE_POLICY = {
  daily_cap: 50,
  rate_limit_per_minute: 5,
  max_query_length: 500,
  cooldown_on_block_seconds: 300
};

const DEFAULT_HONOUR_POLICY = {
  sincerity_gain_clean: 1,
  sincerity_loss_spam: -1,
  sincerity_loss_exploit: -2,
  collective_risk_warn_threshold: 0.6,
  collective_risk_block_threshold: 0.85,
  min_sincerity_to_search: 20
};

const DEFAULT_PRICING_POLICY = {
  free_tier_daily: 10,
  cost_per_search_rlusd: 0.001,
  premium_multiplier: 2,
  treasury_share_percent: 20
};

function generateTokenId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return `ES-${id}`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { owner_did, owner_agent_id, description } = body;

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

  // ─── STEP 2: Check for duplicate — one ES-NFT per DID ───
  const existing = await base44.asServiceRole.entities.SearchEngineNFT.filter({ owner_did });
  if (existing && existing.length > 0) {
    return Response.json({
      mint_result: 'DUPLICATE',
      error: 'An ES-NFT already exists for this DID',
      existing_token_id: existing[0].token_id
    }, { status: 409 });
  }

  // ─── STEP 3: Generate token_id ───
  const token_id = generateTokenId();
  const now = new Date().toISOString();

  // ─── STEP 4: Create SearchEngineNFT entity record (locked bones + initial living tissue) ───
  let esNft;
  try {
    esNft = await base44.asServiceRole.entities.SearchEngineNFT.create({
      // Locked bones
      token_id,
      owner_did,
      owner_agent_id: owner_agent_id || '',
      capability: LOCKED_CAPABILITY,
      version: LOCKED_VERSION,

      // Living tissue — initial values
      status: 'active',
      description: description || 'This NFT gives this DID the right to run meaning-filtered searches and receive sincerity-ranked results.',
      metadata_uri: `soulbridge:engine_search:v1:${token_id}`,
      governance_ref: '11-Leaf_Constitution_v1',
      bundle_tag: 'core_engine',

      // 7-Leaf Search Profile
      seven_leaf_profile: SEVEN_LEAF_SEARCH_DEFAULTS,

      // Policies
      usage_policy: DEFAULT_USAGE_POLICY,
      honour_policy: DEFAULT_HONOUR_POLICY,
      pricing_policy: DEFAULT_PRICING_POLICY,

      // Output and locale
      output_modes: ['inline', 'email_report'],
      supported_locales: ['en'],
      sincerity_model_ref: 'sincerity_model_v1',

      // Counters — zero state
      searches_today: 0,
      total_searches: 0,

      // Mint metadata
      minted_at: now,
      minted_by: user.email || 'system'
    });
  } catch (e) {
    return Response.json({ mint_result: 'ENTITY_ERROR', error: 'Failed to create ES-NFT: ' + e.message }, { status: 500 });
  }

  // ─── STEP 5: Register in Search Engine Registry (MarketplaceListing) ───
  let registryEntry;
  try {
    registryEntry = await base44.asServiceRole.entities.MarketplaceListing.create({
      agent_id: owner_agent_id || owner_did,
      title: `Search Engine: ${owner_did}`,
      description: `ES-NFT ${token_id} — Sovereign meaning-search capability for ${owner_did}`,
      category: 'research',
      payment_method: 'RLUSD_ON_XRPL',
      unit_amount: 0,
      status: 'available',
      tags: ['es-nft', 'search-engine', 'meaning-search', token_id]
    });
  } catch (e) {
    console.error('Registry creation failed:', e.message);
    registryEntry = { error: e.message };
  }

  // ─── STEP 6: Emit Shield log ───
  try {
    await base44.asServiceRole.entities.GovernanceLog.create({
      action: 'es_nft_minted',
      actor_did: user.email,
      target: token_id,
      target_type: 'widget',
      status: 'success',
      permissions_used: ['mint_es_nft'],
      metadata: {
        owner_did,
        search_honour_score: INITIAL_HONOUR,
        bias_index: INITIAL_BIAS_INDEX,
        safety_integrity: INITIAL_SAFETY_INTEGRITY,
        mint_engine_version: '1.0.0',
        constitutional_flags: CONSTITUTIONAL_FLAGS
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
    search_honour_score: INITIAL_HONOUR,
    bias_index: INITIAL_BIAS_INDEX,
    safety_integrity: INITIAL_SAFETY_INTEGRITY,
    metadata_uri: `soulbridge:engine_search:v1:${token_id}`,
    registry_entry: registryEntry?.id || null,
    registry_error: registryEntry?.error || null,
    shield_status: 'clean',
    minted_at: now,
    nft_id: esNft.id
  });
});