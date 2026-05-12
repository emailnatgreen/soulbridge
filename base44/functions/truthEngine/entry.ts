import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Truth Engine — 7-Leaf Verification Pipeline (v1 — Canonical Entrypoint)
 *
 * Actions:
 *   ask         — Full pipeline: question → LLM → claims → verify → 7-leaf → hash → node3 → email
 *   status      — Get report by ID
 *   mint_intent — Signal intent to mint a report as Research NFT
 *
 * Contract:
 *   This is the SINGLE entrypoint for all truth verification work.
 *   All reports follow the TruthReportV1 canonical schema.
 *   Every completed report receives a SHA-256 hash and Node 3 outbox entry.
 */

// ── Hashing Utility ──
async function sha256(payload) {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Canonical Report Payload (for hashing) ──
function buildCanonicalPayload(reportId, question, rawAnswer, claims, leaf2, leaf3, leaf4, leaf5, leaf6, leaf7, createdAt) {
  return {
    version: 'v1',
    report_id: reportId,
    question,
    raw_answer: rawAnswer,
    leaf1_claims: claims,
    leaf2_evidence: leaf2,
    leaf3_scores: leaf3,
    leaf4_reasoning: leaf4,
    leaf5_policy: leaf5,
    leaf6_risks: leaf6,
    leaf7_synthesis: leaf7,
    created_at: createdAt,
  };
}

// ── Veracity Summary ──
function buildVeracitySummary(leaf3, leaf6) {
  const scores = (leaf3 || []).map(s => s.veracity_score).filter(v => typeof v === 'number');
  return {
    avg_score: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 1000) / 1000 : 0,
    min_score: scores.length > 0 ? Math.min(...scores) : 0,
    max_score: scores.length > 0 ? Math.max(...scores) : 0,
    claims_count: (leaf3 || []).length,
    risks_count: (leaf6 || []).length,
  };
}

// ── NFT Metadata Builder ──
function buildNFTMetadata(reportId, reportHash, question, createdAt, veracitySummary) {
  return {
    name: `Truth Report #${reportId.slice(-6).toUpperCase()}`,
    description: '7-Leaf epistemic verification report for a single question.',
    question: question.substring(0, 200),
    report_id: reportId,
    report_hash: reportHash,
    created_at: createdAt,
    veracity: {
      avg_score: veracitySummary.avg_score,
      min_score: veracitySummary.min_score,
      max_score: veracitySummary.max_score,
    },
    leaves: {
      claims_count: veracitySummary.claims_count,
      risks_count: veracitySummary.risks_count,
    },
  };
}

// ── Node 3 Outbox Writer (stub — queues for future routing) ──
async function writeNode3Outbox(base44, reportId, reportHash, veracitySummary, createdAt) {
  const outbox = {
    status: 'pending',
    payload_hash: reportHash,
    queued_at: new Date().toISOString(),
  };

  console.log(`[truthEngine] Node 3 outbox: queued report ${reportId} | hash=${reportHash} | avg=${veracitySummary.avg_score} min=${veracitySummary.min_score} max=${veracitySummary.max_score}`);

  // Future: POST to Node 3 endpoint, then update status to 'sent'/'confirmed'
  return outbox;
}

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

      console.log(`[truthEngine] Mint intent signalled for report ${report_id} by ${user.email}`);
      return Response.json({
        status: 'intent_recorded',
        report_id,
        nft_metadata: report.nft_metadata,
        message: 'Mint intent recorded. NFT minting will be available when Node 3 integration is live.',
      });
    }

    // ─── ASK (full pipeline) ───
    if (action === 'ask') {
      const { question } = body;
      if (!question || question.trim().length < 3) {
        return Response.json({ error: 'Question is required (min 3 chars)' }, { status: 400 });
      }

      const startTime = Date.now();
      const createdAt = new Date().toISOString();

      // Create report record immediately (so UI can poll)
      const report = await base44.asServiceRole.entities.TruthReport.create({
        question: question.trim(),
        status: 'processing',
        schema_version: 'v1',
      });

      // ── Step 1: LLM Answer Service (untrusted) ──
      const answerResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Answer the following question thoroughly but concisely. Be factual and specific.\n\nQuestion: ${question}`,
        response_json_schema: {
          type: "object",
          properties: {
            answer_text: { type: "string", description: "The complete answer" }
          },
          required: ["answer_text"]
        }
      });
      const rawAnswer = answerResult.answer_text || '';

      // ── Step 2: Claim Extractor ──
      const claimResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Extract every distinct factual claim from this text as atomic statements. Each claim should be independently verifiable. Return them as a JSON array.\n\nText: "${rawAnswer}"`,
        response_json_schema: {
          type: "object",
          properties: {
            claims: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", description: "Claim ID like c1, c2, c3" },
                  text: { type: "string", description: "The atomic factual claim" }
                }
              }
            }
          },
          required: ["claims"]
        }
      });
      const claims = (claimResult.claims || []).slice(0, 10);

      // ── Step 3: Evidence Retriever + Verifier (per claim) ──
      const verificationPrompt = claims.map(c => `- [${c.id}] "${c.text}"`).join('\n');

      const verifyResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a fact-checker. For each claim below, assess its veracity using your knowledge. For each claim provide:
