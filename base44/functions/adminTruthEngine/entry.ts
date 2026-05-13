import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Admin 7-Leaf Truth Engine — Private Investigation Pipeline
 * ═══════════════════════════════════════════════════════════
 * Admin-only. Uses the enhanced 7-Leaf framework:
 *   L1: Raw Data
 *   L2: Classification
 *   L3: Contradictions / Gaps
 *   L4: Cross-Links
 *   L5: Risk / Impact
 *   L6: Proposed Actions
 *   L7: Synthesis
 *
 * Actions:
 *   investigate — Full 7-leaf pipeline for node/agent/feature/general
 *   list        — List investigations with filters
 *   get         — Get single investigation
 *   toggle_visibility — Toggle public/private
 */

const ENGINE = { name: 'SoulBridge Admin Truth Engine', version: '1.0.0' };

async function sha256(payload) {
  const data = new TextEncoder().encode(JSON.stringify(payload, Object.keys(payload).sort()));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json();
    const action = body.action || 'investigate';

    // ─── LIST ───
    if (action === 'list') {
      const investigations = await base44.asServiceRole.entities.Memory.filter(
        { type: 'observation', keywords: 'admin_investigation' },
        '-created_date',
        50
      );
      return Response.json({ investigations });
    }

    // ─── GET ───
    if (action === 'get') {
      const { id } = body;
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });
      const inv = await base44.asServiceRole.entities.Memory.get(id);
      return Response.json({ investigation: inv });
    }

    // ─── TOGGLE VISIBILITY ───
    if (action === 'toggle_visibility') {
      const { id, is_public } = body;
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });
      const inv = await base44.asServiceRole.entities.Memory.get(id);
      const meta = typeof inv.context === 'string' ? JSON.parse(inv.context) : (inv.context || {});
      meta.is_public = !!is_public;
      await base44.asServiceRole.entities.Memory.update(id, { context: JSON.stringify(meta) });
      return Response.json({ status: 'updated', is_public: !!is_public });
    }

    // ─── INVESTIGATE ───
    if (action === 'investigate') {
      const { question, target_type = 'general' } = body;
      if (!question || question.trim().length < 3) {
        return Response.json({ error: 'Question is required (min 3 chars)' }, { status: 400 });
      }

      const pipelineStart = Date.now();

      const targetPrompts = {
        node: `You are investigating a SYSTEM NODE. Analyze its integrity, behaviour patterns, and failure modes.`,
        agent: `You are investigating an AI AGENT. Analyze its behaviour, safety boundaries, drift potential, and alignment.`,
        feature: `You are investigating a PLATFORM FEATURE. Analyze its UX, security, logic correctness, and edge cases.`,
        general: `You are conducting a general investigation. Be thorough and structural.`,
      };

      // Step 1: Raw data collection via LLM
      const rawResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `${targetPrompts[target_type] || targetPrompts.general}

Investigate: "${question}"

Provide your analysis using this exact 7-leaf structure. For each leaf, provide detailed findings.`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: "object",
          properties: {
            leaf1_raw_data: {
              type: "array",
              items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } } }
            },
            leaf2_classification: {
              type: "array",
              items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, category: { type: "string" } } }
            },
            leaf3_contradictions: {
              type: "array",
              items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, severity: { type: "string" } } }
            },
            leaf4_cross_links: {
              type: "array",
              items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, linked_to: { type: "string" } } }
            },
            leaf5_risk_impact: {
              type: "array",
              items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, severity: { type: "string" }, blast_radius: { type: "string" } } }
            },
            leaf6_proposed_actions: {
              type: "array",
              items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, priority: { type: "string" } } }
            },
            leaf7_synthesis: { type: "string" }
          },
          required: ["leaf1_raw_data", "leaf7_synthesis"]
        }
      });

      const pipelineMs = Date.now() - pipelineStart;

      const leaves = {
        raw_data: rawResult.leaf1_raw_data || [],
        classification: rawResult.leaf2_classification || [],
        contradictions: rawResult.leaf3_contradictions || [],
        cross_links: rawResult.leaf4_cross_links || [],
        risk_impact: rawResult.leaf5_risk_impact || [],
        proposed_actions: rawResult.leaf6_proposed_actions || [],
        synthesis: rawResult.leaf7_synthesis || '',
      };

      // Hash the investigation
      const reportHash = await sha256({ question, target_type, leaves, timestamp: new Date().toISOString() });

      // Store as Memory entity (investigation-scoped)
      const metadata = {
        target_type,
        leaves,
        processing_ms: pipelineMs,
        report_hash: reportHash,
        engine: ENGINE,
        status: 'complete',
        is_public: false,
      };

      const memory = await base44.asServiceRole.entities.Memory.create({
        agent_id: 'sovereign_investigator',
        type: 'observation',
        content: question.trim(),
        keywords: ['admin_investigation', target_type],
        context: JSON.stringify(metadata),
        importance: 8,
      });

      return Response.json({
        id: memory.id,
        question: question.trim(),
        target_type,
        status: 'complete',
        leaves,
        processing_ms: pipelineMs,
        report_hash: reportHash,
        engine: ENGINE,
        is_public: false,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[adminTruthEngine]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});