/**
 * TruthReportPublicV1 — Safe projection schema
 * Only exposes non-internal fields for the public transparency viewer.
 */

export const PUBLIC_PROJECTION_VERSION = 'TruthReportPublicV1';

/**
 * Projects a full TruthReport entity into a public-safe shape.
 * Strips internal fields: node3_outbox, base44_hook, node3_hook, email_sent,
 * mint_intent, mint_intent_at, nft_metadata, latency, created_by, etc.
 */
export function projectToPublic(report) {
  if (!report) return null;

  const claims = (report.leaf1_claims || []).map(c => {
    const score = (report.leaf3_scores || []).find(s => s.claim_id === c.id);
    return {
      id: c.id,
      text: c.text,
      veracity: score?.veracity_score ?? null,
      confidence: score?.confidence || 'unknown',
    };
  });

  const risks = (report.leaf6_risks || []).map(r => r.description);

  return {
    id: report.id,
    question: report.question,
    raw_answer: report.raw_answer,
    claims,
    veracity_summary: report.veracity_summary ? {
      avg_score: report.veracity_summary.avg_score,
      min_score: report.veracity_summary.min_score,
      max_score: report.veracity_summary.max_score,
    } : null,
    policy: report.leaf5_policy ? {
      decision: report.leaf5_policy.decision,
      reason: report.leaf5_policy.reason,
      ruleset: report.leaf5_policy.ruleset,
    } : null,
    risks,
    synthesis: report.leaf7_synthesis,
    reasoning: report.leaf4_reasoning,
    created_at: report.created_date,
    hash: report.report_hash,
    hash_algo: report.hash_algo || 'sha256',
    schema: 'TruthReportV1',
    projection: PUBLIC_PROJECTION_VERSION,
    processing_ms: report.processing_ms,
  };
}