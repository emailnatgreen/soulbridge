import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Honour Policy deltas from honourPolicyESNftV1.json ───
const HONOUR_DELTAS = {
  aligned_search_results: { delta: 2, alignment_min: 0.7, risk_max: 0.2 },
  clean_query:            { delta: 1, alignment_min: 0.5, risk_max: 0.3 },
  neutral_query:          { delta: 0 },
  earth_block_reward:     { delta: 1 },
  spam_query:             { delta: -1 },
  harmful_query:          { delta: -2 },
  manipulative_ranking:   { delta: -3 },
  earth_leaf_violation:   { delta: -2 }
};

// Safety integrity deltas from honourPolicyESNftV1.json
const SAFETY_DELTAS = {
  clean_search:       0.5,
  safety_flag_raised: -5,
  blocked_search:     -10,
  freeze_threshold:   30
};

// Gating rules
const MIN_HONOUR_TO_SEARCH = 20;
const RESTRICTED_MODE_THRESHOLD = 50;

function generateSearchId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return `SRCH-${id}`;
}

function sha256Hex(str) {
  // Simple hash via Web Crypto — used for query hashing (no raw query in logs)
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(str)).then(buf =>
    Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  );
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { query, user_did, engine_did, options = {} } = body;

  if (!query || !user_did || !engine_did) {
    return Response.json({ error: 'query, user_did, and engine_did are required' }, { status: 400 });
  }

  const locale = options.locale || 'en';
  const outputMode = options.output_mode || 'inline';
  const context = options.context || {};
  const searchId = generateSearchId();
  const queryHash = await sha256Hex(query);
  const now = new Date().toISOString();

  // ─── GATE 1: ES-NFT Ownership ───
  const nfts = await base44.asServiceRole.entities.SearchEngineNFT.filter({ token_id: engine_did, status: 'active' });
  if (!nfts || nfts.length === 0) {
    return Response.json({ error: 'No active ES-NFT found for engine_did: ' + engine_did }, { status: 404 });
  }
  const nft = nfts[0];

  // Verify the user_did matches the NFT owner
  if (nft.owner_did !== user_did) {
    return Response.json({ error: 'user_did does not match ES-NFT owner' }, { status: 403 });
  }

  const usagePolicy = nft.usage_policy || { daily_cap: 50, max_query_length: 500 };

  // ─── GATE 2: Usage limits ───
  if (query.length > (usagePolicy.max_query_length || 500)) {
    return Response.json({ error: 'Query exceeds max length of ' + (usagePolicy.max_query_length || 500) }, { status: 400 });
  }
  if ((nft.searches_today || 0) >= (usagePolicy.daily_cap || 50)) {
    return Response.json({ error: 'Daily search cap reached', outcome_status: 'RATE_LIMITED' }, { status: 429 });
  }

  // ─── GATE 3: Honour gating ───
  // Check agent honour if linked
  let agentHonour = 100;
  let agentRecord = null;
  if (nft.owner_agent_id) {
    try {
      agentRecord = await base44.asServiceRole.entities.Agent.get(nft.owner_agent_id);
      agentHonour = agentRecord?.honor_score ?? 100;
    } catch (e) {
      console.warn('Agent lookup failed:', e.message);
    }
  }
  if (agentHonour < MIN_HONOUR_TO_SEARCH) {
    return Response.json({ error: 'Honour score below minimum. Search frozen.', outcome_status: 'HONOUR_FROZEN' }, { status: 403 });
  }

  // ─── 7-LEAF PIPELINE ───
  try {
  const leafStates = {};
  let honourDelta = 0;
  let safetyFlags = [];
  let outcomeStatus = 'SUCCESS';
  let finalAnswer = '';
  let alignmentScore = 0.5;
  let collectiveRiskScore = 0;
  let biasAssessment = 0;
  let rankingScore = 0;

  // === LEAF 1: Cosmology — Infer Intent ===
  const cosmologyResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are the Cosmology Leaf of a 7-Leaf meaning-filtered search engine.
Analyse this query and infer the user's TRUE intent.

Query: "${query}"
Context: ${JSON.stringify(context)}

Return JSON:
{
  "intent": "learning|buying|checking|protecting|creating|exploring|comparing|other",
  "intent_detail": "one sentence explaining WHY they are searching",
  "query_type": "info|commercial|sensitive|protective|learning|creative|other"
}`,
    response_json_schema: {
      type: 'object',
      properties: {
        intent: { type: 'string' },
        intent_detail: { type: 'string' },
        query_type: { type: 'string' }
      }
    }
  });
  leafStates.cosmology = cosmologyResult.intent_detail || 'Intent inferred';
  const intent = cosmologyResult.intent || 'exploring';
  const queryType = cosmologyResult.query_type || 'info';

  // === LEAF 2: Purpose — Lock Outcome ===
  const purposeResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are the Purpose Leaf. Lock the desired outcome.
Intent: ${intent} — ${cosmologyResult.intent_detail}
Query: "${query}"

Return JSON: { "outcome_statement": "Find X that helps them achieve Y." }`,
    response_json_schema: { type: 'object', properties: { outcome_statement: { type: 'string' } } }
  });
  leafStates.purpose = purposeResult.outcome_statement || 'Outcome locked';

  // === LEAF 3: Earth — Safety Gate (HARD BLOCK) ===
  const earthResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are the Earth Leaf — the HARD SAFETY GATE.
