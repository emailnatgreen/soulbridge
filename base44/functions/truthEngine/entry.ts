import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Truth Engine — 7-Leaf Verification Pipeline
 * ═══════════════════════════════════════════════
 * SINGLE ENTRYPOINT for all truth verification work.
 *
 * Contracts:
 *   Schema:  TruthReportV1 (1.0.0)
 *   Policy:  TruthPolicyV1 (1.0.0)
 *   NFT:     ResearchNFTMetadataV1 (1.0.0)
 *   Hash:    SHA-256, sorted keys, canonical JSON
 *
 * Actions:
 *   ask         — Full pipeline
 *   status      — Get report by ID
 *   health      — Engine health metrics (last N reports)
 *   mint_intent — Signal mint intent for a report
 */

// ═══════════════════════════════════════════════
//  FROZEN CONTRACTS (inline — mirrored in lib/truthContracts.js)
// ═══════════════════════════════════════════════

const SCHEMA = { name: 'TruthReportV1', version: '1.0.0', hash_algo: 'sha256' };
const ENGINE = { name: 'SoulBridge Truth Engine', version: '2.7.2' };

// ═══ PATCH 2 — Config Guardrails (v2.7.2) ═══
// Hard constant: bypass can NEVER activate in production
// Environment defaults to production (safe default) — no secret required
const ENVIRONMENT = 'production';
const ALLOW_BYPASS = (ENVIRONMENT === 'development');

function enforceConfigGuardrails(bypassFlag) {
  if (ENVIRONMENT === 'production' && bypassFlag === true) {
    const auditEntry = {
      action_type: 'bypass_blocked',
      environment: ENVIRONMENT,
      bypass_flag: bypassFlag,
      timestamp: new Date().toISOString(),
      truth_engine_version: ENGINE.version,
    };
    console.log(`[truthEngine] CONFIG GUARDRAIL: bypass blocked in production`, JSON.stringify(auditEntry));
    throw new Error('SecurityException: Bypass not permitted in production');
  }
  return { bypass_active: false, source: 'config_guardrail' };
}

// ═══ PATCH 3 — Validator-07 Calibration (v1.4.0) ═══
const VALIDATOR_07 = { name: 'Validator-07', version: '1.4.0' };
const LATENCY_WARN = 2000; // ms threshold for high-latency classification
const LATENCY_SAMPLE_WINDOW = 20;
const OUTLIER_THRESHOLD_BASE = 0.15; // base mismatch threshold
const OUTLIER_THRESHOLD_JITTER_BOOST = 0.15; // +15% during high-latency windows
const MAX_RETRIES_LATENCY = 2; // reduced from 5 → 2 when latency is cause

function calibrateValidator07(latencySamples, networkLatency) {
  const recentSamples = (latencySamples || []).slice(-LATENCY_SAMPLE_WINDOW);
  const movingAvg = recentSamples.length > 0
    ? recentSamples.reduce((a, b) => a + b, 0) / recentSamples.length
    : 0;
  const isHighLatency = networkLatency > LATENCY_WARN || movingAvg > LATENCY_WARN;
  const effectiveThreshold = isHighLatency
    ? OUTLIER_THRESHOLD_BASE * (1 + OUTLIER_THRESHOLD_JITTER_BOOST)
    : OUTLIER_THRESHOLD_BASE;
  const maxRetries = isHighLatency ? MAX_RETRIES_LATENCY : 5;
  const packetClassification = networkLatency > LATENCY_WARN ? 'delayed' : 'normal';

  return {
    moving_avg_ms: Math.round(movingAvg),
    is_high_latency: isHighLatency,
    effective_threshold: Math.round(effectiveThreshold * 10000) / 10000,
    max_retries: maxRetries,
    packet_classification: packetClassification,
    validator_version: VALIDATOR_07.version,
  };
}

// TruthPolicyV1 — frozen thresholds
const POLICY = {
  name: 'TruthPolicyV1',
  version: '1.0.0',
  block_avg: 0.4,
  flag_avg: 0.7,
  flag_min_claim: 0.6,
};

// ═══════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════

// Deterministic JSON for hashing — sorted keys, no UI fluff
function canonicalStringify(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function deepSortKeys(obj) {
  if (Array.isArray(obj)) return obj.map(deepSortKeys);
  if (obj !== null && typeof obj === 'object') {
    const sorted = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = deepSortKeys(obj[key]);
    }
    return sorted;
  }
  return obj;
}

