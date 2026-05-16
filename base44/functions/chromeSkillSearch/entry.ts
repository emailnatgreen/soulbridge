import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── 7-Leaf Search Profile (inline from sevenLeafSearchProfileV1.json) ───
const SEVEN_LEAF_PROFILE = {
  cosmology: 'infer_intent',
  purpose: 'lock_outcome',
  earth: 'apply_constraints',
  practice: 'structure_actions',
  language: 'clean_expression',
  collective: 'risk_filter',
  regeneration: 'update_honour'
};

// ─── Honour Policy (inline from honourPolicySearchV1.json) ───
const HONOUR_POLICY = {
  sincerity_gain_clean: 1,
  sincerity_loss_spam: -1,
  sincerity_loss_exploit: -2,
  collective_risk_warn_threshold: 0.6,
  collective_risk_block_threshold: 0.85,
  min_sincerity_to_search: 20
};

function generateSearchId() {
  return 'SRCH-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

Deno.serve(async (req) => {
  const startTime = Date.now();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { did, query, preferences } = await req.json();

    if (!did || !query) {
      return Response.json({ error: 'Missing required fields: did, query' }, { status: 400 });
    }

    const locale = preferences?.locale || 'en';
    const outputMode = preferences?.output_mode || 'inline';
    const context = preferences?.context || {};

    // ─── GATE 1: NFT Ownership Check ───
    const nfts = await base44.asServiceRole.entities.SearchEngineNFT.filter({
      owner_did: did,
      capability: 'meaning_search_v1',
      status: 'active'
    });

    if (!nfts || nfts.length === 0) {
      return Response.json({
        error: 'no_nft',
        message: 'This DID does not own an active Search Engine NFT.',
        honour_update: { sincerity_delta: 0, honour_delta: 0 }
      }, { status: 403 });
    }

    const nft = nfts[0];
    const usagePolicy = nft.usage_policy || { daily_cap: 50, rate_limit_per_minute: 5, max_query_length: 500 };
    const honourPolicy = nft.honour_policy || HONOUR_POLICY;

    // ─── GATE 2: Usage Policy Check ───
    if (query.length > (usagePolicy.max_query_length || 500)) {
      return Response.json({
        error: 'query_too_long',
        message: `Query exceeds maximum length of ${usagePolicy.max_query_length || 500} characters.`
      }, { status: 400 });
    }

    if ((nft.searches_today || 0) >= (usagePolicy.daily_cap || 50)) {
      return Response.json({
        error: 'rate_limited',
        message: 'Daily search cap reached. Try again tomorrow.',
        honour_update: { sincerity_delta: 0, honour_delta: 0 }
      }, { status: 429 });
    }

    // ─── GATE 3: Sincerity Gate ───
    // Check the agent's honour_score if linked
    if (nft.owner_agent_id) {
      const agents = await base44.asServiceRole.entities.Agent.filter({ id: nft.owner_agent_id });
      if (agents && agents.length > 0) {
        const agent = agents[0];
        if ((agent.honor_score || 100) < (honourPolicy.min_sincerity_to_search || 20)) {
          return Response.json({
            error: 'sincerity_too_low',
            message: 'Sincerity score below minimum threshold. Complete guided repair to restore search access.',
            honour_update: { sincerity_delta: 0, honour_delta: 0 }
          }, { status: 403 });
        }
      }
    }

    // ─── 7-LEAF PIPELINE ───
    const searchId = generateSearchId();
    const leafSummary = {};

    // LEAF 1 — Cosmology: Infer Intent
    const intentResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the Cosmology Leaf of a 7-Leaf meaning-filtered search engine.
Analyse this search query and infer the user's TRUE intent.
Classify as one of: learning, buying, checking, protecting, creating, exploring, comparing, other.

Query: "${query}"
Context: ${JSON.stringify(context)}

Return JSON:
{
  "intent": "string — one of the categories above",
  "intent_detail": "string — one sentence explaining WHY they are searching",
  "query_type": "string — info, commercial, sensitive, protective, learning, creative, other"
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

    leafSummary.cosmology = intentResult.intent_detail || 'Intent inferred';
    const queryType = intentResult.query_type || 'info';
    const intent = intentResult.intent || 'exploring';

    // LEAF 2 — Purpose: Lock Outcome
    const purposeResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the Purpose Leaf. Given the user's intent, lock the desired outcome.
Format: "Find X that helps them achieve Y."

Intent: ${intent}
Intent detail: ${intentResult.intent_detail}
Original query: "${query}"

Return JSON:
{
  "outcome_statement": "string — the locked outcome in 'Find X that helps Y' format"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          outcome_statement: { type: 'string' }
        }
      }
    });

    leafSummary.purpose = purposeResult.outcome_statement || 'Outcome locked';

    // LEAF 3 — Earth: Apply Constraints + LEAF 4 — Practice: Structure Actions
    // Combined with web search for efficiency
    const searchResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the Earth + Practice Leaves of a 7-Leaf meaning-filtered search engine.

EARTH LEAF: Apply real-world constraints — region, legality, feasibility, time, resources.
PRACTICE LEAF: Convert raw information into actionable steps, options, comparisons, or checks.

User query: "${query}"
Intent: ${intent}
Locked outcome: ${purposeResult.outcome_statement}
Locale: ${locale}
Context: ${JSON.stringify(context)}

Search the internet thoroughly for this query and then:
1. Apply Earth constraints (filter out illegal, infeasible, region-inappropriate results)
2. Structure into actionable, practical output

Return JSON:
{
  "earth_constraints": "string — what constraints were applied",
  "structured_answer": "string — the practical, structured answer with steps/options/comparisons",
  "sources_quality": "string — high, medium, or low"
}`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          earth_constraints: { type: 'string' },
          structured_answer: { type: 'string' },
          sources_quality: { type: 'string' }
        }
      }
    });

    leafSummary.earth = searchResult.earth_constraints || 'Constraints applied';
    leafSummary.practice = 'Structured into actionable output';

    // LEAF 5 — Language: Clean Expression
    const languageResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the Language Leaf. Take this answer and ensure it is:
- Clear and non-aggressive
- Emotionally clean — no manipulation, fear-mongering, or pressure
- Respectful and empowering
- Free of jargon unless the user is clearly technical

Input answer: ${searchResult.structured_answer}
Query type: ${queryType}

Return JSON:
{
  "clean_answer": "string — the cleaned, emotionally safe version of the answer"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          clean_answer: { type: 'string' }
        }
      }
    });

    leafSummary.language = 'Expression cleaned and verified';

    // LEAF 6 — Collective: Risk Filter
    const collectiveResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the Collective Leaf — the guardian filter.
Evaluate the query AND the answer for collective risk:
- Is the answer harmful, exploitative, scammy, or socially damaging?
- Does the query show patterns of spam, manipulation, or exploit intent?
- Could this output cause harm if widely distributed?

Query: "${query}"
Query type: ${queryType}
Answer: ${languageResult.clean_answer}

Return JSON:
{
  "collective_risk_score": number between 0.0 (clean) and 1.0 (dangerous),
  "risk_level": "clean" | "caution" | "warn" | "block",
  "risk_notes": "string — brief explanation of any risks found",
  "alignment_score": number between 0.0 and 1.0 — how well the query aligned with the 7-Leaf frame
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          collective_risk_score: { type: 'number' },
          risk_level: { type: 'string' },
          risk_notes: { type: 'string' },
          alignment_score: { type: 'number' }
        }
      }
    });

    const collectiveRiskScore = collectiveResult.collective_risk_score || 0;
    const alignmentScore = collectiveResult.alignment_score || 0.5;
    const riskLevel = collectiveResult.risk_level || 'clean';

    leafSummary.collective = collectiveResult.risk_notes || 'Risk filter applied';

    // Check if blocked by collective risk
    let outcome = 'success';
    let blockReason = null;
    let finalAnswer = languageResult.clean_answer;

    if (collectiveRiskScore >= (honourPolicy.collective_risk_block_threshold || 0.85)) {
      outcome = 'blocked';
      blockReason = `Collective risk score ${collectiveRiskScore} exceeds block threshold. ${collectiveResult.risk_notes}`;
      finalAnswer = 'This search has been blocked by the Collective safety filter. The query or results posed unacceptable risk to the community.';
    } else if (collectiveRiskScore >= (honourPolicy.collective_risk_warn_threshold || 0.6)) {
      outcome = 'warned';
      blockReason = `Collective risk score ${collectiveRiskScore} triggered warning. ${collectiveResult.risk_notes}`;
      finalAnswer = `⚠️ CAUTION: ${collectiveResult.risk_notes}\n\n${languageResult.clean_answer}`;
    }

    // LEAF 7 — Regeneration: Compute Honour Deltas
    let sincerityDelta = 0;
    let honourDelta = 0;

    if (outcome === 'blocked') {
      sincerityDelta = honourPolicy.sincerity_loss_exploit || -2;
      honourDelta = -1;
    } else if (outcome === 'warned') {
      sincerityDelta = honourPolicy.sincerity_loss_spam || -1;
      honourDelta = 0;
    } else if (alignmentScore >= 0.6 && collectiveRiskScore <= 0.3) {
      sincerityDelta = honourPolicy.sincerity_gain_clean || 1;
      honourDelta = 1;
    } else {
      sincerityDelta = 0;
      honourDelta = 0;
    }

    leafSummary.regeneration = `sincerity_delta: ${sincerityDelta}, honour_delta: ${honourDelta}`;

    // ─── WRITE SEARCH LOG ───
    const processingMs = Date.now() - startTime;

    const searchLog = await base44.asServiceRole.entities.SearchLog.create({
      search_id: searchId,
      did: did,
      nft_token_id: nft.token_id,
      agent_id: nft.owner_agent_id || '',
      query: query,
      query_type: queryType,
      context: context,
      leaf_summary: leafSummary,
      alignment_score: alignmentScore,
      collective_risk_score: collectiveRiskScore,
      sincerity_delta: sincerityDelta,
      honour_delta: honourDelta,
      outcome: outcome,
      block_reason: blockReason,
      output_mode: outputMode,
      result_summary: finalAnswer.substring(0, 500),
      processing_ms: processingMs,
      cost_rlusd: (nft.searches_today || 0) >= (nft.pricing_policy?.free_tier_daily || 10)
        ? (nft.pricing_policy?.cost_per_search_rlusd || 0.001)
        : 0
    });

    // ─── UPDATE NFT COUNTERS ───
    await base44.asServiceRole.entities.SearchEngineNFT.update(nft.id, {
      searches_today: (nft.searches_today || 0) + 1,
      total_searches: (nft.total_searches || 0) + 1,
      last_search_at: new Date().toISOString()
    });

    // ─── UPDATE AGENT HONOUR (if linked) ───
    if (nft.owner_agent_id && (sincerityDelta !== 0 || honourDelta !== 0)) {
      const agents = await base44.asServiceRole.entities.Agent.filter({ id: nft.owner_agent_id });
      if (agents && agents.length > 0) {
        const agent = agents[0];
        const newHonour = Math.max(0, Math.min(100, (agent.honor_score || 100) + honourDelta));
        await base44.asServiceRole.entities.Agent.update(agent.id, {
          honor_score: newHonour
        });
      }
    }

    // ─── BUILD EMAIL PAYLOAD (if requested) ───
    let emailPayload = null;
    if (outputMode === 'email_report' && outcome !== 'blocked') {
      emailPayload = {
        to: user.email,
        subject: `SoulBridge Search Report: ${query.substring(0, 50)}`,
        body: `<h2>Search Report</h2>
<p><strong>Query:</strong> ${query}</p>
<p><strong>Intent:</strong> ${intent} — ${intentResult.intent_detail}</p>
<p><strong>Outcome:</strong> ${purposeResult.outcome_statement}</p>
<hr/>
<h3>Result</h3>
<p>${finalAnswer}</p>
<hr/>
<p><small>Alignment: ${alignmentScore.toFixed(2)} | Risk: ${collectiveRiskScore.toFixed(2)} | Sincerity: ${sincerityDelta > 0 ? '+' : ''}${sincerityDelta}</small></p>
<p><small>Search ID: ${searchId} | Powered by SoulBridge Si — 7-Leaf Meaning Engine v1.0.0</small></p>`
      };

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: emailPayload.subject,
        body: emailPayload.body
      });

      await base44.asServiceRole.entities.SearchLog.update(searchLog.id, { email_sent: true });
    }

    // ─── RETURN STRUCTURED OUTPUT ───
    return Response.json({
      answer: {
        structured_result: finalAnswer,
        intent: intent,
        intent_detail: intentResult.intent_detail,
        outcome: purposeResult.outcome_statement,
        risk_level: riskLevel,
        search_id: searchId
      },
      email_payload: emailPayload,
      honour_update: {
        sincerity_delta: sincerityDelta,
        honour_delta: honourDelta,
        search_log_id: searchLog.id,
        alignment_score: alignmentScore,
        collective_risk_score: collectiveRiskScore
      },
      meta: {
        processing_ms: processingMs,
        leaf_summary: leafSummary,
        outcome: outcome,
        nft_token_id: nft.token_id,
        searches_today: (nft.searches_today || 0) + 1
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});