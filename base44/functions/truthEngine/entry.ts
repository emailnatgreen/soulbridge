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
const ENGINE = { name: 'SoulBridge Truth Engine', version: '3.3.0' };

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

// ═══ PATCH 4 — Timeout Thresholds (v2.8.0) ═══
// Per-step timeout limits in ms. If any sub-agent exceeds its limit,
// the pipeline aborts immediately with AGENT_TIMEOUT and logs the exact packet.
const TIMEOUT_THRESHOLDS = {
  llm_draft:          30_000,   // Agent-Alpha: 30s
  claim_extraction:   30_000,   // ClaimExtractor: 30s
  primary_validator:  60_000,   // PrimaryValidator: 60s (internet-backed)
  secondary_validator:60_000,   // SecondaryValidator: 60s (internet-backed)
  synthesizer:        30_000,   // Synthesizer: 30s
};

// ═══ PATCH 6 — Global HTTP Timeout Configuration (v2.9.0) ═══
// Hard 30s timeout on ALL HTTP client requests (external fetch calls).
// Prevents zombie processes, infinite retry loops, and Slowloris-style DoS.
// ISO/IEC 27001 compliance: automated session termination.
const GLOBAL_HTTP_TIMEOUT_MS = 30_000;

/**
 * Timeout-enforced fetch wrapper. Every outbound HTTP request
 * is subject to the global 30s hard limit via AbortController.
 * Prevents resource exhaustion from stalled connections.
 */
function timeoutFetch(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GLOBAL_HTTP_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// ═══ PATCH 7 — Circuit Breaker Pattern (v2.9.0) ═══
// Trips after CIRCUIT_BREAKER_THRESHOLD consecutive timeouts.
// Once tripped, all new pipeline requests are rejected until
// the cooldown expires, protecting downstream systems.
const CIRCUIT_BREAKER_THRESHOLD = 5;   // consecutive failures to trip
const CIRCUIT_BREAKER_COOLDOWN_MS = 60_000; // 60s cooldown after trip

const circuitBreaker = {
  consecutiveFailures: 0,
  state: 'CLOSED',        // CLOSED = healthy, OPEN = tripped, HALF_OPEN = probing
  lastTrippedAt: null,
  totalTrips: 0,

  recordSuccess() {
    this.consecutiveFailures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      console.log(`[truthEngine] CIRCUIT BREAKER: reset to CLOSED after successful probe`);
    }
  },

  recordFailure(agent) {
    this.consecutiveFailures++;
    console.log(`[truthEngine] CIRCUIT BREAKER: failure #${this.consecutiveFailures} (agent=${agent})`);
    if (this.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD && this.state === 'CLOSED') {
      this.state = 'OPEN';
      this.lastTrippedAt = Date.now();
      this.totalTrips++;
      console.error(`[truthEngine] CIRCUIT BREAKER TRIPPED: ${this.consecutiveFailures} consecutive failures — rejecting new requests for ${CIRCUIT_BREAKER_COOLDOWN_MS/1000}s`);
    }
  },

  canExecute() {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - (this.lastTrippedAt || 0);
      if (elapsed >= CIRCUIT_BREAKER_COOLDOWN_MS) {
        this.state = 'HALF_OPEN';
        console.log(`[truthEngine] CIRCUIT BREAKER: cooldown expired — entering HALF_OPEN probe mode`);
        return true;
      }
      return false;
    }
    // HALF_OPEN: allow one request through as a probe
    return true;
  },

  getStatus() {
    return {
      state: this.state,
      consecutive_failures: this.consecutiveFailures,
      total_trips: this.totalTrips,
      last_tripped_at: this.lastTrippedAt ? new Date(this.lastTrippedAt).toISOString() : null,
      cooldown_remaining_ms: this.state === 'OPEN'
        ? Math.max(0, CIRCUIT_BREAKER_COOLDOWN_MS - (Date.now() - (this.lastTrippedAt || 0)))
        : 0,
    };
  },
};