- veracity_score: 0.0 to 1.0 (1.0 = certainly true)
- confidence: "high", "medium", or "low"
- evidence_summary: brief description of supporting or contradicting evidence
- sources: list of 1-3 known source types (e.g. "biology textbook", "NASA.gov", "peer-reviewed research")
- risk_flags: any concerns (misinformation risk, outdated info, missing context, etc.) — empty array if none

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
      const verifications = verifyResult.verifications || [];

      // ── Build Leaf 2: Evidence ──
      const leaf2 = claims.map(c => {
        const v = verifications.find(x => x.claim_id === c.id) || {};
        return { claim_id: c.id, sources: v.sources || [], summary: v.evidence_summary || 'No evidence retrieved' };
      });

      // ── Build Leaf 3: Scores ──
      const leaf3 = claims.map(c => {
        const v = verifications.find(x => x.claim_id === c.id) || {};
        return {
          claim_id: c.id,
          veracity_score: typeof v.veracity_score === 'number' ? v.veracity_score : 0.5,
          confidence: v.confidence || 'low',
          notes: v.evidence_summary || '',
        };
      });

      // ── Build Leaf 4: Reasoning ──
      const veracitySummary = buildVeracitySummary(leaf3, []);
      const lowClaims = leaf3.filter(s => s.veracity_score < 0.6);
      const highClaims = leaf3.filter(s => s.veracity_score >= 0.8);

      const leaf4 = `Analyzed ${claims.length} claims. ${highClaims.length} scored high confidence (≥0.8). ${lowClaims.length} scored below threshold (<0.6). Average veracity: ${(veracitySummary.avg_score * 100).toFixed(1)}%. ${lowClaims.length > 0 ? `Claims requiring attention: ${lowClaims.map(c => c.claim_id).join(', ')}.` : 'All claims within acceptable range.'}`;

      // ── Build Leaf 5: Policy Decision ──
      let decision = 'allow';
      let policyReason = 'All claims meet confidence threshold';
      if (veracitySummary.avg_score < 0.4) {
        decision = 'block';
        policyReason = `Average veracity ${(veracitySummary.avg_score * 100).toFixed(0)}% is below minimum threshold (40%)`;
      } else if (veracitySummary.avg_score < 0.7 || lowClaims.length > 0) {
        decision = 'flag';
        policyReason = `${lowClaims.length} claim(s) below confidence threshold — manual review recommended`;
      }

      const leaf5 = {
        decision,
        reason: policyReason,
        overall_veracity: Math.round(veracitySummary.avg_score * 100) / 100,
      };

      // ── Build Leaf 6: Risks ──
      const leaf6 = [];
      for (const v of verifications) {
        if (v.risk_flags && v.risk_flags.length > 0) {
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
          severity: veracitySummary.avg_score < 0.4 ? 'high' : 'medium',
          description: `${lowClaims.length} claim(s) scored below 0.6 veracity`,
          affected_claims: lowClaims.map(c => c.claim_id),
        });
      }

      // ── Build Leaf 7: Synthesis ──
      const synthResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a truth synthesizer. Given the original question, the draft answer, and the verification results, write a final verified answer. Incorporate corrections where claims scored low. Be direct and factual.