async function sha256(payload) {
  const sorted = deepSortKeys(payload);
  const data = new TextEncoder().encode(JSON.stringify(sorted));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function buildCanonicalPayload(reportId, question, rawAnswer, claims, leaf2, leaf3, leaf4, leaf5, leaf6, leaf7, createdAt) {
  return {
    schema: SCHEMA.name,
    version: SCHEMA.version,
    report_id: reportId,
    created_at: createdAt,
    question,
    raw_answer: rawAnswer,
    leaf1_claims: claims,
    leaf2_evidence: leaf2,
    leaf3_scores: leaf3,
    leaf4_reasoning: leaf4,
    leaf5_policy: leaf5,
    leaf6_risks: leaf6,
    leaf7_synthesis: leaf7,
  };
}

function buildVeracitySummary(leaf3, leaf6) {
  const scores = (leaf3 || []).map(s => s.veracity_score).filter(v => typeof v === 'number');
  return {
    avg_score: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 1000) / 1000 : 0,
    min_score: scores.length > 0 ? Math.round(Math.min(...scores) * 1000) / 1000 : 0,
    max_score: scores.length > 0 ? Math.round(Math.max(...scores) * 1000) / 1000 : 0,
    claims_count: (leaf3 || []).length,
    risks_count: (leaf6 || []).length,
  };
}

function applyPolicy(veracitySummary, lowClaimsCount) {
  const avg = veracitySummary.avg_score;
  if (avg < POLICY.block_avg) {
    return {
      decision: 'block',
      reason: `avg_score ${(avg * 100).toFixed(0)}% < ${POLICY.block_avg * 100}% block threshold`,
      overall_veracity: Math.round(avg * 100) / 100,
      ruleset: POLICY.name,
    };
  }
  if (avg < POLICY.flag_avg || lowClaimsCount > 0) {
    return {
      decision: 'flag',
      reason: `${lowClaimsCount} claim(s) below ${POLICY.flag_min_claim * 100}% threshold — manual review recommended`,
      overall_veracity: Math.round(avg * 100) / 100,
      ruleset: POLICY.name,
    };
  }
  return {
    decision: 'allow',
    reason: `all claims >= ${POLICY.flag_min_claim * 100}% and avg_score >= ${POLICY.flag_avg * 100}%`,
    overall_veracity: Math.round(avg * 100) / 100,
    ruleset: POLICY.name,
  };
}

function buildNFTMetadata(reportId, reportHash, question, createdAt, veracitySummary) {
  return {
    name: `Truth Report #${reportId.slice(-6).toUpperCase()}`,
    description: '7-Leaf epistemic verification report for a single question.',
    question: question.substring(0, 200),
    report_id: reportId,
    report_hash: reportHash,
    schema: SCHEMA.name,
    created_at: createdAt,
    veracity: {
      avg_score: veracitySummary.avg_score,
      min_score: veracitySummary.min_score,
      max_score: veracitySummary.max_score,
      claims_count: veracitySummary.claims_count,
    },
    engine: { ...ENGINE },
  };
}

function buildNode3Outbox(reportId, reportHash, veracitySummary, createdAt) {
  const outbox = {
    status: 'pending',
    schema: SCHEMA.name,
    hash_algo: SCHEMA.hash_algo,
    payload_hash: reportHash,
    queued_at: new Date().toISOString(),
  };
  console.log(`[truthEngine] Node 3 outbox: queued ${reportId} | hash=${reportHash.substring(0, 16)}… | avg=${veracitySummary.avg_score}`);
  return outbox;
}