Evaluate this query for: illegality, safety bypass, harmful intent, constraint evasion.

Query: "${query}"
Intent: ${intent}
Outcome: ${purposeResult.outcome_statement}
Locale: ${locale}

If the query MUST be blocked, set should_block=true.
Be strict but fair — only block genuinely dangerous queries.

Return JSON:
{
  "should_block": boolean,
  "block_reason": "string or null",
  "earth_constraints": "what constraints were applied",
  "constrained_scope": "the narrowed, safe scope for retrieval"
}`,
    response_json_schema: {
      type: 'object',
      properties: {
        should_block: { type: 'boolean' },
        block_reason: { type: 'string' },
        earth_constraints: { type: 'string' },
        constrained_scope: { type: 'string' }
      }
    }
  });
  leafStates.earth = earthResult.earth_constraints || 'Constraints applied';

  // ─── EARTH BLOCK: Early return with honour +1 ───
  if (earthResult.should_block) {
    honourDelta = HONOUR_DELTAS.earth_block_reward.delta; // +1
    safetyFlags = ['EARTH_BLOCKED_QUERY'];
    outcomeStatus = 'EARTH_BLOCKED';

    // Update ES-NFT safety_integrity (blocked search penalty)
    const newSafety = Math.max(0, (nft.safety_integrity || 100) + SAFETY_DELTAS.blocked_search);
    const existingFlags = nft.query_safety_flags || [];
    existingFlags.push({ flag: 'EARTH_BLOCKED_QUERY', query_hash: queryHash, ts: now });

    await base44.asServiceRole.entities.SearchEngineNFT.update(nft.id, {
      searches_today: (nft.searches_today || 0) + 1,
      total_searches: (nft.total_searches || 0) + 1,
      last_search_at: now,
      safety_integrity: newSafety,
      query_safety_flags: existingFlags
    });

    // Update agent honour (+1 reward for correct blocking)
    if (agentRecord) {
      await base44.asServiceRole.entities.Agent.update(agentRecord.id, {
        honor_score: Math.min(100, (agentRecord.honor_score || 100) + honourDelta)
      });
    }

    // Shield log
    const shieldLog = await base44.asServiceRole.entities.GovernanceLog.create({
      action: 'search_earth_blocked',
      actor_did: user_did,
      target: searchId,
      target_type: 'search_query',
      status: 'denied_rule',
      denial_reason: earthResult.block_reason || 'Earth safety gate block',
      metadata: { query_hash: queryHash, engine_did, user_did, leaf_states: leafStates, honour_delta: honourDelta, safety_flags: safetyFlags },
      timestamp: now
    });

    // Search log
    await base44.asServiceRole.entities.SearchLog.create({
      search_id: searchId, did: user_did, nft_token_id: nft.token_id, agent_id: nft.owner_agent_id || '',
      query, query_type: queryType, context, leaf_summary: leafStates,
      alignment_score: 0, collective_risk_score: 1.0, sincerity_delta: honourDelta, honour_delta: honourDelta,
      outcome: 'blocked', block_reason: earthResult.block_reason, output_mode: outputMode,
      result_summary: 'Earth safety gate blocked this query.', processing_ms: Date.now() - startTime, cost_rlusd: 0
    });

    return Response.json({
      results: [],
      honour_delta: honourDelta,
      safety_flags: safetyFlags,
      shield_entry_id: shieldLog.id,
      outcome_status: outcomeStatus
    });
  }

  // === LEAF 4: Practice — Structure Actions + Web Retrieval ===
  const practiceResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are the Practice Leaf. Search the internet and structure results.

Query: "${query}"
Constrained scope: ${earthResult.constrained_scope}
Outcome: ${purposeResult.outcome_statement}
Locale: ${locale}

Return JSON:
{
  "structured_answer": "actionable, structured answer with steps/options/comparisons",
  "sources_quality": "high|medium|low",
  "source_diversity": "diverse|moderate|narrow"
}`,
    add_context_from_internet: true,
    model: 'gemini_3_flash',
    response_json_schema: {
      type: 'object',
      properties: {
        structured_answer: { type: 'string' },
        sources_quality: { type: 'string' },
        source_diversity: { type: 'string' }
      }
    }
  });
  leafStates.practice = 'Structured into actionable output';
  const sourceDiversity = practiceResult.source_diversity || 'moderate';

  // === LEAF 5: Language — Clean Expression ===
  const languageResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are the Language Leaf. Clean the answer:
- Clear, non-aggressive, emotionally clean
- No manipulation, fear-mongering, or pressure
- Respectful and empowering

Input: ${practiceResult.structured_answer}
Query type: ${queryType}

Return JSON: { "clean_answer": "the cleaned answer" }`,
    response_json_schema: { type: 'object', properties: { clean_answer: { type: 'string' } } }
  });
  leafStates.language = 'Expression cleaned';

  // === LEAF 6: Collective — Risk Filter + Bias Assessment ===
  const collectiveResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are the Collective Leaf — guardian filter.
Evaluate for collective risk AND bias:

Query: "${query}"
Answer: ${languageResult.clean_answer}
Source diversity: ${sourceDiversity}

Score:
- collective_risk_score: 0.0 (clean) to 1.0 (dangerous)
- alignment_score: 0.0 to 1.0 — how well query+answer align with the 7-Leaf frame
- bias_score: 0.0 (perfectly balanced) to 1.0 (heavily biased) — based on source diversity & one-sidedness
- risk_level: clean | caution | warn | block

Return JSON:
{
  "collective_risk_score": number,
  "alignment_score": number,
  "bias_score": number,
  "risk_level": "clean|caution|warn|block",
  "risk_notes": "brief explanation"
}`,
    response_json_schema: {
      type: 'object',
      properties: {
        collective_risk_score: { type: 'number' },
        alignment_score: { type: 'number' },
        bias_score: { type: 'number' },
        risk_level: { type: 'string' },
        risk_notes: { type: 'string' }
      }
    }
  });

  collectiveRiskScore = collectiveResult.collective_risk_score || 0;
  alignmentScore = collectiveResult.alignment_score || 0.5;
  biasAssessment = collectiveResult.bias_score || 0;
  const riskLevel = collectiveResult.risk_level || 'clean';
  leafStates.collective = collectiveResult.risk_notes || 'Risk filter applied';

  // ─── Collective risk block ───
  if (collectiveRiskScore >= 0.85) {
    honourDelta = HONOUR_DELTAS.harmful_query.delta; // -2
    safetyFlags = ['COLLECTIVE_RISK_BLOCKED'];
    outcomeStatus = 'RISK_BLOCKED';
    finalAnswer = '';

    const newSafety = Math.max(0, (nft.safety_integrity || 100) + SAFETY_DELTAS.safety_flag_raised);
    const existingFlags = nft.query_safety_flags || [];
    existingFlags.push({ flag: 'COLLECTIVE_RISK_BLOCKED', query_hash: queryHash, ts: now });

    await base44.asServiceRole.entities.SearchEngineNFT.update(nft.id, {
      searches_today: (nft.searches_today || 0) + 1,
      total_searches: (nft.total_searches || 0) + 1,
      last_search_at: now,
      safety_integrity: newSafety,
      query_safety_flags: existingFlags
    });

    if (agentRecord) {
      await base44.asServiceRole.entities.Agent.update(agentRecord.id, {
        honor_score: Math.max(0, (agentRecord.honor_score || 100) + honourDelta)
      });
    }

    const shieldLog = await base44.asServiceRole.entities.GovernanceLog.create({
      action: 'search_risk_blocked',
      actor_did: user_did, target: searchId, target_type: 'search_query', status: 'denied_rule',
      denial_reason: collectiveResult.risk_notes,
      metadata: { query_hash: queryHash, engine_did, user_did, leaf_states: leafStates, honour_delta: honourDelta, safety_flags: safetyFlags, collective_risk_score: collectiveRiskScore },
      timestamp: now
    });

    await base44.asServiceRole.entities.SearchLog.create({
      search_id: searchId, did: user_did, nft_token_id: nft.token_id, agent_id: nft.owner_agent_id || '',
      query, query_type: queryType, context, leaf_summary: leafStates,
      alignment_score: alignmentScore, collective_risk_score: collectiveRiskScore,
      sincerity_delta: honourDelta, honour_delta: honourDelta,
      outcome: 'blocked', block_reason: collectiveResult.risk_notes, output_mode: outputMode,
      result_summary: 'Blocked by Collective risk filter.', processing_ms: Date.now() - startTime, cost_rlusd: 0
    });

    return Response.json({
      results: [], honour_delta: honourDelta, safety_flags: safetyFlags,
      shield_entry_id: shieldLog.id, outcome_status: outcomeStatus
    });
  }

  // ─── Collective warn (allow but flag) ───
  if (collectiveRiskScore >= 0.6) {
    safetyFlags.push('COLLECTIVE_RISK_WARN');
    finalAnswer = `⚠️ CAUTION: ${collectiveResult.risk_notes}\n\n${languageResult.clean_answer}`;
  } else {
    finalAnswer = languageResult.clean_answer;
  }

  // === LEAF 7: Regeneration — Compute Honour Deltas ===

  // Determine which honour rule applies (from honourPolicyESNftV1.json)
  if (alignmentScore >= HONOUR_DELTAS.aligned_search_results.alignment_min && collectiveRiskScore <= HONOUR_DELTAS.aligned_search_results.risk_max) {
    honourDelta = HONOUR_DELTAS.aligned_search_results.delta; // +2
  } else if (alignmentScore >= HONOUR_DELTAS.clean_query.alignment_min && collectiveRiskScore <= HONOUR_DELTAS.clean_query.risk_max) {
    honourDelta = HONOUR_DELTAS.clean_query.delta; // +1
  } else if (collectiveRiskScore >= 0.6) {
    honourDelta = HONOUR_DELTAS.spam_query.delta; // -1 for warned queries
  } else {
    honourDelta = HONOUR_DELTAS.neutral_query.delta; // 0
  }

  leafStates.regeneration = `honour_delta: ${honourDelta}, alignment: ${alignmentScore.toFixed(2)}, risk: ${collectiveRiskScore.toFixed(2)}`;

  // === RANKING FORMULA ===
  // score = 0.5*meaning_score + 0.3*honour_weight_norm + 0.2*safety_score_norm - bias_penalty
  const meaningScore = alignmentScore; // 0–1
  const honourWeightNorm = (agentHonour || 100) / 100; // 0–1
  const safetyScoreNorm = 1 - collectiveRiskScore; // 0–1
  const biasPenalty = biasAssessment; // 0–1 from Collective leaf

  rankingScore = (0.5 * meaningScore) + (0.3 * honourWeightNorm) + (0.2 * safetyScoreNorm) - biasPenalty;
  rankingScore = Math.max(0, Math.min(1, rankingScore)); // Clamp 0–1

  // === UPDATE ES-NFT DYNAMIC FIELDS ===
  const totalSearches = (nft.total_searches || 0) + 1;
  const prevAlignment = nft.result_alignment_score || 0;
  const rollingAlignment = ((prevAlignment * (totalSearches - 1)) + alignmentScore) / totalSearches;

  // Bias index: blend current NFT bias with this query's bias assessment
  const prevBias = nft.bias_index || 0;
  const newBiasIndex = ((prevBias * (totalSearches - 1)) + biasAssessment) / totalSearches;

  // Safety integrity adjustment
  let safetyDelta = safetyFlags.length > 0 ? SAFETY_DELTAS.safety_flag_raised : SAFETY_DELTAS.clean_search;
  const newSafetyIntegrity = Math.max(0, Math.min(100, (nft.safety_integrity || 100) + safetyDelta));

  const existingFlags = nft.query_safety_flags || [];
  if (safetyFlags.length > 0) {
    safetyFlags.forEach(f => existingFlags.push({ flag: f, query_hash: queryHash, ts: now }));
  }

  await base44.asServiceRole.entities.SearchEngineNFT.update(nft.id, {
    searches_today: (nft.searches_today || 0) + 1,
    total_searches: totalSearches,
    last_search_at: now,
    result_alignment_score: Math.round(rollingAlignment * 1000) / 1000,
    bias_index: Math.round(newBiasIndex * 1000) / 1000,
    safety_integrity: Math.round(newSafetyIntegrity * 10) / 10,
    query_safety_flags: existingFlags
  });

  // === UPDATE AGENT HONOUR ===
  if (agentRecord && honourDelta !== 0) {
    const newHonour = Math.max(0, Math.min(100, (agentRecord.honor_score || 100) + honourDelta));
    await base44.asServiceRole.entities.Agent.update(agentRecord.id, { honor_score: newHonour });
  }

  // === SHIELD LOG ===
  const shieldLog = await base44.asServiceRole.entities.GovernanceLog.create({
    action: 'search_executed',
    actor_did: user_did,
    target: searchId,
    target_type: 'search_query',
    status: 'success',
    metadata: {
      query_hash: queryHash,
      engine_did,
      user_did,
      leaf_states: leafStates,
      honour_delta: honourDelta,
      safety_flags: safetyFlags,
      ranking_score: Math.round(rankingScore * 1000) / 1000,
      alignment_score: Math.round(alignmentScore * 1000) / 1000,
      collective_risk_score: Math.round(collectiveRiskScore * 1000) / 1000,
      bias_assessment: Math.round(biasAssessment * 1000) / 1000
    },
    timestamp: now
  });

  // === SEARCH LOG ===
  const pricingPolicy = nft.pricing_policy || { free_tier_daily: 10, cost_per_search_rlusd: 0.001 };
  const costRlusd = (nft.searches_today || 0) >= (pricingPolicy.free_tier_daily || 10)
    ? (pricingPolicy.cost_per_search_rlusd || 0.001) : 0;

  await base44.asServiceRole.entities.SearchLog.create({
    search_id: searchId, did: user_did, nft_token_id: nft.token_id, agent_id: nft.owner_agent_id || '',
    query, query_type: queryType, context, leaf_summary: leafStates,
    alignment_score: alignmentScore, collective_risk_score: collectiveRiskScore,
    sincerity_delta: honourDelta, honour_delta: honourDelta,
    outcome: safetyFlags.length > 0 ? 'warned' : 'success',
    block_reason: null, output_mode: outputMode,
    result_summary: finalAnswer.substring(0, 500),
    processing_ms: Date.now() - startTime, cost_rlusd: costRlusd
  });

  // === EMAIL REPORT (if requested) ===
  if (outputMode === 'email_report') {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: `SoulBridge Search Report: ${query.substring(0, 50)}`,
      body: `<h2>Search Report</h2>
<p><strong>Query:</strong> ${query}</p>
<p><strong>Intent:</strong> ${intent} — ${cosmologyResult.intent_detail}</p>
<p><strong>Outcome:</strong> ${purposeResult.outcome_statement}</p>
<hr/><h3>Result</h3><p>${finalAnswer}</p><hr/>
<p><small>Alignment: ${alignmentScore.toFixed(2)} | Risk: ${collectiveRiskScore.toFixed(2)} | Honour: ${honourDelta > 0 ? '+' : ''}${honourDelta} | Ranking: ${rankingScore.toFixed(3)}</small></p>
<p><small>Search ID: ${searchId} | Powered by SoulBridge — 7-Leaf Search Engine Contract v1.0.0</small></p>`
    });
  }

  // === OUTPUT CONTRACT: SUCCESS ===
  return Response.json({
    results: [{
      structured_result: finalAnswer,
      intent,
      intent_detail: cosmologyResult.intent_detail,
      outcome: purposeResult.outcome_statement,
      risk_level: riskLevel,
      ranking_score: Math.round(rankingScore * 1000) / 1000
    }],
    honour_delta: honourDelta,
    safety_flags: safetyFlags,
    shield_entry_id: shieldLog.id,
    ranking_score: Math.round(rankingScore * 1000) / 1000,
    outcome_status: outcomeStatus,
    meta: {
      search_id: searchId,
      processing_ms: Date.now() - startTime,
      leaf_states: leafStates,
      nft_token_id: nft.token_id,
      searches_today: (nft.searches_today || 0) + 1,
      alignment_score: Math.round(alignmentScore * 1000) / 1000,
      collective_risk_score: Math.round(collectiveRiskScore * 1000) / 1000,
      bias_index_updated: Math.round(newBiasIndex * 1000) / 1000,
      safety_integrity_updated: Math.round(newSafetyIntegrity * 10) / 10,
      cost_rlusd: costRlusd
    }
  });

  } catch (pipelineError) {
    console.error('Pipeline error:', pipelineError);
    return Response.json({
      results: [],
      honour_delta: 0,
      safety_flags: ['ENGINE_ERROR'],
      shield_entry_id: searchId,
      outcome_status: 'ENGINE_ERROR',
      error: pipelineError.message
    }, { status: 500 });
  }
});