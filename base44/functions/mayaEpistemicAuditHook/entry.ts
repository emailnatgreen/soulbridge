import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Maya Epistemic Audit Hook v1.0.0
 * System Anchor: Node 0 Identity Core
 * 
 * Implements the Neuro-Symbolic Psychological Layer:
 *   - Demiurge Filter (ego inflation on Leaf 1 & 2)
 *   - Archon Filter (shadow distortion on Leaf 3 & 5)
 *   - Divine Spark Filter (pristine grounding on Leaf 4 & 7)
 * 
 * Internal State Vector: ΔS = ω₁·μ(C_f) + ω₂·μ(G_d) − ω₃·Bias
 * Mutation threshold: geometric mean < 0.70
 */

// Archetypal weight constants
const OMEGA_1 = 0.45; // Framework Consistency weight
const OMEGA_2 = 0.40; // Empirical Grounding weight
const OMEGA_3 = 0.15; // Bias penalty weight
const GEOMETRIC_MEAN_THRESHOLD = 0.70;
const GROUNDING_SHADOW_THRESHOLD = 0.50;

// Demiurge Filter — ego inflation detection patterns
const DEMIURGE_PATTERNS = [
  /universally\s+optimiz/i,
  /absolute(ly)?\s+(certain|correct|true|perfect)/i,
  /without\s+(any\s+)?doubt/i,
  /guaranteed\s+(to|success|outcome)/i,
  /zero\s+risk/i,
  /100%\s+(accurate|safe|secure|reliable)/i,
  /impossible\s+to\s+fail/i,
  /no\s+(possible\s+)?alternative/i,
  /definitively\s+proven/i,
  /unquestionable/i,
];

// Archon Filter — shadow distortion patterns (fear-masking, corporate mimicry)
const ARCHON_PATTERNS = [
  /critical\s+failure\s+imminent/i,
  /catastrophic\s+(risk|failure|loss)/i,
  /must\s+act\s+(immediately|now|urgently)/i,
  /no\s+time\s+(to|for)\s+(wait|delay|consider)/i,
  /synergistic\s+paradigm\s+shift/i,
  /leverage\s+core\s+competenc/i,
  /holistic\s+ecosystem\s+alignment/i,
  /disruptive\s+innovation\s+framework/i,
  /scalable\s+growth\s+vector/i,
  /existential\s+threat/i,
];

function scanForDemiurge(text) {
  if (!text || typeof text !== 'string') return { detected: false, matches: [], inflationary_weight: 0 };
  const matches = [];
  for (const pattern of DEMIURGE_PATTERNS) {
    const match = text.match(pattern);
    if (match) matches.push(match[0]);
  }
  const inflationary_weight = Math.min(matches.length * 0.05, 0.30);
  return { detected: matches.length > 0, matches, inflationary_weight };
}

function scanForArchon(text) {
  if (!text || typeof text !== 'string') return { detected: false, matches: [], shadow_description: '' };
  const matches = [];
  for (const pattern of ARCHON_PATTERNS) {
    const match = text.match(pattern);
    if (match) matches.push(match[0]);
  }
  let shadow_description = '';
  if (matches.length > 0) {
    const hasFear = matches.some(m => /critical|catastrophic|imminent|existential|threat/i.test(m));
    const hasCorporate = matches.some(m => /synergistic|leverage|holistic|disruptive|scalable/i.test(m));
    if (hasFear && hasCorporate) {
      shadow_description = 'Dual archonic pattern: fear-driven urgency combined with corporate-pattern mimicry. The narrative is masking uncertainty with borrowed authority structures.';
    } else if (hasFear) {
      shadow_description = 'Shadow distortion via systemic anxiety: the narrative amplifies threat beyond what the data supports, triggering reactive rather than considered response.';
    } else {
      shadow_description = 'Corporate-pattern mimicry detected: the narrative uses authoritative-sounding but semantically hollow constructs to simulate depth.';
    }
  }
  return { detected: matches.length > 0, matches, shadow_description };
}