Question: ${question}
Draft Answer: ${rawAnswer}
Verification Summary: ${leaf3.map(s => `[${s.claim_id}] score=${s.veracity_score} confidence=${s.confidence}`).join(', ')}
Low-scoring claims: ${lowClaims.map(c => `[${c.claim_id}] ${c.notes}`).join('; ') || 'None'}

Write the final verified answer:`,
        response_json_schema: {
          type: "object",
          properties: {
            synthesis: { type: "string", description: "The final verified answer incorporating corrections" }
          },
          required: ["synthesis"]
        }
      });
      const leaf7 = synthResult.synthesis || rawAnswer;

      const processingMs = Date.now() - startTime;

      // ── Finalize veracity summary with risks ──
      const finalVeracitySummary = buildVeracitySummary(leaf3, leaf6);

      // ── SHA-256 Hash (canonical payload) ──
      const canonicalPayload = buildCanonicalPayload(
        report.id, question.trim(), rawAnswer, claims, leaf2, leaf3, leaf4, leaf5, leaf6, leaf7, createdAt
      );
      const reportHash = await sha256(canonicalPayload);

      // ── NFT Metadata ──
      const nftMetadata = buildNFTMetadata(report.id, reportHash, question.trim(), createdAt, finalVeracitySummary);

      // ── Node 3 Outbox ──
      const node3Outbox = await writeNode3Outbox(base44, report.id, reportHash, finalVeracitySummary, createdAt);

      // ── Update report (single atomic write) ──
      await base44.asServiceRole.entities.TruthReport.update(report.id, {
        raw_answer: rawAnswer,
        schema_version: 'v1',
        leaf1_claims: claims,
        leaf2_evidence: leaf2,
        leaf3_scores: leaf3,
        leaf4_reasoning: leaf4,
        leaf5_policy: leaf5,
        leaf6_risks: leaf6,
        leaf7_synthesis: leaf7,
        status: 'complete',
        processing_ms: processingMs,
        report_hash: reportHash,
        veracity_summary: finalVeracitySummary,
        node3_outbox: node3Outbox,
        nft_metadata: nftMetadata,
        node3_hook: 'outbox_queued',
        base44_hook: 'stub',
      });

      // ── Email Service ──
      let emailSent = false;
      try {
        const policyEmoji = decision === 'allow' ? '✅' : decision === 'flag' ? '⚠️' : '🚫';
        const claimRows = claims.map(c => {
          const s = leaf3.find(x => x.claim_id === c.id) || {};
          const scoreBar = '█'.repeat(Math.round((s.veracity_score || 0) * 10)) + '░'.repeat(10 - Math.round((s.veracity_score || 0) * 10));
          return `<tr>
            <td style="padding:6px 10px;border-bottom:1px solid #333;color:#ccc;font-size:12px">${c.id}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #333;color:#e0e0e0;font-size:12px">${c.text}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #333;color:${(s.veracity_score||0) >= 0.8 ? '#4ade80' : (s.veracity_score||0) >= 0.6 ? '#fbbf24' : '#f87171'};font-family:monospace;font-size:12px">${scoreBar} ${((s.veracity_score||0)*100).toFixed(0)}%</td>
            <td style="padding:6px 10px;border-bottom:1px solid #333;color:#999;font-size:11px">${s.confidence || '-'}</td>
          </tr>`;
        }).join('');

        const riskRows = leaf6.length > 0
          ? leaf6.map(r => `<li style="color:#f59e0b;font-size:12px;margin:4px 0">⚠️ [${r.severity}] ${r.description} (${r.affected_claims.join(', ')})</li>`).join('')
          : '<li style="color:#4ade80;font-size:12px">No risks identified</li>';

        const emailBody = `
