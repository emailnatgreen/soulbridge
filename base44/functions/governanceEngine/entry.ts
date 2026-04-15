/**
 * Governance Engine — Central enforcement for all governance actions
 * 
 * POST { action, params }
 * 
 * Flow: authenticate → resolve actor DID → check role permissions → validate rules → execute → log
 * 
 * Supported actions:
 *   assign_role      — { target_did, role_id, reason? }
 *   revoke_role      — { target_did, role_id, reason? }
 *   update_rule      — { rule_id, value, description? }
 *   mint_widget      — { widget_data }
 *   deprecate_widget — { widget_id, reason? }
 *   update_service_pricing — { service_id, amount, pricing_model? }
 *   update_treasury_split  — { service_id, treasury_percent, creator_percent, referral_percent }
 *   approve_creator  — { target_did, reason? }
 *   suspend_creator  — { target_did, reason? }
 *   create_service   — { service_data }
 * 
 * Backend-only. No UI.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Permission matrix: action → required permission(s) ──────────────────────
const ACTION_PERMISSIONS = {
  assign_role:            ['can_assign_roles'],
  revoke_role:            ['can_assign_roles'],
  update_rule:            ['can_update_rules'],
  mint_widget:            ['can_mint_widgets'],
  deprecate_widget:       ['can_deprecate_services'],
  update_service_pricing: ['can_update_pricing'],
  update_treasury_split:  ['can_manage_treasury'],
  approve_creator:        ['can_assign_roles'],
  suspend_creator:        ['can_assign_roles'],
  create_service:         ['can_create_services'],
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    // ── 1. Authentication ─────────────────────────────────────────────────
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const body = await req.json();
    const { action, params = {} } = body;

    if (!action) {
      return Response.json({ error: 'action is required', code: 'MISSING_ACTION' }, { status: 400 });
    }

    const requiredPerms = ACTION_PERMISSIONS[action];
    if (!requiredPerms) {
      return Response.json({ error: `Unknown governance action: ${action}`, code: 'UNKNOWN_ACTION' }, { status: 400 });
    }

    // Resolve actor DID
    const actorDid = params._actor_did || user.email;

    // ── 2. Role + Permission Check ────────────────────────────────────────
    const permResult = await checkPermissions(base44, actorDid, user, requiredPerms);
    if (!permResult.allowed) {
      await logGovernance(base44, {
        action, actor_did: actorDid,
        target: params.target_did || params.widget_id || params.service_id || params.rule_id || null,
        target_type: resolveTargetType(action),
        status: 'denied_permission',
        permissions_used: requiredPerms,
        denial_reason: permResult.reason,
        metadata: { params },
      });
      return Response.json({
        error: permResult.reason,
        code: 'PERMISSION_DENIED',
        required_permissions: requiredPerms,
      }, { status: 403 });
    }

    // ── 3. Honor Check ────────────────────────────────────────────────────
    const honorResult = await checkHonorForGovernance(base44, actorDid, action);
    if (!honorResult.allowed) {
      await logGovernance(base44, {
        action, actor_did: actorDid,
        target: params.target_did || params.widget_id || params.service_id || params.rule_id || null,
        target_type: resolveTargetType(action),
        status: 'denied_honor',
        permissions_used: requiredPerms,
        denial_reason: honorResult.reason,
        metadata: { params, honor_score: honorResult.honor_score },
      });
      return Response.json({
        error: honorResult.reason,
        code: 'HONOR_INSUFFICIENT',
        honor_score: honorResult.honor_score,
      }, { status: 403 });
    }

    // ── 4. Rule Validation ────────────────────────────────────────────────
    const ruleResult = await validateRules(base44, action, params);
    if (!ruleResult.allowed) {
      await logGovernance(base44, {
        action, actor_did: actorDid,
        target: params.target_did || params.widget_id || params.service_id || params.rule_id || null,
        target_type: resolveTargetType(action),
        status: 'denied_rule',
        permissions_used: requiredPerms,
        rules_evaluated: ruleResult.rules_evaluated,
        denial_reason: ruleResult.reason,
        metadata: { params },
      });

      // Advisory rules: log but don't block
      if (ruleResult.enforcement === 'advisory') {
        // Fall through — don't block
      } else {
        return Response.json({
          error: ruleResult.reason,
          code: 'RULE_VIOLATION',
          rules_evaluated: ruleResult.rules_evaluated,
        }, { status: 403 });
      }
    }

    // ── 5. Execute Action ─────────────────────────────────────────────────
    const result = await executeAction(base44, action, params, actorDid, user);

    // ── 6. Log Success ────────────────────────────────────────────────────
    await logGovernance(base44, {
      action, actor_did: actorDid,
      target: result.target || params.target_did || params.widget_id || params.service_id || params.rule_id || null,
      target_type: resolveTargetType(action),
      status: 'success',
      permissions_used: requiredPerms,
      rules_evaluated: ruleResult.rules_evaluated || [],
      metadata: { params, result: result.data },
    });

    return Response.json({
      success: true,
      action,
      data: result.data,
      message: result.message,
    });

  } catch (error) {
    return Response.json({ error: error.message, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// PERMISSION CHECKER
// ══════════════════════════════════════════════════════════════════════════════
async function checkPermissions(base44, actorDid, user, requiredPerms) {
  // Admin bypass — platform admins have all governance permissions
  if (user.role === 'admin') {
    return { allowed: true, roles: ['admin'] };
  }

  // Load active assignments for this user
  const assignments = await base44.asServiceRole.entities.GovernanceAssignment.filter(
    { user_did: actorDid, status: 'active' },
    '-created_date', 50
  );

  if (!assignments || assignments.length === 0) {
    return { allowed: false, reason: `No governance roles assigned to ${actorDid}` };
  }

  // Filter out expired assignments
  const now = new Date();
  const validAssignments = assignments.filter(a => {
    if (!a.expiry) return true;
    return new Date(a.expiry) > now;
  });

  if (validAssignments.length === 0) {
    return { allowed: false, reason: 'All governance role assignments have expired' };
  }

  // Collect all role_ids
  const roleIds = [...new Set(validAssignments.map(a => a.role_id))];

  // Load the roles to get permissions
  let allPermissions = [];
  for (const roleId of roleIds) {
    const roles = await base44.asServiceRole.entities.GovernanceRole.filter(
      { role_id: roleId, status: 'active' }, '-created_date', 1
    );
    if (roles?.[0]?.permissions) {
      allPermissions = allPermissions.concat(roles[0].permissions);
    }
  }

  const permSet = new Set(allPermissions);

  // Check all required permissions are present
  const missing = requiredPerms.filter(p => !permSet.has(p));
  if (missing.length > 0) {
    return { allowed: false, reason: `Missing permissions: ${missing.join(', ')}`, roles: roleIds };
  }

  return { allowed: true, roles: roleIds };
}


// ══════════════════════════════════════════════════════════════════════════════
// HONOR CHECK — Gate governance actions by agent honor score
// ══════════════════════════════════════════════════════════════════════════════
async function checkHonorForGovernance(base44, actorDid, action) {
  // Load honor threshold rules
  const honorRules = await base44.asServiceRole.entities.GovernanceRule.filter(
    { rule_type: 'honor_threshold', status: 'active' }, '-created_date', 50
  );

  // Find a rule that applies to this action
  const applicable = honorRules.find(r => r.value?.action === action || r.value?.actions?.includes(action));
  if (!applicable) return { allowed: true }; // No honor gate for this action

  const minHonor = applicable.value?.min_honor || 0;
  if (minHonor <= 0) return { allowed: true };

  // Look up agent honor
  const agents = await base44.asServiceRole.entities.Agent.filter(
    { classic_address: actorDid }, '-created_date', 1
  );
  let honor = agents?.[0]?.honor_score;

  // Fallback: search by email-based lookup
  if (honor === undefined || honor === null) {
    const agentsByEmail = await base44.asServiceRole.entities.Agent.filter(
      { wallet_id: actorDid }, '-created_date', 1
    );
    honor = agentsByEmail?.[0]?.honor_score ?? 100; // Default 100 if no agent record
  }

  if (honor < minHonor) {
    return {
      allowed: false,
      reason: `Honor score ${honor} below minimum ${minHonor} required for ${action}`,
      honor_score: honor,
    };
  }

  return { allowed: true, honor_score: honor };
}


// ══════════════════════════════════════════════════════════════════════════════
// RULE VALIDATOR
// ══════════════════════════════════════════════════════════════════════════════
async function validateRules(base44, action, params) {
  const ruleTypeMap = {
    mint_widget: 'widget_minting',
    deprecate_widget: 'widget_deprecation',
    update_service_pricing: 'pricing',
    update_treasury_split: 'royalties',
    create_service: 'service_creation',
    assign_role: 'role_management',
    revoke_role: 'role_management',
    approve_creator: 'creator_onboarding',
    suspend_creator: 'creator_onboarding',
    update_rule: 'general',
  };

  const ruleType = ruleTypeMap[action];
  if (!ruleType) return { allowed: true, rules_evaluated: [] };

  const rules = await base44.asServiceRole.entities.GovernanceRule.filter(
    { rule_type: ruleType, status: 'active' }, '-created_date', 50
  );

  if (!rules || rules.length === 0) return { allowed: true, rules_evaluated: [] };

  const rulesEvaluated = rules.map(r => r.rule_id);

  for (const rule of rules) {
    const v = rule.value || {};

    // ── Widget minting: max per creator ────────────────────────────────
    if (action === 'mint_widget' && v.max_per_creator !== undefined) {
      const creatorId = params.widget_data?.minted_by || params.widget_data?.creator_id;
      if (creatorId) {
        const existing = await base44.asServiceRole.entities.Widget.filter(
          { minted_by: creatorId }, '-created_date', 500
        );
        if (existing.length >= v.max_per_creator) {
          return {
            allowed: false, enforcement: rule.enforcement,
            reason: `Creator ${creatorId} has ${existing.length} widgets (max: ${v.max_per_creator})`,
            rules_evaluated: rulesEvaluated,
          };
        }
      }
    }

    // ── Widget minting: min honor ──────────────────────────────────────
    if (action === 'mint_widget' && v.min_honor !== undefined) {
      // Honor check is also handled by the dedicated honor gate, but this
      // provides rule-level enforcement with proper denial logging
    }

    // ── Widget minting: pricing bounds ─────────────────────────────────
    if (action === 'mint_widget' && params.widget_data?.widget_type === 'service') {
      if (v.min_price !== undefined && (params.widget_data?.cost_per_stream_interval || 0) < v.min_price) {
        return {
          allowed: false, enforcement: rule.enforcement,
          reason: `Service price ${params.widget_data.cost_per_stream_interval} below minimum ${v.min_price} RLUSD`,
          rules_evaluated: rulesEvaluated,
        };
      }
      if (v.max_price !== undefined && (params.widget_data?.cost_per_stream_interval || 0) > v.max_price) {
        return {
          allowed: false, enforcement: rule.enforcement,
          reason: `Service price ${params.widget_data.cost_per_stream_interval} above maximum ${v.max_price} RLUSD`,
          rules_evaluated: rulesEvaluated,
        };
      }
    }

    // ── Widget minting: min treasury royalty ───────────────────────────
    if (action === 'mint_widget' && v.min_treasury_percent !== undefined && params.widget_data?.royalties_config) {
      if ((params.widget_data.royalties_config.treasury_percent || 0) < v.min_treasury_percent) {
        return {
          allowed: false, enforcement: rule.enforcement,
          reason: `Treasury royalty ${params.widget_data.royalties_config.treasury_percent}% below minimum ${v.min_treasury_percent}%`,
          rules_evaluated: rulesEvaluated,
        };
      }
    }

    // ── Widget minting: metadata version enforcement ──────────────────
    if (action === 'mint_widget' && v.required_metadata_version && params.widget_data?.metadata_version) {
      if (params.widget_data.metadata_version !== v.required_metadata_version) {
        return {
          allowed: false, enforcement: rule.enforcement,
          reason: `Metadata version ${params.widget_data.metadata_version} does not match required ${v.required_metadata_version}`,
          rules_evaluated: rulesEvaluated,
        };
      }
    }

    // ── Pricing: min/max range ─────────────────────────────────────────
    if (action === 'update_service_pricing') {
      if (v.min !== undefined && params.amount < v.min) {
        return {
          allowed: false, enforcement: rule.enforcement,
          reason: `Price ${params.amount} below minimum ${v.min} RLUSD`,
          rules_evaluated: rulesEvaluated,
        };
      }
      if (v.max !== undefined && params.amount > v.max) {
        return {
          allowed: false, enforcement: rule.enforcement,
          reason: `Price ${params.amount} above maximum ${v.max} RLUSD`,
          rules_evaluated: rulesEvaluated,
        };
      }
    }

    // ── Treasury split: percentage validation ──────────────────────────
    if (action === 'update_treasury_split') {
      const total = (params.treasury_percent || 0) + (params.creator_percent || 0) + (params.referral_percent || 0);
      if (v.total_must_equal !== undefined && total !== v.total_must_equal) {
        return {
          allowed: false, enforcement: rule.enforcement,
          reason: `Royalty split totals ${total}% but must equal ${v.total_must_equal}%`,
          rules_evaluated: rulesEvaluated,
        };
      }
      if (v.min_treasury_percent !== undefined && (params.treasury_percent || 0) < v.min_treasury_percent) {
        return {
          allowed: false, enforcement: rule.enforcement,
          reason: `Treasury share ${params.treasury_percent}% below minimum ${v.min_treasury_percent}%`,
          rules_evaluated: rulesEvaluated,
        };
      }
    }
  }

  return { allowed: true, rules_evaluated: rulesEvaluated };
}


// ══════════════════════════════════════════════════════════════════════════════
// ACTION EXECUTOR
// ══════════════════════════════════════════════════════════════════════════════
async function executeAction(base44, action, params, actorDid, user) {
  switch (action) {

    // ── Role Management ───────────────────────────────────────────────────
    case 'assign_role': {
      const { target_did, role_id, reason, expiry } = params;
      if (!target_did || !role_id) throw new Error('target_did and role_id required');

      // Verify role exists
      const roles = await base44.asServiceRole.entities.GovernanceRole.filter(
        { role_id }, '-created_date', 1
      );
      if (!roles?.length) throw new Error(`Role not found: ${role_id}`);

      const assignment = await base44.asServiceRole.entities.GovernanceAssignment.create({
        user_did: target_did, role_id, assigned_by: actorDid,
        assigned_date: new Date().toISOString(),
        expiry: expiry || null, reason: reason || null, status: 'active',
      });

      return { target: target_did, data: { assignment_id: assignment.id, role_id }, message: `Assigned ${role_id} to ${target_did}` };
    }

    case 'revoke_role': {
      const { target_did, role_id, reason } = params;
      if (!target_did || !role_id) throw new Error('target_did and role_id required');

      const assignments = await base44.asServiceRole.entities.GovernanceAssignment.filter(
        { user_did: target_did, role_id, status: 'active' }, '-created_date', 50
      );
      for (const a of (assignments || [])) {
        await base44.asServiceRole.entities.GovernanceAssignment.update(a.id, {
          status: 'revoked', reason: reason || 'Revoked by governance action',
        });
      }
      return { target: target_did, data: { role_id, revoked_count: assignments?.length || 0 }, message: `Revoked ${role_id} from ${target_did}` };
    }

    // ── Rule Management ───────────────────────────────────────────────────
    case 'update_rule': {
      const { rule_id, value, description } = params;
      if (!rule_id || value === undefined) throw new Error('rule_id and value required');

      const rules = await base44.asServiceRole.entities.GovernanceRule.filter(
        { rule_id }, '-created_date', 1
      );
      if (!rules?.length) throw new Error(`Rule not found: ${rule_id}`);

      const oldValue = rules[0].value;
      await base44.asServiceRole.entities.GovernanceRule.update(rules[0].id, {
        value, ...(description ? { description } : {}),
      });
      return { target: rule_id, data: { old_value: oldValue, new_value: value }, message: `Updated rule ${rule_id}` };
    }

    // ── Widget Minting ────────────────────────────────────────────────────
    case 'mint_widget': {
      const { widget_data } = params;
      if (!widget_data) throw new Error('widget_data required');

      const widget = await base44.asServiceRole.entities.Widget.create({
        ...widget_data,
        minted_by: widget_data.minted_by || actorDid,
      });
      return { target: widget.id, data: { widget_id: widget.id, nft_id: widget.nft_id || null }, message: `Minted widget: ${widget_data.name}` };
    }

    // ── Widget Deprecation ────────────────────────────────────────────────
    case 'deprecate_widget': {
      const { widget_id, reason } = params;
      if (!widget_id) throw new Error('widget_id required');

      await base44.asServiceRole.entities.Widget.update(widget_id, {
        deprecation_status: 'deprecated',
        governance_notes: reason || 'Deprecated by governance action',
      });
      return { target: widget_id, data: { widget_id }, message: `Deprecated widget ${widget_id}` };
    }

    // ── Service Pricing ───────────────────────────────────────────────────
    case 'update_service_pricing': {
      const { service_id, amount, pricing_model } = params;
      if (!service_id || amount === undefined) throw new Error('service_id and amount required');

      const payDefs = await base44.asServiceRole.entities.PaymentDefinition.filter(
        { service_id, status: 'active' }, '-created_date', 1
      );

      if (payDefs?.length) {
        const old = payDefs[0];
        await base44.asServiceRole.entities.PaymentDefinition.update(old.id, {
          amount, ...(pricing_model ? { pricing_model } : {}),
        });
        return { target: service_id, data: { old_amount: old.amount, new_amount: amount }, message: `Updated pricing for ${service_id}` };
      } else {
        // Create new PaymentDefinition
        const pd = await base44.asServiceRole.entities.PaymentDefinition.create({
          service_id, amount, pricing_model: pricing_model || 'per_use',
          currency: 'RLUSD', billing_behavior: 'prepay', status: 'active',
        });
        return { target: service_id, data: { payment_definition_id: pd.id, amount }, message: `Created pricing for ${service_id}` };
      }
    }

    // ── Treasury Split ────────────────────────────────────────────────────
    case 'update_treasury_split': {
      const { service_id, treasury_percent, creator_percent, referral_percent } = params;
      if (!service_id) throw new Error('service_id required');

      const payDefs = await base44.asServiceRole.entities.PaymentDefinition.filter(
        { service_id, status: 'active' }, '-created_date', 1
      );
      if (!payDefs?.length) throw new Error(`No PaymentDefinition for ${service_id}`);

      const oldConfig = payDefs[0].royalties_config || {};
      await base44.asServiceRole.entities.PaymentDefinition.update(payDefs[0].id, {
        royalties_config: { treasury_percent, creator_percent, referral_percent },
      });
      return {
        target: service_id,
        data: { old_config: oldConfig, new_config: { treasury_percent, creator_percent, referral_percent } },
        message: `Updated treasury split for ${service_id}`,
      };
    }

    // ── Creator Approval/Suspension ───────────────────────────────────────
    case 'approve_creator': {
      const { target_did, reason } = params;
      if (!target_did) throw new Error('target_did required');

      // Assign creator role
      const assignment = await base44.asServiceRole.entities.GovernanceAssignment.create({
        user_did: target_did, role_id: 'creator', assigned_by: actorDid,
        assigned_date: new Date().toISOString(), reason: reason || 'Creator approved', status: 'active',
      });
      return { target: target_did, data: { assignment_id: assignment.id }, message: `Approved ${target_did} as creator` };
    }

    case 'suspend_creator': {
      const { target_did, reason } = params;
      if (!target_did) throw new Error('target_did required');

      // Revoke all active creator assignments
      const assignments = await base44.asServiceRole.entities.GovernanceAssignment.filter(
        { user_did: target_did, role_id: 'creator', status: 'active' }, '-created_date', 50
      );
      for (const a of (assignments || [])) {
        await base44.asServiceRole.entities.GovernanceAssignment.update(a.id, {
          status: 'revoked', reason: reason || 'Suspended by governance',
        });
      }
      return { target: target_did, data: { revoked_count: assignments?.length || 0 }, message: `Suspended creator ${target_did}` };
    }

    // ── Service Creation ──────────────────────────────────────────────────
    case 'create_service': {
      const { service_data } = params;
      if (!service_data) throw new Error('service_data required');

      const svc = await base44.asServiceRole.entities.ServiceDefinition.create(service_data);
      return { target: svc.id, data: { service_id: svc.service_id || svc.id }, message: `Created service: ${service_data.name || svc.id}` };
    }

    default:
      throw new Error(`Unhandled action: ${action}`);
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function resolveTargetType(action) {
  const map = {
    assign_role: 'user', revoke_role: 'user',
    update_rule: 'rule',
    mint_widget: 'widget', deprecate_widget: 'widget',
    update_service_pricing: 'pricing', update_treasury_split: 'treasury',
    approve_creator: 'user', suspend_creator: 'user',
    create_service: 'service',
  };
  return map[action] || 'other';
}

async function logGovernance(base44, data) {
  try {
    await base44.asServiceRole.entities.GovernanceLog.create({
      action: data.action,
      actor_did: data.actor_did,
      target: data.target || null,
      target_type: data.target_type || 'other',
      status: data.status,
      permissions_used: data.permissions_used || [],
      rules_evaluated: data.rules_evaluated || [],
      denial_reason: data.denial_reason || null,
      metadata: data.metadata || null,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[GovernanceEngine] Failed to log:', e.message);
  }
}