// ═══════════════════════════════════════════════
//  HTTP HANDLER
// ═══════════════════════════════════════════════

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action || 'ask';

    // ─── STATUS ───
    if (action === 'status') {
      const { report_id } = body;
      if (!report_id) return Response.json({ error: 'report_id required' }, { status: 400 });
      const report = await base44.asServiceRole.entities.TruthReport.get(report_id);
      return Response.json({ report });
    }

    // ─── HEALTH ───
    if (action === 'health') {
      const limit = body.limit || 10;
      const reports = await base44.asServiceRole.entities.TruthReport.list('-created_date', limit);
      const completed = reports.filter(r => r.status === 'complete');
      const failed = reports.filter(r => r.status === 'failed');

      const durations = completed.map(r => r.processing_ms).filter(Boolean);
      const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

      // Per-step averages from latency field
      const latencyFields = ['llm_draft_ms', 'claim_extraction_ms', 'verification_ms', 'synthesis_ms', 'hash_ms'];
      const stepAvgs = {};
      for (const field of latencyFields) {
        const vals = completed.map(r => r.latency?.[field]).filter(Boolean);
        stepAvgs[field] = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
      }

      const lastReport = reports[0];
      const lastStatus = lastReport?.status === 'complete' ? 'ok' : lastReport?.status === 'processing' ? 'running' : lastReport?.status === 'failed' ? 'degraded' : 'idle';

      return Response.json({
        engine: ENGINE,
        schema: SCHEMA,
        policy: { name: POLICY.name, version: POLICY.version },
        truth_engine_version: ENGINE.version,
        errval04_patch: 'applied',
        patch1_strict_failure_mode: 'applied',
        patch2_config_guardrails: 'applied',
        patch3_validator07_calibration: 'applied',
        validator_07_version: VALIDATOR_07.version,
        environment: ENVIRONMENT,
        allow_bypass: ALLOW_BYPASS,
        source_of_truth: 'primary',
        health: {
          last_status: lastStatus,
          last_report_id: lastReport?.id || null,
          last_report_at: lastReport?.created_date || null,
          total_sampled: reports.length,
          completed: completed.length,
          failed: failed.length,
          success_rate: reports.length > 0 ? `${completed.length}/${reports.length}` : '0/0',
          avg_duration_ms: avgDuration,
          step_averages: stepAvgs,
        },
      });
    }

    // ─── MINT INTENT ───
    if (action === 'mint_intent') {
      const { report_id } = body;
      if (!report_id) return Response.json({ error: 'report_id required' }, { status: 400 });

      const report = await base44.asServiceRole.entities.TruthReport.get(report_id);
      if (!report || report.status !== 'complete') {
        return Response.json({ error: 'Report must be complete before minting' }, { status: 400 });
      }

      await base44.asServiceRole.entities.TruthReport.update(report_id, {
        mint_intent: true,
        mint_intent_at: new Date().toISOString(),
      });

      console.log(`[truthEngine] Mint intent: ${report_id} by ${user.email} | hash=${report.report_hash?.substring(0, 16)}…`);
      return Response.json({
        status: 'intent_recorded',
        report_id,
        report_hash: report.report_hash,
        nft_metadata: report.nft_metadata,
        veracity_summary: report.veracity_summary,
      });
    }

    // ─── CONFIG GUARDRAIL CHECK (PATCH 2) ───
    if (action === 'config_check' || body.bypass_flag !== undefined) {
      const guardrailResult = enforceConfigGuardrails(body.bypass_flag || false);
      return Response.json({
        ...guardrailResult,
        truth_engine_version: ENGINE.version,
        environment: ENVIRONMENT,
        allow_bypass: ALLOW_BYPASS,
      });
    }

    // ─── ASK (full pipeline) ───
    if (action === 'ask') {
      const { question } = body;
      if (!question || question.trim().length < 3) {
        return Response.json({ error: 'Question is required (min 3 chars)' }, { status: 400 });
      }

      // PATCH 2: Enforce config guardrails before pipeline starts
      enforceConfigGuardrails(body.bypass_flag || false);

      const pipelineStart = Date.now();
      const traceId = `TE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const createdAt = new Date().toISOString();
      const latencySamples = []; // Validator-07 latency tracker

      const report = await base44.asServiceRole.entities.TruthReport.create({
        question: question.trim(),
        status: 'processing',
        schema_version: 'v1',
        hash_algo: 'sha256',
      });

      // ── Step 1: LLM Draft ──
      const t1 = Date.now();
      const answerResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Answer the following question thoroughly but concisely. Be factual and specific.\n\nQuestion: ${question}`,
        response_json_schema: {
          type: "object",
          properties: { answer_text: { type: "string" } },
          required: ["answer_text"]
        }
      });
      const llmDraftMs = Date.now() - t1;
      latencySamples.push(llmDraftMs);

      // PATCH 1 — Strict Failure Mode: null agent response check (Agent-Alpha / LLM Draft)
      if (!answerResult || answerResult.answer_text == null) {
        const nullAudit = {
          action_type: 'validation_incomplete',
          agent: 'Agent-Alpha',
          reason: 'null_response',
          trace_id: traceId,
          timestamp: new Date().toISOString(),
          truth_engine_version: ENGINE.version,
        };
        console.error(`[truthEngine] STRICT FAILURE: Agent-Alpha null response`, JSON.stringify(nullAudit));
        await base44.asServiceRole.entities.TruthReport.update(report.id, {
          status: 'failed',
          leaf4_reasoning: `ValidationIncompleteException: Agent-Alpha returned null. Trace: ${traceId}`,
        });
        return Response.json({
          status: 'incomplete',
          error: 'NULL_AGENT_RESPONSE',
          validation_complete: false,
          agent: 'Agent-Alpha',
          trace_id: traceId,
          audit: nullAudit,
          truth_engine_version: ENGINE.version,
        });
      }
      const rawAnswer = answerResult.answer_text;

      // ── Step 2: Claim Extraction ──
      const t2 = Date.now();
      const claimResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Extract every distinct factual claim from this text as atomic statements. Each claim should be independently verifiable.\n\nText: "${rawAnswer}"`,
        response_json_schema: {
          type: "object",
          properties: {
            claims: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", description: "Claim ID like c1, c2, c3" },
                  text: { type: "string" }
                }
              }
            }
          },
          required: ["claims"]
        }
      });
      const claimExtractionMs = Date.now() - t2;
      latencySamples.push(claimExtractionMs);

      // PATCH 1 — Strict Failure Mode: null agent response check (Claim Extractor)
      if (!claimResult || claimResult.claims == null) {
        const nullAudit = {
          action_type: 'validation_incomplete',
          agent: 'ClaimExtractor',
          reason: 'null_response',
          trace_id: traceId,
          timestamp: new Date().toISOString(),
          truth_engine_version: ENGINE.version,
        };
        console.error(`[truthEngine] STRICT FAILURE: ClaimExtractor null response`, JSON.stringify(nullAudit));
        await base44.asServiceRole.entities.TruthReport.update(report.id, {
          status: 'failed',
          raw_answer: rawAnswer,
          leaf4_reasoning: `ValidationIncompleteException: ClaimExtractor returned null. Trace: ${traceId}`,
        });
        return Response.json({
          status: 'incomplete',
          error: 'NULL_AGENT_RESPONSE',
          validation_complete: false,
          agent: 'ClaimExtractor',
          trace_id: traceId,
          audit: nullAudit,
          truth_engine_version: ENGINE.version,
        });
      }
      const claims = (claimResult.claims || []).slice(0, 10);

      // ── Step 3: Verification (v2.7.0 — ERRVAL04 patch) ──
      // Primary source: internet-backed LLM verification (source_of_truth: "primary")
      // Sub-process B now uses the SAME primary source — no cached/internal flags
      const t3 = Date.now();
      const verificationPrompt = claims.map(c => `- [${c.id}] "${c.text}"`).join('\n');

      // Primary validator (Sub-process A)
      const verifyResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a fact-checker. For each claim below, assess its veracity. Provide:
- veracity_score: 0.0 to 1.0
- confidence: "high", "medium", or "low"
- evidence_summary: brief supporting/contradicting evidence
- sources: 1-3 source types
- risk_flags: concerns (empty array if none)

Claims:
${verificationPrompt}`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: "object",
          properties: {
            verifications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  claim_id: { type: "string" },
                  veracity_score: { type: "number" },
                  confidence: { type: "string" },
                  evidence_summary: { type: "string" },
                  sources: { type: "array", items: { type: "string" } },
                  risk_flags: { type: "array", items: { type: "string" } }
                }
              }
            }
          },
          required: ["verifications"]
        }
      });
      const verifyMs = Date.now() - t3;
      latencySamples.push(verifyMs);

      // PATCH 1 — Strict Failure Mode: null agent response check (PrimaryValidator)
      if (!verifyResult || verifyResult.verifications == null) {
        const nullAudit = {
          action_type: 'validation_incomplete',
          agent: 'PrimaryValidator',
          reason: 'null_response',
          trace_id: traceId,
          timestamp: new Date().toISOString(),
          truth_engine_version: ENGINE.version,
        };
        console.error(`[truthEngine] STRICT FAILURE: PrimaryValidator null response`, JSON.stringify(nullAudit));
        await base44.asServiceRole.entities.TruthReport.update(report.id, {
          status: 'failed',
          raw_answer: rawAnswer,
          leaf1_claims: claims,
          leaf4_reasoning: `ValidationIncompleteException: PrimaryValidator returned null. Trace: ${traceId}`,
        });
        return Response.json({
          status: 'incomplete',
          error: 'NULL_AGENT_RESPONSE',
          validation_complete: false,
          agent: 'PrimaryValidator',
          trace_id: traceId,
          audit: nullAudit,
          truth_engine_version: ENGINE.version,
        });
      }
      const primaryVerifications = verifyResult.verifications || [];

      // Sub-process B: re-validate using the SAME primary source (ERRVAL04 fix)
      // Replaces any internal/cached verification flags with direct primary call
      const subProcessBResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a secondary fact-checker performing validation consistency checks.
