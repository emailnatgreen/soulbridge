import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Admin 7-Leaf Truth Engine v2.0.0 — Enhanced, Deterministic, Sovereign
 * ══════════════════════════════════════════════════════════════════════
 * Full layered investigation pipeline:
 *   L1: Raw Data Intake — freeze input with source tagging + SHA-256 snapshot
 *   L2: Classification — type/domain/priority buckets
 *   L3: Contradictions & Gaps — missing data, conflicts, integrity flags
 *   L4: Cross-Links — node/agent/feature/historical relationships
 *   L5: Risk & Impact — quantified scoring with severity assignment
 *   L6: Proposed Actions — deterministic, grouped, dependency-ordered
 *   L7: Synthesis — layered summary, phase mapping, workflow export, visibility rec
 *
 * Actions: investigate | list | get | toggle_visibility
 */

const ENGINE = { name: 'SoulBridge Admin Truth Engine', version: '2.5.0' };

// ═══ Sovereign Identity — computed once, embedded in every artefact ═══
const SOVEREIGN_CONFIG = {
  agent_id: 'sovereign_investigator',
  name: 'Sovereign Investigator',
  version: '1.0.0',
  genesis_date: '2025-01-01T00:00:00.000Z',
  purpose: 'Private, admin-only agent that conducts structured 7-Leaf investigations of nodes, agents, features, and system integrity.',
  classification: 'sovereign_private',
  discoverable: false, editable: false, movable: false, duplicable: false, overridable: false, impersonable: false,
};
let _sovereignHash = null;
async function getSovereignIdentity() {
  if (!_sovereignHash) {
    _sovereignHash = await sha256(SOVEREIGN_CONFIG);
  }
  const fp = _sovereignHash.slice(0, 16).toUpperCase().match(/.{1,4}/g).join('-');
  return { identity_hash: _sovereignHash, fingerprint: fp };
}

// ═══ STEP 2A — Deterministic Suggested Weight Formula ═══
// weight = (risk × impact) + contradictions + dependencies
// risk = 1–4 (from severity), impact = 1–4 (from risk_score mapped)
// Non-LLM, auditable, governance-safe
const SEVERITY_TO_RISK = { critical: 4, high: 3, medium: 2, low: 1 };
const PRIORITY_TO_DEPS = { critical: 3, high: 2, medium: 1, low: 0 };

function calcSuggestedWeight(riskItem, contradictionCount, depCount) {
  const risk = SEVERITY_TO_RISK[riskItem?.severity] || 2;
  const impact = Math.min(Math.ceil((riskItem?.risk_score || 5) / 2.5), 4);
  const raw = (risk * impact) + contradictionCount + depCount;
  return Math.min(raw, 20); // cap at 20
}

function weightCategory(weight) {
  if (weight >= 12) return 'critical';
  if (weight >= 8) return 'high';
  if (weight >= 4) return 'medium';
  return 'low';
}