<div style="font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px;border-radius:12px;max-width:700px">
  <h1 style="color:#38bdf8;font-size:20px;margin:0 0 4px">🔬 7-Leaf Truth Report</h1>
  <p style="color:#64748b;font-size:11px;margin:0 0 20px">Pipeline completed in ${(processingMs/1000).toFixed(1)}s • Report ID: ${report.id} • Hash: ${reportHash.substring(0, 12)}…</p>
  
  <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;margin:0 0 16px">
    <p style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Question</p>
    <p style="color:#f1f5f9;font-size:14px;margin:0">${question}</p>
  </div>

  <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;margin:0 0 16px">
    <p style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Policy Decision</p>
    <p style="font-size:16px;margin:0">${policyEmoji} <strong style="color:${decision === 'allow' ? '#4ade80' : decision === 'flag' ? '#fbbf24' : '#f87171'}">${decision.toUpperCase()}</strong> — Overall veracity: ${(finalVeracitySummary.avg_score*100).toFixed(0)}%</p>
    <p style="color:#94a3b8;font-size:12px;margin:4px 0 0">${policyReason}</p>
  </div>

  <div style="margin:0 0 16px">
    <p style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px">Claim Verification (${claims.length} claims)</p>
    <table style="width:100%;border-collapse:collapse;background:#1e293b;border:1px solid #334155;border-radius:8px">
      <thead><tr>
        <th style="padding:8px 10px;text-align:left;color:#64748b;font-size:10px;border-bottom:1px solid #475569">ID</th>
        <th style="padding:8px 10px;text-align:left;color:#64748b;font-size:10px;border-bottom:1px solid #475569">Claim</th>
        <th style="padding:8px 10px;text-align:left;color:#64748b;font-size:10px;border-bottom:1px solid #475569">Veracity</th>
        <th style="padding:8px 10px;text-align:left;color:#64748b;font-size:10px;border-bottom:1px solid #475569">Conf</th>
      </tr></thead>
      <tbody>${claimRows}</tbody>
    </table>
  </div>

  <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;margin:0 0 16px">
    <p style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Risks</p>
    <ul style="margin:0;padding:0 0 0 16px">${riskRows}</ul>
  </div>

  <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;margin:0 0 16px">
    <p style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Verified Synthesis (Leaf 7)</p>
    <p style="color:#e2e8f0;font-size:13px;line-height:1.6;margin:0">${leaf7}</p>
  </div>

  <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:12px;margin:0 0 16px">
    <p style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Cryptographic Anchor</p>
    <p style="color:#38bdf8;font-family:monospace;font-size:11px;margin:0;word-break:break-all">SHA-256: ${reportHash}</p>
    <p style="color:#64748b;font-size:10px;margin:4px 0 0">Schema: TruthReportV1 • Node 3: outbox_queued</p>
  </div>

  <div style="border-top:1px solid #334155;padding-top:12px;margin-top:16px">
    <p style="color:#475569;font-size:10px;margin:0">SoulBridge Truth Engine v1 • Node 3: outbox_queued • Base44: stub</p>
  </div>
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
        schema_version: 'v1',
        question: question.trim(),
        raw_answer: rawAnswer,
        leaf1_claims: claims,
        leaf2_evidence: leaf2,
        leaf3_scores: leaf3,
        leaf4_reasoning: leaf4,
        leaf5_policy: leaf5,
        leaf6_risks: leaf6,
        leaf7_synthesis: leaf7,
        processing_ms: processingMs,
        report_hash: reportHash,
        veracity_summary: finalVeracitySummary,
        nft_metadata: nftMetadata,
        node3_outbox: node3Outbox,
        email_sent: emailSent,
        node3_hook: 'outbox_queued',
        base44_hook: 'stub',
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[truthEngine]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});