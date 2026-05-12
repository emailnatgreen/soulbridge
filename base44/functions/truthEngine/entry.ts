import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Truth Engine — 7-Leaf Verification Pipeline
 *
 * Actions:
 *   ask     — Full pipeline: question → LLM → claims → verify → 7-leaf → email
 *   status  — Get report by ID
 *
 * Pipeline:
 *   1. LLM generates draft answer (untrusted)
 *   2. Claim Extractor pulls atomic claims
 *   3. Evidence Retriever + Verifier scores each claim
 *   4. 7-Leaf Report Builder assembles the full report
 *   5. Email Service sends to admin
 *   6. Node 3 + Base44 hooks (stubs for now)
 */

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

    // ─── ASK (full pipeline) ───
    if (action === 'ask') {
      const { question } = body;
      if (!question || question.trim().length < 3) {
        return Response.json({ error: 'Question is required (min 3 chars)' }, { status: 400 });
      }

      const startTime = Date.now();

      // Create report record immediately (so UI can poll)
      const report = await base44.asServiceRole.entities.TruthReport.create({
        question: question.trim(),
        status: 'processing',
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
      const claims = (claimResult.claims || []).slice(0, 10); // cap at 10

      // ── Step 3: Evidence Retriever + Verifier (per claim) ──
      // Use web-grounded LLM to check each claim
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
        const v = verifications.find(v => v.claim_id === c.id) || {};
        return {
          claim_id: c.id,
          sources: v.sources || [],
          summary: v.evidence_summary || 'No evidence retrieved',
        };
      });

      // ── Build Leaf 3: Scores ──
      const leaf3 = claims.map(c => {
        const v = verifications.find(v => v.claim_id === c.id) || {};
        return {
          claim_id: c.id,
          veracity_score: typeof v.veracity_score === 'number' ? v.veracity_score : 0.5,
          confidence: v.confidence || 'low',
          notes: v.evidence_summary || '',
        };
      });

      // ── Build Leaf 4: Reasoning ──
      const avgScore = leaf3.length > 0
        ? leaf3.reduce((sum, s) => sum + s.veracity_score, 0) / leaf3.length
        : 0;
      const lowClaims = leaf3.filter(s => s.veracity_score < 0.6);
      const highClaims = leaf3.filter(s => s.veracity_score >= 0.8);

      const leaf4 = `Analyzed ${claims.length} claims. ${highClaims.length} scored high confidence (≥0.8). ${lowClaims.length} scored below threshold (<0.6). Average veracity: ${(avgScore * 100).toFixed(1)}%. ${lowClaims.length > 0 ? `Claims requiring attention: ${lowClaims.map(c => c.claim_id).join(', ')}.` : 'All claims within acceptable range.'}`;

      // ── Build Leaf 5: Policy Decision ──
      let decision = 'allow';
      let policyReason = 'All claims meet confidence threshold';
      if (avgScore < 0.4) {
        decision = 'block';
        policyReason = `Average veracity ${(avgScore * 100).toFixed(0)}% is below minimum threshold (40%)`;
      } else if (avgScore < 0.7 || lowClaims.length > 0) {
        decision = 'flag';
        policyReason = `${lowClaims.length} claim(s) below confidence threshold — manual review recommended`;
      }

      const leaf5 = {
        decision,
        reason: policyReason,
        overall_veracity: Math.round(avgScore * 100) / 100,
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
          severity: avgScore < 0.4 ? 'high' : 'medium',
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

      // ── Update report ──
      await base44.asServiceRole.entities.TruthReport.update(report.id, {
        raw_answer: rawAnswer,
        leaf1_claims: claims,
        leaf2_evidence: leaf2,
        leaf3_scores: leaf3,
        leaf4_reasoning: leaf4,
        leaf5_policy: leaf5,
        leaf6_risks: leaf6,
        leaf7_synthesis: leaf7,
        status: 'complete',
        processing_ms: processingMs,
        node3_hook: 'stub',
        base44_hook: 'stub',
      });

      // ── Step 5: Email Service ──
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
  <p style="color:#64748b;font-size:11px;margin:0 0 20px">Pipeline completed in ${(processingMs/1000).toFixed(1)}s • Report ID: ${report.id}</p>
  
  <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;margin:0 0 16px">
    <p style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Question</p>
    <p style="color:#f1f5f9;font-size:14px;margin:0">${question}</p>
  </div>

  <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:16px;margin:0 0 16px">
    <p style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Policy Decision</p>
    <p style="font-size:16px;margin:0">${policyEmoji} <strong style="color:${decision === 'allow' ? '#4ade80' : decision === 'flag' ? '#fbbf24' : '#f87171'}">${decision.toUpperCase()}</strong> — Overall veracity: ${(avgScore*100).toFixed(0)}%</p>
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

  <div style="border-top:1px solid #334155;padding-top:12px;margin-top:16px">
    <p style="color:#475569;font-size:10px;margin:0">SoulBridge Truth Engine v1 • Node 3 hook: stub • Base44 hook: stub</p>
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

      // ── Step 6: Node 3 Hook (stub) ──
      // Future: POST /node3/report with report hash
      console.log(`[truthEngine] Node 3 hook: stub — report ${report.id} would be written to Node 3`);

      // ── Step 7: Base44 Hook (stub) ──
      // Future: Register report hash / DID with Base44 on-chain
      console.log(`[truthEngine] Base44 hook: stub — report ${report.id} would be registered on-chain`);

      return Response.json({
        report_id: report.id,
        status: 'complete',
        question,
        raw_answer: rawAnswer,
        leaf1_claims: claims,
        leaf2_evidence: leaf2,
        leaf3_scores: leaf3,
        leaf4_reasoning: leaf4,
        leaf5_policy: leaf5,
        leaf6_risks: leaf6,
        leaf7_synthesis: leaf7,
        processing_ms: processingMs,
        email_sent: emailSent,
        node3_hook: 'stub',
        base44_hook: 'stub',
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[truthEngine]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});