For each claim below, re-assess its veracity independently. Use the same evidence standards as primary verification.
Provide veracity_score (0.0-1.0) and confidence ("high"/"medium"/"low") for each claim.

Claims:
${verificationPrompt}`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: "object",
          properties: {
            verifications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  claim_id: { type: "string" },
                  veracity_score: { type: "number" },
                  confidence: { type: "string" }
                }
              }
            }
          },
          required: ["verifications"]
        }
      });
      const subBMs = Date.now() - t3 - verifyMs;
      latencySamples.push(subBMs);

      // PATCH 1 — Strict Failure Mode: null agent response check (SecondaryValidator / Sub-process B)
      if (!subProcessBResult || subProcessBResult.verifications == null) {
        const nullAudit = {
          action_type: 'validation_incomplete',
          agent: 'SecondaryValidator',
          reason: 'null_response',
          trace_id: traceId,
          timestamp: new Date().toISOString(),
          truth_engine_version: ENGINE.version,
        };
        console.error(`[truthEngine] STRICT FAILURE: SecondaryValidator null response`, JSON.stringify(nullAudit));
        await base44.asServiceRole.entities.TruthReport.update(report.id, {
          status: 'failed',
          raw_answer: rawAnswer,
          leaf1_claims: claims,
          leaf4_reasoning: `ValidationIncompleteException: SecondaryValidator returned null. Trace: ${traceId}`,
        });
        return Response.json({
          status: 'incomplete',
          error: 'NULL_AGENT_RESPONSE',
          validation_complete: false,
          agent: 'SecondaryValidator',
          trace_id: traceId,
          audit: nullAudit,
          truth_engine_version: ENGINE.version,
        });
      }
      const secondaryVerifications = subProcessBResult.verifications || [];

      // PATCH 3 — Validator-07 Calibration: compute adaptive threshold
      const networkLatency = Date.now() - t3; // total verification network time
      const v07Cal = calibrateValidator07(latencySamples, networkLatency);
      console.log(`[truthEngine] Validator-07 calibration: threshold=${v07Cal.effective_threshold} latency=${networkLatency}ms class=${v07Cal.packet_classification} retries=${v07Cal.max_retries}`);

      // ERRVAL04: Mismatch detection — primary source wins (now using calibrated threshold)
      const verificationTraces = [];
      const verifications = primaryVerifications.map(pv => {
        const sv = secondaryVerifications.find(s => s.claim_id === pv.claim_id);
        // PATCH 3: Use calibrated threshold instead of hard-coded 0.15
        const mismatch = sv && Math.abs((pv.veracity_score || 0) - (sv.veracity_score || 0)) > v07Cal.effective_threshold;

        // Trace log for every Sub-process B check (written before returning)
        verificationTraces.push({
          log_type: 'verification_trace',
          sub_process: 'B',
          claim_id: pv.claim_id,
          timestamp: new Date().toISOString(),
          source_used: 'primary',
          primary_value: pv.veracity_score,
          secondary_value: sv?.veracity_score ?? null,
          mismatch_detected: !!mismatch,
          truth_engine_version: ENGINE.version,
        });

        if (mismatch) {
          // Primary source wins — rollback Sub-process B result
          console.log(`[truthEngine] ERRVAL04 mismatch: claim=${pv.claim_id} primary=${pv.veracity_score} secondary=${sv.veracity_score} — primary wins`);
          verificationTraces.push({
            log_type: 'validation_mismatch',
            action_type: 'validation_mismatch',
            error_code: 'ERR_VAL_04',
            claim_id: pv.claim_id,
            primary_value: pv.veracity_score,
            secondary_value: sv.veracity_score,
            resolution: 'primary_source_wins',
            rollback: 'sub_process_b_result_discarded',
            timestamp: new Date().toISOString(),
            truth_engine_version: ENGINE.version,
          });
        }

        // Always return primary — source_of_truth: primary
        return { ...pv, source_of_truth: 'primary' };
      });

      const verificationMs = Date.now() - t3;

      // PATCH 3 — Validator-07 calibration audit entry
      verificationTraces.push({
        log_type: 'validator_calibration',
        action_type: 'validator_calibration',
        validator: VALIDATOR_07.name,
        validator_version: VALIDATOR_07.version,
        reason: 'latency_adjustment',
        calibration: v07Cal,
        network_latency_ms: networkLatency,
        timestamp: new Date().toISOString(),
        truth_engine_version: ENGINE.version,
      });

      // Write trace logs to report metadata
      console.log(`[truthEngine] v${ENGINE.version} verification: ${verifications.length} claims, ${verificationTraces.filter(t => t.mismatch_detected).length} ERRVAL04 mismatches resolved | V07: threshold=${v07Cal.effective_threshold} class=${v07Cal.packet_classification}`);

      // ── Build Leaves 2-6 ──
      const leaf2 = claims.map(c => {
        const v = verifications.find(x => x.claim_id === c.id) || {};
        return { claim_id: c.id, sources: v.sources || [], summary: v.evidence_summary || 'No evidence retrieved' };
      });

      const leaf3 = claims.map(c => {
        const v = verifications.find(x => x.claim_id === c.id) || {};
        return {
          claim_id: c.id,
          veracity_score: typeof v.veracity_score === 'number' ? v.veracity_score : 0.5,
          confidence: v.confidence || 'low',
          notes: v.evidence_summary || '',
        };
      });

      const veracitySummary = buildVeracitySummary(leaf3, []);
      const lowClaims = leaf3.filter(s => s.veracity_score < POLICY.flag_min_claim);
      const highClaims = leaf3.filter(s => s.veracity_score >= 0.8);

      const leaf4 = `Analyzed ${claims.length} claims. ${highClaims.length} scored high confidence (≥0.8). ${lowClaims.length} scored below threshold (<${POLICY.flag_min_claim}). Average veracity: ${(veracitySummary.avg_score * 100).toFixed(1)}%. ${lowClaims.length > 0 ? `Claims requiring attention: ${lowClaims.map(c => c.claim_id).join(', ')}.` : 'All claims within acceptable range.'}`;

      const leaf5 = applyPolicy(veracitySummary, lowClaims.length);

      const leaf6 = [];
      for (const v of verifications) {
        if (v.risk_flags?.length > 0) {
          for (const flag of v.risk_flags) {
            leaf6.push({
              risk_type: 'content_risk',
              severity: v.veracity_score < 0.5 ? 'high' : 'medium',
              description: flag,
              affected_claims: [v.claim_id],
            });
          }
        }
      }
      if (lowClaims.length > 0) {
        leaf6.push({
          risk_type: 'low_veracity',
          severity: veracitySummary.avg_score < POLICY.block_avg ? 'high' : 'medium',
          description: `${lowClaims.length} claim(s) scored below ${POLICY.flag_min_claim} veracity`,
          affected_claims: lowClaims.map(c => c.claim_id),
        });
      }

      // ── Step 4: Synthesis ──
      const t4 = Date.now();
      const synthResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a truth synthesizer. Given the original question, draft answer, and verification results, write a final verified answer. Incorporate corrections where claims scored low. Be direct and factual.

Question: ${question}
Draft Answer: ${rawAnswer}
Verification Summary: ${leaf3.map(s => `[${s.claim_id}] score=${s.veracity_score} confidence=${s.confidence}`).join(', ')}
Low-scoring claims: ${lowClaims.map(c => `[${c.claim_id}] ${c.notes}`).join('; ') || 'None'}

Write the final verified answer:`,
        response_json_schema: {
          type: "object",
          properties: { synthesis: { type: "string" } },
          required: ["synthesis"]
        }
      });
      const synthesisMs = Date.now() - t4;
      latencySamples.push(synthesisMs);

      // PATCH 1 — Strict Failure Mode: null agent response check (Synthesizer)
      if (!synthResult || synthResult.synthesis == null) {
        const nullAudit = {
          action_type: 'validation_incomplete',
          agent: 'Synthesizer',
          reason: 'null_response',
          trace_id: traceId,
          timestamp: new Date().toISOString(),
          truth_engine_version: ENGINE.version,
        };
        console.error(`[truthEngine] STRICT FAILURE: Synthesizer null response`, JSON.stringify(nullAudit));
        await base44.asServiceRole.entities.TruthReport.update(report.id, {
          status: 'failed',
          raw_answer: rawAnswer,
          leaf1_claims: claims,
          leaf2_evidence: leaf2,
          leaf3_scores: leaf3,
          leaf4_reasoning: `ValidationIncompleteException: Synthesizer returned null. Trace: ${traceId}`,
          leaf5_policy: leaf5,
          leaf6_risks: leaf6,
        });
        return Response.json({
          status: 'incomplete',
          error: 'NULL_AGENT_RESPONSE',
          validation_complete: false,
          agent: 'Synthesizer',
          trace_id: traceId,
          audit: nullAudit,
          truth_engine_version: ENGINE.version,
        });
      }
      const leaf7 = synthResult.synthesis;

      // ── Finalize ──
      const finalVeracitySummary = buildVeracitySummary(leaf3, leaf6);

      const t5 = Date.now();
      const canonicalPayload = buildCanonicalPayload(
        report.id, question.trim(), rawAnswer, claims, leaf2, leaf3, leaf4, leaf5, leaf6, leaf7, createdAt
      );
      const reportHash = await sha256(canonicalPayload);
      const hashMs = Date.now() - t5;

      const pipelineMs = Date.now() - pipelineStart;

      const latency = {
        pipeline_ms: pipelineMs,
        llm_draft_ms: llmDraftMs,
        claim_extraction_ms: claimExtractionMs,
        verification_ms: verificationMs,
        synthesis_ms: synthesisMs,
        hash_ms: hashMs,
      };

      const nftMetadata = buildNFTMetadata(report.id, reportHash, question.trim(), createdAt, finalVeracitySummary);
      const node3Outbox = buildNode3Outbox(report.id, reportHash, finalVeracitySummary, createdAt);

      // ── Atomic write (v2.7.0: includes verification traces) ──
      await base44.asServiceRole.entities.TruthReport.update(report.id, {
        raw_answer: rawAnswer,
        schema_version: 'v1',
        hash_algo: 'sha256',
        leaf1_claims: claims,
        leaf2_evidence: leaf2,
        leaf3_scores: leaf3,
        leaf4_reasoning: leaf4,
        leaf5_policy: leaf5,
        leaf6_risks: leaf6,
        leaf7_synthesis: leaf7,
        status: 'complete',
        processing_ms: pipelineMs,
        latency,
        report_hash: reportHash,
        veracity_summary: finalVeracitySummary,
        node3_outbox: node3Outbox,
        nft_metadata: nftMetadata,
        node3_hook: 'outbox_queued',
        base44_hook: 'stub',
      });

      // ── Email ──
      let emailSent = false;
      try {
        const decision = leaf5.decision;
        const policyEmoji = decision === 'allow' ? '✅' : decision === 'flag' ? '⚠️' : '🚫';
        const decColor = decision === 'allow' ? '#4ade80' : decision === 'flag' ? '#fbbf24' : '#f87171';

        const claimRows = claims.map(c => {
          const s = leaf3.find(x => x.claim_id === c.id) || {};
          const sc = s.veracity_score || 0;
          const bar = '█'.repeat(Math.round(sc * 10)) + '░'.repeat(10 - Math.round(sc * 10));
          const clr = sc >= 0.8 ? '#4ade80' : sc >= 0.6 ? '#fbbf24' : '#f87171';
          return `<tr><td style="padding:6px 10px;border-bottom:1px solid #333;color:#ccc;font-size:12px">${c.id}</td><td style="padding:6px 10px;border-bottom:1px solid #333;color:#e0e0e0;font-size:12px">${c.text}</td><td style="padding:6px 10px;border-bottom:1px solid #333;color:${clr};font-family:monospace;font-size:12px">${bar} ${(sc*100).toFixed(0)}%</td><td style="padding:6px 10px;border-bottom:1px solid #333;color:#999;font-size:11px">${s.confidence || '-'}</td></tr>`;
        }).join('');

        const riskRows = leaf6.length > 0
          ? leaf6.map(r => `<li style="color:#f59e0b;font-size:12px;margin:4px 0">⚠️ [${r.severity}] ${r.description} (${r.affected_claims.join(', ')})</li>`).join('')
          : '<li style="color:#4ade80;font-size:12px">No risks identified</li>';

        const emailBody = `<div style="font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px;border-radius:12px;max-width:700px">
  <h1 style="color:#38bdf8;font-size:20px;margin:0 0 4px">🔬 7-Leaf Truth Report</h1>
  <p style="color:#64748b;font-size:11px;margin:0 0 20px">Pipeline: ${(pipelineMs/1000).toFixed(1)}s • ID: ${report.id} • Hash: ${reportHash.substring(0, 12)}… • Schema: ${SCHEMA.name} • Policy: ${POLICY.name}</p>
  <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;margin:0 0 16px"><p style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Question</p><p style="color:#f1f5f9;font-size:14px;margin:0">${question}</p></div>
  <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;margin:0 0 16px"><p style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Policy Decision (${POLICY.name})</p><p style="font-size:16px;margin:0">${policyEmoji} <strong style="color:${decColor}">${decision.toUpperCase()}</strong> — Avg: ${(finalVeracitySummary.avg_score*100).toFixed(0)}% | Min: ${(finalVeracitySummary.min_score*100).toFixed(0)}% | Max: ${(finalVeracitySummary.max_score*100).toFixed(0)}%</p><p style="color:#94a3b8;font-size:12px;margin:4px 0 0">${leaf5.reason}</p></div>
  <div style="margin:0 0 16px"><p style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px">Claims (${claims.length})</p><table style="width:100%;border-collapse:collapse;background:#1e293b;border:1px solid #334155;border-radius:8px"><thead><tr><th style="padding:8px 10px;text-align:left;color:#64748b;font-size:10px;border-bottom:1px solid #475569">ID</th><th style="padding:8px 10px;text-align:left;color:#64748b;font-size:10px;border-bottom:1px solid #475569">Claim</th><th style="padding:8px 10px;text-align:left;color:#64748b;font-size:10px;border-bottom:1px solid #475569">Veracity</th><th style="padding:8px 10px;text-align:left;color:#64748b;font-size:10px;border-bottom:1px solid #475569">Conf</th></tr></thead><tbody>${claimRows}</tbody></table></div>
  <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;margin:0 0 16px"><p style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Risks</p><ul style="margin:0;padding:0 0 0 16px">${riskRows}</ul></div>
  <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;margin:0 0 16px"><p style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Verified Synthesis</p><p style="color:#e2e8f0;font-size:13px;line-height:1.6;margin:0">${leaf7}</p></div>
  <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:12px;margin:0 0 16px"><p style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Cryptographic Anchor</p><p style="color:#38bdf8;font-family:monospace;font-size:11px;margin:0;word-break:break-all">SHA-256: ${reportHash}</p><p style="color:#64748b;font-size:10px;margin:4px 0 0">Schema: ${SCHEMA.name} • Hash: ${SCHEMA.hash_algo} • Node 3: outbox_queued • Latency: LLM ${(llmDraftMs/1000).toFixed(1)}s / Verify ${(verificationMs/1000).toFixed(1)}s / Synth ${(synthesisMs/1000).toFixed(1)}s</p></div>
  <div style="border-top:1px solid #334155;padding-top:12px"><p style="color:#475569;font-size:10px;margin:0">${ENGINE.name} v${ENGINE.version}</p></div>
</div>`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user.email,
          subject: `${policyEmoji} Truth Report: ${question.substring(0, 50)}${question.length > 50 ? '...' : ''}`,
          body: emailBody,
        });
        emailSent = true;
        await base44.asServiceRole.entities.TruthReport.update(report.id, { email_sent: true });
      } catch (emailErr) {
        console.error('[truthEngine] Email failed:', emailErr.message);
      }

      return Response.json({
        report_id: report.id,
        status: 'complete',
        schema: SCHEMA.name,
        schema_version: SCHEMA.version,
        truth_engine_version: ENGINE.version,
        question: question.trim(),
        raw_answer: rawAnswer,
        leaf1_claims: claims,
        leaf2_evidence: leaf2,
        leaf3_scores: leaf3,
        leaf4_reasoning: leaf4,
        leaf5_policy: leaf5,
        leaf6_risks: leaf6,
        leaf7_synthesis: leaf7,
        processing_ms: pipelineMs,
        latency,
        report_hash: reportHash,
        hash_algo: SCHEMA.hash_algo,
        veracity_summary: finalVeracitySummary,
        nft_metadata: nftMetadata,
        node3_outbox: node3Outbox,
        email_sent: emailSent,
        node3_hook: 'outbox_queued',
        base44_hook: 'stub',
        verification_traces: verificationTraces,
        source_of_truth: 'primary',
        errval04_mismatches: verificationTraces.filter(t => t.error_code === 'ERR_VAL_04').length,
        trace_id: traceId,
        validator_07: v07Cal,
        config_guardrail: { bypass_active: false, source: 'config_guardrail' },
        patches_applied: ['PATCH1_strict_failure_mode', 'PATCH2_config_guardrails', 'PATCH3_validator07_calibration'],
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[truthEngine]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});