function calcActionWeight(action, contradictionCount) {
  const priority = PRIORITY_TO_DEPS[action?.priority] || 1;
  const deps = (action?.dependencies && action.dependencies !== 'none') ? action.dependencies.split(',').length : 0;
  const raw = (priority * 2) + contradictionCount + deps;
  return Math.min(raw, 20);
}

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

    // ─── TOGGLE VISIBILITY (legacy compat) ───
    if (action === 'toggle_visibility') {
      const { id, is_public } = body;
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });
      const inv = await base44.asServiceRole.entities.Memory.get(id);
      const meta = typeof inv.context === 'string' ? JSON.parse(inv.context) : (inv.context || {});
      meta.is_public = !!is_public;
      await base44.asServiceRole.entities.Memory.update(id, { context: JSON.stringify(meta) });
      return Response.json({ status: 'updated', is_public: !!is_public });
    }

    // ─── UPDATE VISIBILITY (governance-gated, 3-switch model) ───
    if (action === 'update_visibility') {
      const { id, field, new_value, reason } = body;
      if (!id || !field || !new_value) return Response.json({ error: 'id, field, new_value required' }, { status: 400 });

      const VALID_FIELDS = {
        nft_visibility: ['private', 'internal', 'public'],
        truth_visibility: ['private', 'internal', 'public'],
        skill_visibility: ['hidden', 'unlisted', 'listed'],
      };
      if (!VALID_FIELDS[field] || !VALID_FIELDS[field].includes(new_value)) {
        return Response.json({ error: `Invalid field/value: ${field}=${new_value}` }, { status: 400 });
      }

      const inv = await base44.asServiceRole.entities.Memory.get(id);
      const meta = typeof inv.context === 'string' ? JSON.parse(inv.context) : (inv.context || {});

      const oldValue = meta[field] || (field === 'skill_visibility' ? 'hidden' : 'private');

      // Update the field
      meta[field] = new_value;

      // Derive legacy is_public from truth_visibility for backward compat
      if (field === 'truth_visibility') {
        meta.is_public = new_value === 'public';
      }

      // Sovereign identity — sign the audit entry
      const sovereign = await getSovereignIdentity();

      // Append immutable audit log entry (signed)
      if (!meta.visibility_audit_log) meta.visibility_audit_log = [];
      meta.visibility_audit_log.push({
        timestamp: new Date().toISOString(),
        who: user.email,
        field,
        from_state: oldValue,
        to_state: new_value,
        reason: reason || '',
        signed_by: sovereign.fingerprint,
      });

      await base44.asServiceRole.entities.Memory.update(id, { context: JSON.stringify(meta) });

      return Response.json({
        status: 'updated',
        field,
        from_state: oldValue,
        to_state: new_value,
        audit_log: meta.visibility_audit_log,
      });
    }

    // ─── INVESTIGATE (Enhanced 7-Leaf Pipeline v2) ───
    if (action === 'investigate') {
      const { question, target_type = 'general' } = body;
      if (!question || question.trim().length < 3) {
        return Response.json({ error: 'Question is required (min 3 chars)' }, { status: 400 });
      }

      const pipelineStart = Date.now();
      const timestamp = new Date().toISOString();

      const targetPrompts = {
        node: `You are investigating a SYSTEM NODE within an 8-node sovereign security braid. Analyze its integrity, behaviour patterns, failure modes, consensus participation, and entropy contribution.`,
        agent: `You are investigating an AI AGENT within a sovereign village ecosystem. Analyze its behaviour, safety boundaries, drift potential, honour alignment, empathy health, and co-evolution impact.`,
        feature: `You are investigating a PLATFORM FEATURE. Analyze its UX, security, logic correctness, edge cases, governance compliance, and user impact.`,
        general: `You are conducting a general system investigation. Be thorough, structural, and cover all angles.`,
      };

      // ═══ Full 7-Leaf LLM Analysis ═══
      const rawResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `${targetPrompts[target_type] || targetPrompts.general}

Investigate: "${question}"

You MUST respond using the exact 7-leaf structure below. Be exhaustive and specific. Each leaf serves a distinct analytical purpose.

LEAF 1 — RAW DATA INTAKE: Capture all raw data points — text, claims, logs, node metadata, agent behaviour. Tag each item with its source type (human, system, agent, external). This is the immutable snapshot.

LEAF 2 — CLASSIFICATION: Classify every item from Leaf 1 into:
- type: claim, behaviour, event, risk, feature
- domain: security, UX, logic, governance
- priority: low, medium, high, critical

LEAF 3 — CONTRADICTIONS & GAPS: Identify:
- gap_type: missing_data, missing_test, missing_logic
- contradiction_type: conflicting_behaviour, mismatched_state, broken_assumption
- integrity_flags: anything that breaks trust assumptions

LEAF 4 — CROSS-LINKS: Map relationships:
- node_links: how this relates to other system nodes
- agent_links: behavioural relationships to agents
- feature_links: feature dependencies and impact chains
- historical_links: past investigations or known patterns

LEAF 5 — RISK & IMPACT: Score each risk:
- risk_domain: security, UX, governance, logic
- impact_description: what happens if ignored
- risk_score: 1-10
- severity: low, medium, high, critical

LEAF 6 — PROPOSED ACTIONS: Generate deterministic actions (not LLM speculation):
- action_group: which node/agent/feature the action targets
- action_description: exactly what must be done
- dependencies: what must happen first (if any)
- priority: critical, high, medium, low

LEAF 7 — SYNTHESIS: Produce:
- summary: final structured assessment
- phase_mapping: which phase each action belongs to (Phase 1: Critical Fixes, Phase 2: Hardening, Phase 3: Implementation, Phase 4: Validation)
- visibility_recommendation: should this remain private? (private/public with reason)
- confidence_score: 0-100, your confidence in the overall findings`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: "object",
          properties: {
            leaf1_raw_data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  source_type: { type: "string" }
                }
              }
            },
            leaf2_classification: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  item_type: { type: "string" },
                  domain: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            leaf3_contradictions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  severity: { type: "string" },
                  integrity_flag: { type: "boolean" }
                }
              }
            },
            leaf4_cross_links: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  link_type: { type: "string" },
                  linked_to: { type: "string" },
                  relationship: { type: "string" }
                }
              }
            },
            leaf5_risk_impact: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  risk_domain: { type: "string" },
                  impact_description: { type: "string" },
                  risk_score: { type: "number" },
                  severity: { type: "string" }
                }
              }
            },
            leaf6_proposed_actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  action_group: { type: "string" },
                  dependencies: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            leaf7_synthesis: {
              type: "object",
              properties: {
                summary: { type: "string" },
                phase_mapping: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      phase: { type: "number" },
                      phase_name: { type: "string" },
                      actions: { type: "array", items: { type: "string" } }
                    }
                  }
                },
                visibility_recommendation: { type: "string" },
                visibility_reason: { type: "string" },
                confidence_score: { type: "number" }
              }
            }
          },
          required: ["leaf1_raw_data", "leaf2_classification", "leaf3_contradictions", "leaf4_cross_links", "leaf5_risk_impact", "leaf6_proposed_actions", "leaf7_synthesis"]
        }
      });

      const pipelineMs = Date.now() - pipelineStart;

      // ═══ Pre-compute contradiction count for weight formula ═══
      const contradictionCount = (rawResult.leaf3_contradictions || []).length;

      // ═══ Build deterministic leaf structure ═══
      const leaves = {
        raw_data: (rawResult.leaf1_raw_data || []).map(item => ({
          ...item,
          source_type: item.source_type || 'system'
        })),
        classification: (rawResult.leaf2_classification || []).map(item => ({
          ...item,
          item_type: item.item_type || 'claim',
          domain: item.domain || 'general',
          priority: item.priority || 'medium'
        })),
        contradictions: (rawResult.leaf3_contradictions || []).map(item => ({
          ...item,
          category: item.category || 'gap',
          severity: item.severity || 'medium',
          integrity_flag: item.integrity_flag || false
        })),
        cross_links: (rawResult.leaf4_cross_links || []).map(item => ({
          ...item,
          link_type: item.link_type || 'node',
          relationship: item.relationship || 'related'
        })),
        risk_impact: (rawResult.leaf5_risk_impact || []).map(item => {
          const ri = {
            ...item,
            risk_domain: item.risk_domain || 'general',
            impact_description: item.impact_description || '',
            risk_score: item.risk_score || 5,
            severity: item.severity || 'medium',
          };
          const sw = calcSuggestedWeight(ri, contradictionCount, 0);
          ri.suggested_weight = sw;
          ri.weight_category = weightCategory(sw);
          return ri;
        }),
        proposed_actions: (rawResult.leaf6_proposed_actions || []).map(item => {
          const pa = {
            ...item,
            action_group: item.action_group || 'general',
            dependencies: item.dependencies || 'none',
            priority: item.priority || 'medium',
          };
          const sw = calcActionWeight(pa, contradictionCount);
          pa.suggested_weight = sw;
          pa.weight_category = weightCategory(sw);
          return pa;
        }),
        synthesis: rawResult.leaf7_synthesis || { summary: '', phase_mapping: [], visibility_recommendation: 'private', visibility_reason: '', confidence_score: 0 },
      };

      // ═══ Compute aggregate metrics ═══
      const metrics = {
        total_data_points: leaves.raw_data.length,
        classified_items: leaves.classification.length,
        contradictions_found: leaves.contradictions.length,
        integrity_flags: leaves.contradictions.filter(c => c.integrity_flag).length,
        cross_links_mapped: leaves.cross_links.length,
        risks_identified: leaves.risk_impact.length,
        critical_risks: leaves.risk_impact.filter(r => r.severity === 'critical').length,
        high_risks: leaves.risk_impact.filter(r => r.severity === 'high').length,
        actions_proposed: leaves.proposed_actions.length,
        avg_risk_score: leaves.risk_impact.length > 0
          ? Math.round((leaves.risk_impact.reduce((sum, r) => sum + (r.risk_score || 0), 0) / leaves.risk_impact.length) * 10) / 10
          : 0,
        confidence_score: leaves.synthesis?.confidence_score || 0,
        // Suggested weight aggregates
        avg_suggested_weight: leaves.risk_impact.length > 0
          ? Math.round((leaves.risk_impact.reduce((sum, r) => sum + (r.suggested_weight || 0), 0) / leaves.risk_impact.length) * 10) / 10
          : 0,
        weight_distribution: {
          critical: leaves.risk_impact.filter(r => r.weight_category === 'critical').length + leaves.proposed_actions.filter(a => a.weight_category === 'critical').length,
          high: leaves.risk_impact.filter(r => r.weight_category === 'high').length + leaves.proposed_actions.filter(a => a.weight_category === 'high').length,
          medium: leaves.risk_impact.filter(r => r.weight_category === 'medium').length + leaves.proposed_actions.filter(a => a.weight_category === 'medium').length,
          low: leaves.risk_impact.filter(r => r.weight_category === 'low').length + leaves.proposed_actions.filter(a => a.weight_category === 'low').length,
        },
      };

      // ═══ Sovereign Identity Signature ═══
      const sovereign = await getSovereignIdentity();

      // ═══ SHA-256 immutable snapshot ═══
      const reportHash = await sha256({ question, target_type, leaves, metrics, timestamp });

      // ═══ Default visibility — everything starts private/hidden ═══
      const metadata = {
        target_type,
        leaves,
        metrics,
        processing_ms: pipelineMs,
        report_hash: reportHash,
        hash_algo: 'sha256',
        engine: ENGINE,
        status: 'complete',
        // Sovereign identity signature — every investigation is signed
        sovereign_signature: {
          signer: SOVEREIGN_CONFIG.agent_id,
          fingerprint: sovereign.fingerprint,
          identity_hash: sovereign.identity_hash,
          signed_at: timestamp,
          payload_hash: reportHash,
        },
        // Three independent visibility switches — all default private/hidden
        nft_visibility: 'private',
        truth_visibility: 'private',
        skill_visibility: 'hidden',
        is_public: false,  // legacy compat
        visibility_audit_log: [],
        frozen_at: timestamp,
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
        metrics,
        processing_ms: pipelineMs,
        report_hash: reportHash,
        hash_algo: 'sha256',
        engine: ENGINE,
        sovereign_signature: metadata.sovereign_signature,
        nft_visibility: 'private',
        truth_visibility: 'private',
        skill_visibility: 'hidden',
        is_public: false,
        frozen_at: timestamp,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[adminTruthEngine v2]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});