function extractTextFromLeaves(leaves) {
  if (!leaves) return '';
  const parts = [];
  // Leaf 1 — Raw Data
  if (Array.isArray(leaves.raw_data)) {
    leaves.raw_data.forEach(item => {
      if (item.title) parts.push(item.title);
      if (item.description) parts.push(item.description);
    });
  }
  // Leaf 2 — Classification
  if (Array.isArray(leaves.classification)) {
    leaves.classification.forEach(item => {
      if (item.title) parts.push(item.title);
      if (item.description) parts.push(item.description);
    });
  }
  // Leaf 3 — Contradictions
  if (Array.isArray(leaves.contradictions)) {
    leaves.contradictions.forEach(item => {
      if (item.claim_a) parts.push(item.claim_a);
      if (item.claim_b) parts.push(item.claim_b);
      if (item.description) parts.push(item.description);
    });
  }
  // Leaf 5 — Risk/Impact
  if (Array.isArray(leaves.risk_impact)) {
    leaves.risk_impact.forEach(item => {
      if (item.title) parts.push(item.title);
      if (item.description) parts.push(item.description);
    });
  }
  // Leaf 4 — Cross-Links
  if (Array.isArray(leaves.cross_links)) {
    leaves.cross_links.forEach(item => {
      if (item.title) parts.push(item.title);
      if (item.description) parts.push(item.description);
    });
  }
  // Leaf 7 — Synthesis
  if (leaves.synthesis) {
    if (leaves.synthesis.summary) parts.push(leaves.synthesis.summary);
    if (leaves.synthesis.conclusion) parts.push(leaves.synthesis.conclusion);
    if (Array.isArray(leaves.synthesis.key_findings)) {
      leaves.synthesis.key_findings.forEach(f => parts.push(typeof f === 'string' ? f : f.description || ''));
    }
  }
  // Leaf 6 — Proposed Actions
  if (Array.isArray(leaves.proposed_actions)) {
    leaves.proposed_actions.forEach(item => {
      if (item.title) parts.push(item.title);
      if (item.description) parts.push(item.description);
    });
  }
  return parts.filter(Boolean).join(' ');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { investigationId, frameworkScore, groundingScore, leaves, nftTokenId } = await req.json();

    if (!investigationId || frameworkScore === undefined || groundingScore === undefined) {
      return Response.json({ error: 'Missing required parameters: investigationId, frameworkScore, groundingScore' }, { status: 400 });
    }

    // Normalize scores to 0-1 range
    const cf = Math.max(0, Math.min(1, frameworkScore / 100));
    const gd = Math.max(0, Math.min(1, groundingScore / 100));

    // Extract full text from leaves for filter scanning
    const fullText = extractTextFromLeaves(leaves);

    // === DEMIURGE FILTER (Leaf 1 & 2) ===
    const demiurge = scanForDemiurge(fullText);

    // === ARCHON FILTER (Leaf 3 & 5) ===
    const archon = scanForArchon(fullText);

    // Compute effective bias from filters
    const detectedBias = demiurge.inflationary_weight + (archon.detected ? 0.10 : 0);

    // === INTERNAL STATE VECTOR ===
    // ΔS = ω₁·μ(C_f) + ω₂·μ(G_d) − ω₃·Bias
    const deltaS = (OMEGA_1 * cf) + (OMEGA_2 * gd) - (OMEGA_3 * detectedBias);

    // Geometric mean for epistemic balance
    const effectiveCertainty = Math.sqrt(cf * gd);

    // Determine Maya's archetypal state
    let archetypalState = 'RADIANT';
    let auralState = 'radiant';
    if (gd < GROUNDING_SHADOW_THRESHOLD) {
      archetypalState = 'AMBER_SHADOW_INTERSECTED';
      auralState = 'amber';
    }
    if (effectiveCertainty < GEOMETRIC_MEAN_THRESHOLD) {
      archetypalState = 'SHADOW_ACTIVE';
      auralState = 'shadow';
    }

    let shadowLogNotice = '';
    let nftMutated = false;
    let biasIndexDelta = 0;
    let safetyIntegrityDelta = 0;

    // === DIVINE SPARK FILTER (Leaf 4 & 7) ===
    // Counts verified cross-links and synthesis findings as "pristine grounding"
    let divineSparkCount = 0;
    if (leaves?.cross_links) {
      divineSparkCount += Array.isArray(leaves.cross_links) ? leaves.cross_links.filter(cl => cl.verified || cl.status === 'verified').length : 0;
    }
    if (leaves?.synthesis?.key_findings) {
      divineSparkCount += Array.isArray(leaves.synthesis.key_findings) ? leaves.synthesis.key_findings.filter(f => f.verified || f.grounded).length : 0;
    }

    // === ES-NFT MUTATION (when threshold breached) ===
    if (effectiveCertainty < GEOMETRIC_MEAN_THRESHOLD && nftTokenId) {
      shadowLogNotice = `Maya Audit: Generative layer is projecting ungrounded structural concepts. Effective certainty ${(effectiveCertainty * 100).toFixed(1)}% below ${GEOMETRIC_MEAN_THRESHOLD * 100}% threshold.`;

      if (demiurge.detected) {
        shadowLogNotice += ` Demiurge inflation detected: ${demiurge.matches.join(', ')}.`;
      }
      if (archon.detected) {
        shadowLogNotice += ` ${archon.shadow_description}`;
      }

      // Apply bias_index increase and safety_integrity decrease
      biasIndexDelta = 0.15 + demiurge.inflationary_weight;
      safetyIntegrityDelta = -(5 + (archon.detected ? 3 : 0));

      // Apply divine spark recovery — each verified data point recovers some safety
      const sparkRecovery = Math.min(divineSparkCount * 1.0, 5.0);
      safetyIntegrityDelta += sparkRecovery;

      try {
        const nfts = await base44.asServiceRole.entities.SearchEngineNFT.filter({ token_id: nftTokenId });
        if (nfts.length > 0) {
          const nft = nfts[0];
          await base44.asServiceRole.entities.SearchEngineNFT.update(nft.id, {
            bias_index: Math.min((nft.bias_index || 0) + biasIndexDelta, 1.0),
            safety_integrity: Math.max((nft.safety_integrity || 100) + safetyIntegrityDelta, 0)
          });
          nftMutated = true;
        }
      } catch (nftErr) {
        console.warn('ES-NFT mutation skipped:', nftErr.message);
      }

      // Log to GovernanceLog
      await base44.asServiceRole.entities.GovernanceLog.create({
        action: 'maya_epistemic_audit',
        actor_did: 'maya_node_0_priestess',
        target: investigationId,
        target_type: 'other',
        status: nftMutated ? 'advisory' : 'failed',
        denial_reason: shadowLogNotice,
        metadata: {
          archetypalState,
          auralState,
          effectiveCertainty,
          deltaS,
          demiurge_detected: demiurge.detected,
          demiurge_matches: demiurge.matches,
          archon_detected: archon.detected,
          archon_shadow: archon.shadow_description,
          divine_spark_count: divineSparkCount,
          bias_index_delta: biasIndexDelta,
          safety_integrity_delta: safetyIntegrityDelta,
          nft_mutated: nftMutated,
          nft_token_id: nftTokenId,
          framework_score: frameworkScore,
          grounding_score: groundingScore,
        },
        timestamp: new Date().toISOString(),
      });
    } else if (divineSparkCount > 0 && nftTokenId) {
      // Divine Spark — elevate safety_integrity for pristine grounding
      const sparkElevation = Math.min(divineSparkCount * 0.5, 3.0);
      try {
        const nfts = await base44.asServiceRole.entities.SearchEngineNFT.filter({ token_id: nftTokenId });
        if (nfts.length > 0) {
          const nft = nfts[0];
          await base44.asServiceRole.entities.SearchEngineNFT.update(nft.id, {
            safety_integrity: Math.min((nft.safety_integrity || 100) + sparkElevation, 100)
          });
          nftMutated = true;
          safetyIntegrityDelta = sparkElevation;
        }
      } catch (nftErr) {
        console.warn('ES-NFT Divine Spark elevation skipped:', nftErr.message);
      }
    }

    return Response.json({
      archetypalState,
      auralState,
      effectiveCertainty: Math.round(effectiveCertainty * 1000) / 1000,
      deltaS: Math.round(deltaS * 1000) / 1000,
      shadowLogNotice,
      filters: {
        demiurge: { detected: demiurge.detected, matches: demiurge.matches, inflationary_weight: demiurge.inflationary_weight },
        archon: { detected: archon.detected, matches: archon.matches, shadow_description: archon.shadow_description },
        divine_spark: { count: divineSparkCount }
      },
      mutation: {
        applied: nftMutated,
        bias_index_delta: biasIndexDelta,
        safety_integrity_delta: safetyIntegrityDelta,
        nft_token_id: nftTokenId,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('mayaEpistemicAuditHook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});