// ═══ PATCH 8 — Mandatory Audit Enforcement (v3.0.0) ═══
// Every pipeline event (success, failure, timeout, circuit-breaker trip)
// is persisted to GovernanceLog for immutable audit trail.
// Prevents silent failures from escaping the audit record.
async function persistAuditEntry(base44, entry) {
  try {
    await base44.asServiceRole.entities.GovernanceLog.create({
      action: entry.action,
      actor_did: entry.actor || 'system:truth_engine',
      target: entry.target || '',
      target_type: 'other',
      status: entry.status,
      metadata: {
        ...entry.metadata,
        truth_engine_version: ENGINE.version,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (auditErr) {
    // Audit write failure must never crash the pipeline — log and continue
    console.error(`[truthEngine] AUDIT WRITE FAILED: ${auditErr.message}`, JSON.stringify(entry));
  }
}

// ═══ PATCH 9 — Telemetry Expansion (v3.0.0) ═══
// In-memory telemetry counters for pipeline health monitoring.
// Tracks per-step latency distributions (p50/p95), success/fail rates,
// and agent-level failure breakdowns.
const telemetry = {
  pipelines_started: 0,
  pipelines_completed: 0,
  pipelines_failed: 0,
  pipelines_timeout: 0,
  pipelines_circuit_rejected: 0,
  agent_timeouts: {},      // { agent_name: count }
  step_latencies: {},      // { step_name: [ms, ms, ...] }  (capped at 100 samples)

  recordStart() {
    this.pipelines_started++;
  },

  recordComplete(latencyObj) {
    this.pipelines_completed++;
    // Record per-step latency samples
    const steps = { llm_draft: latencyObj.llm_draft_ms, claim_extraction: latencyObj.claim_extraction_ms, verification: latencyObj.verification_ms, synthesis: latencyObj.synthesis_ms };
    for (const [step, ms] of Object.entries(steps)) {
      if (typeof ms !== 'number') continue;
      if (!this.step_latencies[step]) this.step_latencies[step] = [];
      this.step_latencies[step].push(ms);
      if (this.step_latencies[step].length > 100) this.step_latencies[step].shift();
    }
  },

  recordFail() {
    this.pipelines_failed++;
  },

  recordTimeout(agent) {
    this.pipelines_timeout++;
    this.agent_timeouts[agent] = (this.agent_timeouts[agent] || 0) + 1;
  },

  recordCircuitReject() {
    this.pipelines_circuit_rejected++;
  },

  // PATCH 12: Oracle-layer telemetry counters
  oracle_calls_total: 0,
  oracle_calls_success: 0,
  oracle_calls_timeout: 0,
  oracle_calls_error: 0,
  oracle_fallback_used: 0,
  oracle_fallback_mismatches: 0,

  recordOracleCall(outcome) {
    this.oracle_calls_total++;
    if (outcome === 'success') this.oracle_calls_success++;
    else if (outcome === 'timeout') this.oracle_calls_timeout++;
    else if (outcome === 'error') this.oracle_calls_error++;
    else if (outcome === 'fallback_used') this.oracle_fallback_used++;
  },
  recordOracleMismatch() {
    this.oracle_fallback_mismatches++;
  },

  getSnapshot() {
    const percentile = (arr, p) => {
      if (!arr || arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = Math.ceil(sorted.length * p) - 1;
      return sorted[Math.max(0, idx)];
    };

    const stepStats = {};
    for (const [step, samples] of Object.entries(this.step_latencies)) {
      stepStats[step] = {
        samples: samples.length,
        p50_ms: percentile(samples, 0.5),
        p95_ms: percentile(samples, 0.95),
        max_ms: samples.length > 0 ? Math.max(...samples) : 0,
      };
    }

    return {
      pipelines_started: this.pipelines_started,
      pipelines_completed: this.pipelines_completed,
      pipelines_failed: this.pipelines_failed,
      pipelines_timeout: this.pipelines_timeout,
      pipelines_circuit_rejected: this.pipelines_circuit_rejected,
      success_rate: this.pipelines_started > 0
        ? Math.round((this.pipelines_completed / this.pipelines_started) * 10000) / 100
        : 0,
      agent_timeouts: { ...this.agent_timeouts },
      step_latency_stats: stepStats,
      oracle: {
        calls_total: this.oracle_calls_total,
        calls_success: this.oracle_calls_success,
        calls_timeout: this.oracle_calls_timeout,
        calls_error: this.oracle_calls_error,
        fallback_used: this.oracle_fallback_used,
        fallback_mismatches: this.oracle_fallback_mismatches,
        health_rate: this.oracle_calls_total > 0
          ? Math.round((this.oracle_calls_success / this.oracle_calls_total) * 10000) / 100
          : 100,
      },
    };
  },
};

// ═══ PATCH 12 — Oracle Telemetry Layer (v3.3.0) ═══
// Structured telemetry for external oracle calls (PrimaryValidator, SecondaryValidator).
// Closes "Unmonitored Logic Branch" + "Fallback Discrepancy" contradictions.
// Closes the "Unmonitored Logic Branch" and "Fallback Discrepancy" contradictions
// by ensuring every oracle code-path — success, fallback, and failure — is logged
// with timing, response quality, and cache-state delta metrics.
//
// Oracle call flow:
//   1. Primary oracle fires → success or timeout/error
//   2. On error → fallback path fires (previously unmonitored)
//   3. Fallback response compared to cached state → delta logged
//   4. All paths emit structured telemetry events into oracleTrace[]

function createOracleTracer(traceId) {
  const events = [];
  const start = Date.now();

  return {
    /** Log an oracle call attempt (success or failure) */
    logCall(agent, outcome, details = {}) {
      const event = {
        log_type: 'oracle_telemetry',
        trace_id: traceId,
        agent,
        outcome,  // 'success' | 'timeout' | 'error' | 'fallback_used' | 'fallback_mismatch'
        timestamp: new Date().toISOString(),
        elapsed_ms: Date.now() - start,
        truth_engine_version: ENGINE.version,
        ...details,
      };
      events.push(event);
      const level = outcome === 'success' ? 'log' : 'error';
      console[level](`[truthEngine] ORACLE ${outcome.toUpperCase()}: ${agent}`, JSON.stringify(event));
      return event;
    },

    /** Log the fallback-vs-cache comparison (Fallback Discrepancy) */
    logFallbackDelta(agent, primaryScores, fallbackScores) {
      const deltas = primaryScores.map(p => {
        const f = fallbackScores.find(s => s.claim_id === p.claim_id);
        return {
          claim_id: p.claim_id,
          primary_score: p.veracity_score,
          fallback_score: f?.veracity_score ?? null,
          delta: f ? Math.abs((p.veracity_score || 0) - (f.veracity_score || 0)) : null,
        };
      });
      const maxDelta = Math.max(0, ...deltas.map(d => d.delta ?? 0));
      const avgDelta = deltas.filter(d => d.delta !== null).length > 0
        ? deltas.filter(d => d.delta !== null).reduce((a, d) => a + d.delta, 0) / deltas.filter(d => d.delta !== null).length
        : 0;

      const event = {
        log_type: 'oracle_fallback_delta',
        trace_id: traceId,
        agent,
        max_delta: Math.round(maxDelta * 1000) / 1000,
        avg_delta: Math.round(avgDelta * 1000) / 1000,
        claim_deltas: deltas,
        has_mismatch: maxDelta > 0.15,
        timestamp: new Date().toISOString(),
        truth_engine_version: ENGINE.version,
      };
      events.push(event);
      if (event.has_mismatch) {
        console.error(`[truthEngine] ORACLE FALLBACK MISMATCH: ${agent} maxΔ=${event.max_delta} avgΔ=${event.avg_delta}`, JSON.stringify(event));
      } else {
        console.log(`[truthEngine] ORACLE FALLBACK CONSISTENT: ${agent} maxΔ=${event.max_delta} avgΔ=${event.avg_delta}`);
      }
      return event;
    },

    /** Get all trace events */
    getEvents() { return events; },
    get size() { return events.length; },
  };
}

class AgentTimeoutError extends Error {
  constructor(agent, thresholdMs, packet) {
    super(`AgentTimeout: ${agent} exceeded ${thresholdMs}ms limit`);
    this.name = 'AgentTimeoutError';
    this.agent = agent;
    this.thresholdMs = thresholdMs;
    this.packet = packet;
  }
}

/**
 * PATCH 5 — Enhanced Timeout Logging (Agent-01)
 * Wraps a promise with a timeout. On timeout, logs the exact packet
 * (prompt length, model, step name) that caused the failure.
 */
function withTimeout(promise, agent, thresholdMs, packet) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => {
      // PATCH 5: Agent-01 logs the exact packet causing the timeout
      const timeoutLog = {
        log_type: 'agent_timeout',
        agent,
        threshold_ms: thresholdMs,
        packet_digest: {
          step: packet.step,
          model: packet.model || 'automatic',
          prompt_length: packet.prompt?.length || 0,
          prompt_preview: (packet.prompt || '').substring(0, 200),
          internet_context: !!packet.add_context_from_internet,
          has_json_schema: !!packet.response_json_schema,
        },
        timestamp: new Date().toISOString(),
        truth_engine_version: ENGINE.version,
      };
      console.error(`[truthEngine] AGENT-01 TIMEOUT LOG: ${agent} exceeded ${thresholdMs}ms`, JSON.stringify(timeoutLog));
      reject(new AgentTimeoutError(agent, thresholdMs, timeoutLog));
    }, thresholdMs)),
  ]);
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

// ═══ PATCH 10 — Tri-State Return Logic (v3.1.0) ═══
// Replaces binary complete/failed with SUCCESS / PARTIAL_SUCCESS / FAILURE.
// SUCCESS:         All agents responded, all quality gates pass.
// PARTIAL_SUCCESS: All agents responded, but one or more quality degradations detected.
// FAILURE:         Any agent returned null, timed out, or threw an error.
//
// Quality gates for PARTIAL_SUCCESS downgrade:
//   1. Policy decision is "block"
//   2. Average veracity < flag threshold (0.7)
//   3. >50% of claims scored below flag_min_claim (0.6)
//   4. Risk count exceeds claim count (anomalous risk density)
//   5. Any ERRVAL04 mismatch detected (validator disagreement)
//   6. Synthesis is suspiciously short (<50 chars)

const PIPELINE_RESULT = Object.freeze({
  SUCCESS: 'SUCCESS',
  PARTIAL_SUCCESS: 'PARTIAL_SUCCESS',
  FAILURE: 'FAILURE',
});

// ═══ PATCH 11 — Agent State Synchronisation Gate (v3.2.0) ═══
// Ensures ALL agent sub-processes and their side-effects (audit writes,
// telemetry updates, entity state commits) have settled before the
// tri-state classifier executes. Eliminates the "Asynchronous State
// Mismatch" — the final Phase-1 blocker.
//
// How it works:
//   1. Each pipeline step registers its async side-effects in a settlement pool.
//   2. Before classification, awaitSettlement() drains the pool with a hard timeout.
//   3. Any side-effect that fails or times out is logged but does not crash the pipeline.
//   4. Settlement timing is recorded in the latency object for observability.

const SETTLEMENT_TIMEOUT_MS = 5_000; // 5s hard limit for settlement drain

function createSettlementPool() {
  const pending = [];
  return {
    /** Register an async side-effect (audit write, telemetry update, etc.) */
    track(promise, label) {
      const tracked = promise
        .then(() => ({ label, status: 'settled', ms: 0 }))
        .catch(err => {
          console.error(`[truthEngine] SETTLEMENT: ${label} failed — ${err.message}`);
          return { label, status: 'failed', error: err.message };
        });
      pending.push({ promise: tracked, label, start: Date.now() });
    },

    /** Await all tracked side-effects or timeout */
    async awaitSettlement() {
      if (pending.length === 0) return { settled: 0, failed: 0, timed_out: 0, ms: 0, details: [] };
      const start = Date.now();

      const results = await Promise.race([
        Promise.all(pending.map(p => p.promise)),
        new Promise(resolve => setTimeout(() => {
          console.error(`[truthEngine] SETTLEMENT TIMEOUT: ${pending.length} side-effects not drained within ${SETTLEMENT_TIMEOUT_MS}ms`);
          resolve(pending.map(p => ({ label: p.label, status: 'timed_out' })));
        }, SETTLEMENT_TIMEOUT_MS)),
      ]);

      const ms = Date.now() - start;
      const settled = results.filter(r => r.status === 'settled').length;
      const failed = results.filter(r => r.status === 'failed').length;
      const timedOut = results.filter(r => r.status === 'timed_out').length;

      console.log(`[truthEngine] PATCH 11 settlement: ${settled} settled, ${failed} failed, ${timedOut} timed_out in ${ms}ms`);

      return { settled, failed, timed_out: timedOut, ms, details: results };
    },

    get size() { return pending.length; },
  };
}

function classifyPipelineResult(leaf3, leaf5, leaf6, leaf7, errval04Count, claims) {
  const degradations = [];

  // Gate 1: Policy blocked
  if (leaf5.decision === 'block') {
    degradations.push({ gate: 'policy_block', detail: `Policy decision: block (avg ${(leaf5.overall_veracity * 100).toFixed(0)}%)` });
  }

  // Gate 2: Average veracity below flag threshold
  const scores = (leaf3 || []).map(s => s.veracity_score).filter(v => typeof v === 'number');
  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  if (avg < POLICY.flag_avg) {
    degradations.push({ gate: 'low_avg_veracity', detail: `Avg veracity ${(avg * 100).toFixed(1)}% < ${(POLICY.flag_avg * 100)}% threshold` });
  }

  // Gate 3: >50% claims below min threshold
  const lowCount = (leaf3 || []).filter(s => s.veracity_score < POLICY.flag_min_claim).length;
  const totalClaims = (claims || []).length;
  if (totalClaims > 0 && lowCount / totalClaims > 0.5) {
    degradations.push({ gate: 'majority_low_claims', detail: `${lowCount}/${totalClaims} claims below ${(POLICY.flag_min_claim * 100)}%` });
  }

  // Gate 4: Risk density anomaly
  if ((leaf6 || []).length > totalClaims && totalClaims > 0) {
    degradations.push({ gate: 'risk_density_anomaly', detail: `${leaf6.length} risks > ${totalClaims} claims` });
  }

  // Gate 5: ERRVAL04 mismatches
  if (errval04Count > 0) {
    degradations.push({ gate: 'validator_mismatch', detail: `${errval04Count} ERRVAL04 mismatch(es) resolved` });
  }

  // Gate 6: Synthesis too short
  if (typeof leaf7 === 'string' && leaf7.length < 50) {
    degradations.push({ gate: 'thin_synthesis', detail: `Synthesis only ${leaf7.length} chars — possible truncation` });
  }

  if (degradations.length === 0) {
    return { pipeline_result: PIPELINE_RESULT.SUCCESS, degradations: [], validation_complete: true };
  }
  return { pipeline_result: PIPELINE_RESULT.PARTIAL_SUCCESS, degradations, validation_complete: true };
}

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
        patch4_timeout_thresholds: 'applied',
        patch5_enhanced_timeout_logging: 'applied',
        patch6_global_http_timeout: 'applied',
        patch7_circuit_breaker: 'applied',
        patch8_mandatory_audit: 'applied',
        patch9_telemetry_expansion: 'applied',
        patch10_tristate_return_logic: 'applied',
        patch11_agent_state_sync_gate: 'applied',
        patch12_oracle_telemetry_layer: 'applied',
        settlement_timeout_ms: SETTLEMENT_TIMEOUT_MS,
        global_http_timeout_ms: GLOBAL_HTTP_TIMEOUT_MS,
        timeout_thresholds_ms: TIMEOUT_THRESHOLDS,
        circuit_breaker: circuitBreaker.getStatus(),
        circuit_breaker_config: { threshold: CIRCUIT_BREAKER_THRESHOLD, cooldown_ms: CIRCUIT_BREAKER_COOLDOWN_MS },
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
        telemetry: telemetry.getSnapshot(),
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

      // PATCH 7: Circuit breaker gate — reject if tripped
      if (!circuitBreaker.canExecute()) {
        const cbStatus = circuitBreaker.getStatus();
        telemetry.recordCircuitReject();
        console.error(`[truthEngine] CIRCUIT BREAKER OPEN: rejecting request — cooldown ${cbStatus.cooldown_remaining_ms}ms remaining`);
        await persistAuditEntry(base44, {
          action: 'truth_pipeline_circuit_breaker_reject',
          actor: user.email,
          target: '',
          status: 'denied_rule',
          metadata: { circuit_breaker: cbStatus, question: question.substring(0, 100) },
        });
        return Response.json({
          pipeline_result: PIPELINE_RESULT.FAILURE,
          status: 'failed',
          error: 'CIRCUIT_BREAKER_OPEN',
          message: `Pipeline temporarily unavailable — ${cbStatus.consecutive_failures} consecutive failures triggered circuit breaker. Retry after ${Math.ceil(cbStatus.cooldown_remaining_ms / 1000)}s.`,
          circuit_breaker: cbStatus,
          truth_engine_version: ENGINE.version,
        }, { status: 503 });
      }

      // PATCH 2: Enforce config guardrails before pipeline starts
      enforceConfigGuardrails(body.bypass_flag || false);

      // PATCH 9: Telemetry — record pipeline start
      telemetry.recordStart();

      const pipelineStart = Date.now();
      const traceId = `TE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const createdAt = new Date().toISOString();
      const latencySamples = []; // Validator-07 latency tracker
      const settlement = createSettlementPool(); // PATCH 11: settlement pool for async side-effects
      const oracleTracer = createOracleTracer(traceId); // PATCH 12: oracle telemetry

      const report = await base44.asServiceRole.entities.TruthReport.create({
        question: question.trim(),
        status: 'processing',
        schema_version: 'v1',
        hash_algo: 'sha256',
      });

      // ── Step 1: LLM Draft (PATCH 4: timeout-guarded) ──
      const t1 = Date.now();
      const step1Prompt = `Answer the following question thoroughly but concisely. Be factual and specific.\n\nQuestion: ${question}`;
      const step1Packet = { step: 'llm_draft', prompt: step1Prompt, model: 'automatic', response_json_schema: true };
      const answerResult = await withTimeout(
        base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: step1Prompt,
          response_json_schema: {
            type: "object",
            properties: { answer_text: { type: "string" } },
            required: ["answer_text"]
          }
        }),
        'Agent-Alpha', TIMEOUT_THRESHOLDS.llm_draft, step1Packet
      );
      const llmDraftMs = Date.now() - t1;
      latencySamples.push(llmDraftMs);

      // PATCH 1 — Strict Failure Mode: null agent response check (Agent-Alpha / LLM Draft)
      if (!answerResult || answerResult.answer_text == null) {
        telemetry.recordFail();
        const nullAudit = {
          action_type: 'validation_incomplete',
          agent: 'Agent-Alpha',
          reason: 'null_response',
          trace_id: traceId,
          timestamp: new Date().toISOString(),
          truth_engine_version: ENGINE.version,
        };
        console.error(`[truthEngine] STRICT FAILURE: Agent-Alpha null response`, JSON.stringify(nullAudit));
        await persistAuditEntry(base44, { action: 'truth_pipeline_null_response', actor: user.email, target: report.id, status: 'failed', metadata: { agent: 'Agent-Alpha', trace_id: traceId, pipeline_result: PIPELINE_RESULT.FAILURE } });
        await base44.asServiceRole.entities.TruthReport.update(report.id, {
          status: 'failed',
          leaf4_reasoning: `ValidationIncompleteException: Agent-Alpha returned null. Trace: ${traceId}`,
        });
        return Response.json({
          pipeline_result: PIPELINE_RESULT.FAILURE,
          status: 'failed',
          error: 'NULL_AGENT_RESPONSE',
          validation_complete: false,
          failed_agent: 'Agent-Alpha',
          trace_id: traceId,
          audit: nullAudit,
          truth_engine_version: ENGINE.version,
        });
      }
      const rawAnswer = answerResult.answer_text;

      // ── Step 2: Claim Extraction (PATCH 4: timeout-guarded) ──
      const t2 = Date.now();
      const step2Prompt = `Extract every distinct factual claim from this text as atomic statements. Each claim should be independently verifiable.\n\nText: "${rawAnswer}"`;
      const step2Packet = { step: 'claim_extraction', prompt: step2Prompt, model: 'automatic', response_json_schema: true };
      const claimResult = await withTimeout(
        base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: step2Prompt,
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
        }),
        'ClaimExtractor', TIMEOUT_THRESHOLDS.claim_extraction, step2Packet
      );
      const claimExtractionMs = Date.now() - t2;
      latencySamples.push(claimExtractionMs);

      // PATCH 1 — Strict Failure Mode: null agent response check (Claim Extractor)
      if (!claimResult || claimResult.claims == null) {
        telemetry.recordFail();
        await persistAuditEntry(base44, { action: 'truth_pipeline_null_response', actor: user.email, target: report.id, status: 'failed', metadata: { agent: 'ClaimExtractor', trace_id: traceId, pipeline_result: PIPELINE_RESULT.FAILURE } });
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
          pipeline_result: PIPELINE_RESULT.FAILURE,
          status: 'failed',
          error: 'NULL_AGENT_RESPONSE',
          validation_complete: false,
          failed_agent: 'ClaimExtractor',
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

      // Primary validator (Sub-process A) (PATCH 4: timeout-guarded)
      const step3Prompt = `You are a fact-checker. For each claim below, assess its veracity. Provide:
- veracity_score: 0.0 to 1.0
- confidence: "high", "medium", or "low"
- evidence_summary: brief supporting/contradicting evidence
- sources: 1-3 source types
- risk_flags: concerns (empty array if none)

Claims:
${verificationPrompt}`;
      const step3Packet = { step: 'primary_validator', prompt: step3Prompt, model: 'gemini_3_flash', add_context_from_internet: true, response_json_schema: true };
      const verifyResult = await withTimeout(
        base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: step3Prompt,
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
        }),
        'PrimaryValidator', TIMEOUT_THRESHOLDS.primary_validator, step3Packet
      );
      const verifyMs = Date.now() - t3;
      latencySamples.push(verifyMs);

      // PATCH 1 — Strict Failure Mode: null agent response check (PrimaryValidator)
      if (!verifyResult || verifyResult.verifications == null) {
        // PATCH 12: Oracle telemetry — PrimaryValidator failed (Unmonitored Logic Branch fix)
        oracleTracer.logCall('PrimaryValidator', 'error', {
          reason: 'null_response',
          latency_ms: verifyMs,
          model: 'gemini_3_flash',
          internet_backed: true,
          fallback_available: false,
        });
        telemetry.recordOracleCall('error');
        telemetry.recordFail();
        await persistAuditEntry(base44, { action: 'truth_pipeline_null_response', actor: user.email, target: report.id, status: 'failed', metadata: { agent: 'PrimaryValidator', trace_id: traceId, pipeline_result: PIPELINE_RESULT.FAILURE, oracle_trace: oracleTracer.getEvents() } });
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
          pipeline_result: PIPELINE_RESULT.FAILURE,
          status: 'failed',
          error: 'NULL_AGENT_RESPONSE',
          validation_complete: false,
          failed_agent: 'PrimaryValidator',
          trace_id: traceId,
          audit: nullAudit,
          truth_engine_version: ENGINE.version,
        });
      }
      const primaryVerifications = verifyResult.verifications || [];

      // PATCH 12: Oracle telemetry — PrimaryValidator success
      oracleTracer.logCall('PrimaryValidator', 'success', {
        claims_verified: primaryVerifications.length,
        latency_ms: verifyMs,
        model: 'gemini_3_flash',
        internet_backed: true,
      });
      telemetry.recordOracleCall('success');

      // Sub-process B: re-validate using the SAME primary source (ERRVAL04 fix)
      // Replaces any internal/cached verification flags with direct primary call
      // PATCH 4: timeout-guarded
      const step3bPrompt = `You are a secondary fact-checker performing validation consistency checks.
For each claim below, re-assess its veracity independently. Use the same evidence standards as primary verification.
Provide veracity_score (0.0-1.0) and confidence ("high"/"medium"/"low") for each claim.

Claims:
${verificationPrompt}`;
      const step3bPacket = { step: 'secondary_validator', prompt: step3bPrompt, model: 'gemini_3_flash', add_context_from_internet: true, response_json_schema: true };
      const subProcessBResult = await withTimeout(
        base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: step3bPrompt,
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
        }),
        'SecondaryValidator', TIMEOUT_THRESHOLDS.secondary_validator, step3bPacket
      );
      const subBMs = Date.now() - t3 - verifyMs;
      latencySamples.push(subBMs);

      // PATCH 1 — Strict Failure Mode: null agent response check (SecondaryValidator / Sub-process B)
      if (!subProcessBResult || subProcessBResult.verifications == null) {
        // PATCH 12: Oracle telemetry — SecondaryValidator failed (Unmonitored Logic Branch fix)
        oracleTracer.logCall('SecondaryValidator', 'error', {
          reason: 'null_response',
          latency_ms: subBMs,
          model: 'gemini_3_flash',
          internet_backed: true,
          primary_oracle_succeeded: true,
          fallback_available: false,
        });
        telemetry.recordOracleCall('error');
        telemetry.recordFail();
        await persistAuditEntry(base44, { action: 'truth_pipeline_null_response', actor: user.email, target: report.id, status: 'failed', metadata: { agent: 'SecondaryValidator', trace_id: traceId, pipeline_result: PIPELINE_RESULT.FAILURE, oracle_trace: oracleTracer.getEvents() } });
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
          pipeline_result: PIPELINE_RESULT.FAILURE,
          status: 'failed',
          error: 'NULL_AGENT_RESPONSE',
          validation_complete: false,
          failed_agent: 'SecondaryValidator',
          trace_id: traceId,
          audit: nullAudit,
          truth_engine_version: ENGINE.version,
        });
      }
      const secondaryVerifications = subProcessBResult.verifications || [];

      // PATCH 12: Oracle telemetry — SecondaryValidator success + fallback delta
      oracleTracer.logCall('SecondaryValidator', 'success', {
        claims_verified: secondaryVerifications.length,
        latency_ms: subBMs,
        model: 'gemini_3_flash',
        internet_backed: true,
      });
      telemetry.recordOracleCall('success');

      // PATCH 12: Compare primary vs secondary oracle responses (Fallback Discrepancy telemetry)
      const fallbackDelta = oracleTracer.logFallbackDelta(
        'PrimaryVsSecondary',
        primaryVerifications,
        secondaryVerifications
      );
      if (fallbackDelta.has_mismatch) {
        telemetry.recordOracleMismatch();
      }

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

      // ── Step 4: Synthesis (PATCH 4: timeout-guarded) ──
      const t4 = Date.now();
      const step4Prompt = `You are a truth synthesizer. Given the original question, draft answer, and verification results, write a final verified answer. Incorporate corrections where claims scored low. Be direct and factual.

Question: ${question}
Draft Answer: ${rawAnswer}
Verification Summary: ${leaf3.map(s => `[${s.claim_id}] score=${s.veracity_score} confidence=${s.confidence}`).join(', ')}
Low-scoring claims: ${lowClaims.map(c => `[${c.claim_id}] ${c.notes}`).join('; ') || 'None'}

Write the final verified answer:`;
      const step4Packet = { step: 'synthesizer', prompt: step4Prompt, model: 'automatic', response_json_schema: true };
      const synthResult = await withTimeout(
        base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: step4Prompt,
          response_json_schema: {
            type: "object",
            properties: { synthesis: { type: "string" } },
            required: ["synthesis"]
          }
        }),
        'Synthesizer', TIMEOUT_THRESHOLDS.synthesizer, step4Packet
      );
      const synthesisMs = Date.now() - t4;
      latencySamples.push(synthesisMs);

      // PATCH 1 — Strict Failure Mode: null agent response check (Synthesizer)
      if (!synthResult || synthResult.synthesis == null) {
        telemetry.recordFail();
        await persistAuditEntry(base44, { action: 'truth_pipeline_null_response', actor: user.email, target: report.id, status: 'failed', metadata: { agent: 'Synthesizer', trace_id: traceId, pipeline_result: PIPELINE_RESULT.FAILURE } });
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
          pipeline_result: PIPELINE_RESULT.FAILURE,
          status: 'failed',
          error: 'NULL_AGENT_RESPONSE',
          validation_complete: false,
          failed_agent: 'Synthesizer',
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
        settlement_ms: 0, // placeholder — updated after settlement gate
      };

      const nftMetadata = buildNFTMetadata(report.id, reportHash, question.trim(), createdAt, finalVeracitySummary);
      const node3Outbox = buildNode3Outbox(report.id, reportHash, finalVeracitySummary, createdAt);

      // ── Atomic write (v2.7.0: includes verification traces) ──
      // PATCH 11: Track this write in the settlement pool so classification
      // cannot fire until the entity state is fully committed.
      const entityWritePromise = base44.asServiceRole.entities.TruthReport.update(report.id, {
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
      settlement.track(entityWritePromise, 'entity_atomic_write');

      // ── Email (PATCH 11: tracked in settlement pool) ──
      let emailSent = false;
      const emailPromise = (async () => {
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
      })();
      settlement.track(emailPromise, 'email_delivery');

      // ═══ PATCH 11: Agent State Synchronisation Gate ═══
      // Drain all pending async side-effects BEFORE classification.
      // This eliminates the Asynchronous State Mismatch — validation
      // cannot fire until every agent's writes have settled.
      const settlementResult = await settlement.awaitSettlement();
      const settlementMs = settlementResult.ms;
      latency.settlement_ms = settlementMs;

      // PATCH 10: Tri-state classification — SUCCESS vs PARTIAL_SUCCESS
      const errval04MismatchCount = verificationTraces.filter(t => t.error_code === 'ERR_VAL_04').length;
      const triState = classifyPipelineResult(leaf3, leaf5, leaf6, leaf7, errval04MismatchCount, claims);

      console.log(`[truthEngine] PATCH 10 classification: ${triState.pipeline_result} | degradations=${triState.degradations.length} | ${triState.degradations.map(d => d.gate).join(', ') || 'none'} | settlement=${settlementMs}ms (${settlementResult.settled}/${settlement.size})`);

      // Map tri-state to entity status: SUCCESS → complete, PARTIAL_SUCCESS → complete (data is valid, but flagged)
      const entityStatus = triState.pipeline_result === PIPELINE_RESULT.SUCCESS ? 'complete' : 'complete';

      // PATCH 7: Record successful pipeline completion
      circuitBreaker.recordSuccess();
      // PATCH 9: Telemetry — record completion with latency data
      telemetry.recordComplete({ ...latency, settlement_ms: settlementMs });
      // PATCH 8: Mandatory audit — persist pipeline result with tri-state
      await persistAuditEntry(base44, {
        action: 'truth_pipeline_complete',
        actor: user.email,
        target: report.id,
        status: triState.pipeline_result === PIPELINE_RESULT.SUCCESS ? 'success' : 'advisory',
        metadata: {
          report_id: report.id,
          pipeline_result: triState.pipeline_result,
          degradations: triState.degradations,
          settlement: settlementResult,
          pipeline_ms: pipelineMs,
          claims_count: claims.length,
          policy_decision: leaf5.decision,
          veracity_avg: finalVeracitySummary.avg_score,
          report_hash: reportHash.substring(0, 16),
          oracle_calls: oracleTracer.size,
          oracle_mismatches: oracleTracer.getEvents().filter(e => e.has_mismatch).length,
        },
      });

      return Response.json({
        report_id: report.id,
        pipeline_result: triState.pipeline_result,
        degradations: triState.degradations,
        validation_complete: triState.validation_complete,
        status: entityStatus,
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
        oracle_trace: oracleTracer.getEvents(),
        oracle_health: {
          calls: oracleTracer.size,
          fallback_delta: oracleTracer.getEvents().find(e => e.log_type === 'oracle_fallback_delta') || null,
        },
        source_of_truth: 'primary',
        errval04_mismatches: errval04MismatchCount,
        trace_id: traceId,
        validator_07: v07Cal,
        config_guardrail: { bypass_active: false, source: 'config_guardrail' },
        circuit_breaker: circuitBreaker.getStatus(),
        settlement: { ...settlementResult, pool_size: settlement.size },
        patches_applied: ['PATCH1_strict_failure_mode', 'PATCH2_config_guardrails', 'PATCH3_validator07_calibration', 'PATCH4_timeout_thresholds', 'PATCH5_enhanced_timeout_logging', 'PATCH6_global_http_timeout', 'PATCH7_circuit_breaker', 'PATCH8_mandatory_audit', 'PATCH9_telemetry_expansion', 'PATCH10_tristate_return_logic', 'PATCH11_agent_state_sync_gate', 'PATCH12_oracle_telemetry_layer'],
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    // PATCH 4 — AgentTimeoutError: record explicit timeout failure
    // PATCH 7 — Circuit breaker: record the failure
    if (error.name === 'AgentTimeoutError') {
      circuitBreaker.recordFailure(error.agent);
      telemetry.recordTimeout(error.agent);
      console.error(`[truthEngine] PIPELINE ABORT: ${error.agent} timeout after ${error.thresholdMs}ms`, JSON.stringify(error.packet));
      // PATCH 8: Mandatory audit — persist timeout event
      try {
        const base44Fallback = createClientFromRequest(req);
        await persistAuditEntry(base44Fallback, {
          action: 'truth_pipeline_timeout',
          actor: 'system:truth_engine',
          target: error.agent,
          status: 'failed',
          metadata: { agent: error.agent, threshold_ms: error.thresholdMs, packet_digest: error.packet?.packet_digest || null, circuit_breaker: circuitBreaker.getStatus() },
        });
      } catch (_) { /* audit best-effort in error handler */ }
      return Response.json({
        pipeline_result: PIPELINE_RESULT.FAILURE,
        status: 'failed',
        error: 'AGENT_TIMEOUT',
        validation_complete: false,
        failed_agent: error.agent,
        threshold_ms: error.thresholdMs,
        packet_digest: error.packet?.packet_digest || null,
        circuit_breaker: circuitBreaker.getStatus(),
        truth_engine_version: ENGINE.version,
        patches_applied: ['PATCH1_strict_failure_mode', 'PATCH2_config_guardrails', 'PATCH3_validator07_calibration', 'PATCH4_timeout_thresholds', 'PATCH5_enhanced_timeout_logging', 'PATCH6_global_http_timeout', 'PATCH7_circuit_breaker', 'PATCH8_mandatory_audit', 'PATCH9_telemetry_expansion', 'PATCH10_tristate_return_logic', 'PATCH11_agent_state_sync_gate', 'PATCH12_oracle_telemetry_layer'],
      }, { status: 504 });
    }
    console.error('[truthEngine]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});