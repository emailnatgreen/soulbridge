import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Public Reports API — serves TruthReportPublicV1 projections.
 * No auth required — this is the public transparency layer.
 *
 * Actions:
 *   list   — paginated list of completed reports (default)
 *   get    — single report by ID
 *   stats  — aggregate analytics (total, avg veracity, decisions)
 */

const PUBLIC_PROJECTION_VERSION = 'TruthReportPublicV1';

function projectToPublic(report) {
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const action = body.action || 'list';

    if (action === 'get') {
      const { report_id } = body;
      if (!report_id) return Response.json({ error: 'report_id required' }, { status: 400 });
      const report = await base44.asServiceRole.entities.TruthReport.get(report_id);
      if (!report || report.status !== 'complete') {
        return Response.json({ error: 'Report not found or not yet complete' }, { status: 404 });
      }
      return Response.json({ report: projectToPublic(report), projection: PUBLIC_PROJECTION_VERSION });
    }

    if (action === 'stats') {
      const all = await base44.asServiceRole.entities.TruthReport.filter({ status: 'complete' }, '-created_date', 100);
      const total = all.length;
      const avgVeracity = total > 0
        ? Math.round((all.reduce((s, r) => s + (r.veracity_summary?.avg_score || 0), 0) / total) * 1000) / 1000
        : 0;
      const decisions = { allow: 0, flag: 0, block: 0 };
      all.forEach(r => {
        const d = r.leaf5_policy?.decision;
        if (d && decisions[d] !== undefined) decisions[d]++;
      });
      return Response.json({
        total,
        avg_veracity: avgVeracity,
        decisions,
        projection: PUBLIC_PROJECTION_VERSION,
      });
    }

    // Default: list
    const limit = Math.min(body.limit || 20, 50);
    const reports = await base44.asServiceRole.entities.TruthReport.filter(
      { status: 'complete' }, '-created_date', limit
    );
    return Response.json({
      reports: reports.map(projectToPublic),
      count: reports.length,
      projection: PUBLIC_PROJECTION_VERSION,
    });
  } catch (error) {
    console.error('[publicReports]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});