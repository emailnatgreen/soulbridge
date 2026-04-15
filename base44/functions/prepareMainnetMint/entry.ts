/**
 * Mainnet Minting Preparation Function
 * 
 * POST { widget_id }  — prepare an existing draft widget for mainnet minting
 * POST { widget_data } — create + prepare a new widget in one call
 * 
 * Flow:
 *   1. Authenticate + verify creator role
 *   2. Validate metadata against the Widget Metadata Standard
 *   3. Validate governance rules (via inline checks, not the full engine)
 *   4. Prepare XRPL NFTokenMint payload
 *   5. Simulate the mint (validate payload structure)
 *   6. Log governance action
 *   7. Return prepared payload (does NOT hit mainnet)
 * 
 * Backend-only. No mainnet interaction.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Widget Metadata Standard v1.0.0 ────────────────────────────────────────
const METADATA_STANDARD = {
  version: '1.0.0',
  required_fields: [
    'name', 'description', 'widget_type', 'widget_class',
    'category', 'version', 'minted_by', 'ui_behavior'
  ],
  service_widget_required: [
    'cost_per_stream_interval', 'stream_interval_unit', 'royalties_config'
  ],
  unlock_widget_required: [
    'feature_path'
  ],
  immutable_after_mint: [
    'name', 'widget_type', 'widget_class', 'category',
    'nft_id', 'minted_by', 'creator_id', 'taxon', 'metadata_hash'
  ],
  valid_categories: [
    'agent_creation', 'skill', 'environment', 'governance',
    'training', 'wallet_management', 'did_management', 'other'
  ],
  valid_widget_types: ['service', 'unlock'],
  valid_ui_behaviors: ['toggle', 'unlock_page', 'upgrade', 'badge', 'activate_feature'],
  max_name_length: 100,
  max_description_length: 2000,
  version_pattern: /^\d+\.\d+\.\d+$/,
  nft_id_pattern: /^WIDGET-[A-Z]{2,4}-\d{3,6}$/,
};

// ── XRPL NFTokenMint constants ──────────────────────────────────────────────
const XRPL_FLAGS = {
  tfBurnable: 0x00000001,
  tfOnlyXRP: 0x00000002,
  tfTrustLine: 0x00000004,
  tfTransferable: 0x00000008,
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
    const { widget_id, widget_data, issuer_address } = body;

    if (!widget_id && !widget_data) {
      return Response.json({
        error: 'Provide widget_id (existing draft) or widget_data (new widget)',
        code: 'MISSING_INPUT'
      }, { status: 400 });
    }

    let widget;

    // ── 2. Resolve or create the widget ───────────────────────────────────
    if (widget_id) {
      // Load existing widget
      const widgets = await base44.asServiceRole.entities.Widget.filter(
        { id: widget_id }, '-created_date', 1
      );
      // Fallback: list and find
      if (!widgets || widgets.length === 0) {
        const all = await base44.asServiceRole.entities.Widget.list('-created_date', 500);
        widget = all.find(w => w.id === widget_id);
      } else {
        widget = widgets[0];
      }
      if (!widget) {
        return Response.json({ error: 'Widget not found', code: 'WIDGET_NOT_FOUND' }, { status: 404 });
      }
      if (widget.mint_status === 'minted_mainnet') {
        return Response.json({
          error: 'Widget already minted on mainnet',
          code: 'ALREADY_MINTED'
        }, { status: 400 });
      }
    } else {
      // Create new widget in draft state — will be prepared below
      widget = await base44.asServiceRole.entities.Widget.create({
        ...widget_data,
        mint_status: 'draft',
        metadata_version: METADATA_STANDARD.version,
        immutable_after_mint: METADATA_STANDARD.immutable_after_mint,
      });
    }

    // ── 3. Validate metadata against the standard ─────────────────────────
    const validationErrors = validateMetadata(widget);
    if (validationErrors.length > 0) {
      await logMintAction(base44, user, widget, 'denied_rule', {
        reason: 'Metadata validation failed',
        errors: validationErrors,
      });
      return Response.json({
        error: 'Widget metadata does not conform to the Metadata Standard v1.0.0',
        code: 'METADATA_INVALID',
        validation_errors: validationErrors,
        standard_version: METADATA_STANDARD.version,
      }, { status: 400 });
    }

    // ── 4. Validate governance minting rules ──────────────────────────────
    const ruleResult = await validateMintingRules(base44, widget, user);
    if (!ruleResult.allowed) {
      await logMintAction(base44, user, widget, 'denied_rule', {
        reason: ruleResult.reason,
        rules_evaluated: ruleResult.rules_evaluated,
      });
      return Response.json({
        error: ruleResult.reason,
        code: 'GOVERNANCE_RULE_VIOLATION',
        rules_evaluated: ruleResult.rules_evaluated,
      }, { status: 403 });
    }

    // ── 5. Validate creator role ──────────────────────────────────────────
    const creatorCheck = await validateCreatorRole(base44, user);
    if (!creatorCheck.allowed) {
      await logMintAction(base44, user, widget, 'denied_permission', {
        reason: creatorCheck.reason,
      });
      return Response.json({
        error: creatorCheck.reason,
        code: 'CREATOR_ROLE_REQUIRED',
      }, { status: 403 });
    }

    // ── 6. Prepare XRPL NFTokenMint payload ───────────────────────────────
    const metadataHash = generateMetadataHash(widget);
    const mintPayload = buildXRPLMintPayload(widget, issuer_address, metadataHash);

    // ── 7. Simulate the mint (validate payload correctness) ───────────────
    const simulation = simulateMint(mintPayload, widget);

    // ── 8. Update widget with prepared payload ────────────────────────────
    await base44.asServiceRole.entities.Widget.update(widget.id, {
      mint_status: simulation.valid ? 'simulated' : 'prepared',
      xrpl_mint_payload: mintPayload,
      metadata_hash: metadataHash,
      metadata_version: METADATA_STANDARD.version,
      immutable_after_mint: METADATA_STANDARD.immutable_after_mint,
      xrpl_network: 'mainnet',
    });

    // ── 9. Log governance action ──────────────────────────────────────────
    await logMintAction(base44, user, widget, 'success', {
      simulation_result: simulation,
      rules_evaluated: ruleResult.rules_evaluated,
      metadata_hash: metadataHash,
      payload_size: JSON.stringify(mintPayload).length,
    });

    return Response.json({
      success: true,
      message: simulation.valid
        ? 'Widget prepared and simulation passed — ready for mainnet minting'
        : 'Widget prepared but simulation flagged warnings — review before mainnet',
      widget_id: widget.id,
      nft_id: widget.nft_id,
      mint_status: simulation.valid ? 'simulated' : 'prepared',
      metadata_hash: metadataHash,
      metadata_standard_version: METADATA_STANDARD.version,
      xrpl_mint_payload: mintPayload,
      simulation: simulation,
      rules_evaluated: ruleResult.rules_evaluated,
      immutable_fields: METADATA_STANDARD.immutable_after_mint,
    });

  } catch (error) {
    console.error('[prepareMainnetMint] Error:', error);
    return Response.json({ error: error.message, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// METADATA VALIDATION
// ══════════════════════════════════════════════════════════════════════════════
function validateMetadata(widget) {
  const errors = [];
  const S = METADATA_STANDARD;

  // Required fields
  for (const field of S.required_fields) {
    if (!widget[field] && widget[field] !== false && widget[field] !== 0) {
      errors.push({ field, error: 'Required field missing' });
    }
  }

  // Type-specific required fields
  if (widget.widget_type === 'service') {
    for (const field of S.service_widget_required) {
      if (field === 'royalties_config') {
        if (!widget.royalties_config || typeof widget.royalties_config !== 'object') {
          errors.push({ field, error: 'Service widgets require royalties_config' });
        } else {
          const rc = widget.royalties_config;
          const total = (rc.treasury_percent || 0) + (rc.creator_percent || 0) + (rc.referral_percent || 0);
          if (total !== 100) {
            errors.push({ field: 'royalties_config', error: `Royalty split must total 100%, got ${total}%` });
          }
        }
      } else if (!widget[field] && widget[field] !== 0) {
        errors.push({ field, error: `Required for service widgets` });
      }
    }
  }

  if (widget.widget_type === 'unlock') {
    for (const field of S.unlock_widget_required) {
      if (!widget[field]) {
        errors.push({ field, error: `Required for unlock widgets` });
      }
    }
  }

  // Enum validation
  if (widget.widget_type && !S.valid_widget_types.includes(widget.widget_type)) {
    errors.push({ field: 'widget_type', error: `Must be one of: ${S.valid_widget_types.join(', ')}` });
  }
  if (widget.category && !S.valid_categories.includes(widget.category)) {
    errors.push({ field: 'category', error: `Must be one of: ${S.valid_categories.join(', ')}` });
  }
  if (widget.ui_behavior && !S.valid_ui_behaviors.includes(widget.ui_behavior)) {
    errors.push({ field: 'ui_behavior', error: `Must be one of: ${S.valid_ui_behaviors.join(', ')}` });
  }

  // Length constraints
  if (widget.name && widget.name.length > S.max_name_length) {
    errors.push({ field: 'name', error: `Exceeds max length of ${S.max_name_length}` });
  }
  if (widget.description && widget.description.length > S.max_description_length) {
    errors.push({ field: 'description', error: `Exceeds max length of ${S.max_description_length}` });
  }

  // Version format
  if (widget.version && !S.version_pattern.test(widget.version)) {
    errors.push({ field: 'version', error: 'Must follow semver format (e.g. 1.0.0)' });
  }

  // NFT ID format (if present)
  if (widget.nft_id && !S.nft_id_pattern.test(widget.nft_id)) {
    errors.push({ field: 'nft_id', error: 'Must follow pattern WIDGET-XX-NNN (e.g. WIDGET-WM-001)' });
  }

  // Transfer fee bounds (XRPL: 0-50000)
  if (widget.transfer_fee !== undefined && (widget.transfer_fee < 0 || widget.transfer_fee > 50000)) {
    errors.push({ field: 'transfer_fee', error: 'Must be 0-50000 (0%-50%)' });
  }

  return errors;
}


// ══════════════════════════════════════════════════════════════════════════════
// GOVERNANCE MINTING RULES VALIDATION
// ══════════════════════════════════════════════════════════════════════════════
async function validateMintingRules(base44, widget, user) {
  const rules = await base44.asServiceRole.entities.GovernanceRule.filter(
    { rule_type: 'widget_minting', status: 'active' }, '-created_date', 50
  );

  const rulesEvaluated = rules.map(r => r.rule_id);

  for (const rule of rules) {
    const v = rule.value || {};

    // Max widgets per creator
    if (v.max_per_creator !== undefined) {
      const creatorId = widget.minted_by || widget.creator_id;
      if (creatorId) {
        const existing = await base44.asServiceRole.entities.Widget.filter(
          { minted_by: creatorId }, '-created_date', 500
        );
        // Don't count the widget itself if it already exists
        const count = existing.filter(w => w.id !== widget.id).length;
        if (count >= v.max_per_creator) {
          if (rule.enforcement === 'hard') {
            return {
              allowed: false,
              reason: `Creator ${creatorId} has ${count} widgets (max: ${v.max_per_creator})`,
              rules_evaluated: rulesEvaluated,
            };
          }
        }
      }
    }

    // Min honor for minting
    if (v.min_honor !== undefined) {
      const agents = await base44.asServiceRole.entities.Agent.filter(
        { created_by: user.email }, '-created_date', 1
      );
      const honor = agents?.[0]?.honor_score ?? 100;
      if (honor < v.min_honor) {
        if (rule.enforcement === 'hard') {
          return {
            allowed: false,
            reason: `Honor score ${honor} below minting threshold ${v.min_honor}`,
            rules_evaluated: rulesEvaluated,
          };
        }
      }
    }

    // Pricing constraints for service widgets
    if (v.min_price !== undefined && widget.widget_type === 'service') {
      if ((widget.cost_per_stream_interval || 0) < v.min_price) {
        if (rule.enforcement === 'hard') {
          return {
            allowed: false,
            reason: `Service price ${widget.cost_per_stream_interval} below minimum ${v.min_price} RLUSD`,
            rules_evaluated: rulesEvaluated,
          };
        }
      }
    }
    if (v.max_price !== undefined && widget.widget_type === 'service') {
      if ((widget.cost_per_stream_interval || 0) > v.max_price) {
        if (rule.enforcement === 'hard') {
          return {
            allowed: false,
            reason: `Service price ${widget.cost_per_stream_interval} above maximum ${v.max_price} RLUSD`,
            rules_evaluated: rulesEvaluated,
          };
        }
      }
    }

    // Min treasury royalty percentage
    if (v.min_treasury_percent !== undefined && widget.royalties_config) {
      if ((widget.royalties_config.treasury_percent || 0) < v.min_treasury_percent) {
        if (rule.enforcement === 'hard') {
          return {
            allowed: false,
            reason: `Treasury royalty ${widget.royalties_config.treasury_percent}% below minimum ${v.min_treasury_percent}%`,
            rules_evaluated: rulesEvaluated,
          };
        }
      }
    }

    // Required metadata version
    if (v.required_metadata_version) {
      if (widget.metadata_version && widget.metadata_version !== v.required_metadata_version) {
        if (rule.enforcement === 'hard') {
          return {
            allowed: false,
            reason: `Metadata version ${widget.metadata_version} does not match required ${v.required_metadata_version}`,
            rules_evaluated: rulesEvaluated,
          };
        }
      }
    }
  }

  return { allowed: true, rules_evaluated: rulesEvaluated };
}


// ══════════════════════════════════════════════════════════════════════════════
// CREATOR ROLE VALIDATION
// ══════════════════════════════════════════════════════════════════════════════
async function validateCreatorRole(base44, user) {
  // Admin bypass
  if (user.role === 'admin') {
    return { allowed: true, role: 'admin' };
  }

  // Check for active creator or governor assignment
  const assignments = await base44.asServiceRole.entities.GovernanceAssignment.filter(
    { user_did: user.email, status: 'active' }, '-created_date', 50
  );

  const creatorRoles = ['creator', 'governor', 'admin'];
  const hasCreatorRole = assignments.some(a => creatorRoles.includes(a.role_id));

  if (!hasCreatorRole) {
    return {
      allowed: false,
      reason: 'Creator role required to mint widgets. Apply via governance or contact a governor.',
    };
  }

  return { allowed: true, role: assignments.find(a => creatorRoles.includes(a.role_id))?.role_id };
}


// ══════════════════════════════════════════════════════════════════════════════
// XRPL PAYLOAD BUILDER
// ══════════════════════════════════════════════════════════════════════════════
function buildXRPLMintPayload(widget, issuerAddress, metadataHash) {
  // Build NFToken flags
  let flags = 0;
  if (widget.burnable) flags |= XRPL_FLAGS.tfBurnable;
  if (widget.transferable) flags |= XRPL_FLAGS.tfTransferable;

  // Encode metadata URI as hex
  const uriHex = widget.metadata_uri
    ? stringToHex(widget.metadata_uri)
    : stringToHex(`soulbridge://widget/${widget.nft_id || widget.id}/v${widget.version}`);

  return {
    TransactionType: 'NFTokenMint',
    Account: issuerAddress || 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h', // Treasury address as default issuer
    URI: uriHex,
    Flags: flags,
    TransferFee: widget.transfer_fee || 0,
    NFTokenTaxon: widget.taxon || 0,
    // Memos for on-chain auditability
    Memos: [
      {
        Memo: {
          MemoType: stringToHex('soulbridge/widget-nft-id'),
          MemoData: stringToHex(widget.nft_id || widget.id),
        }
      },
      {
        Memo: {
          MemoType: stringToHex('soulbridge/metadata-hash'),
          MemoData: stringToHex(metadataHash),
        }
      },
      {
        Memo: {
          MemoType: stringToHex('soulbridge/metadata-version'),
          MemoData: stringToHex(METADATA_STANDARD.version),
        }
      }
    ],
    // Not included in actual tx, for reference only
    _soulbridge_meta: {
      widget_id: widget.id,
      nft_id: widget.nft_id,
      name: widget.name,
      category: widget.category,
      widget_type: widget.widget_type,
      minted_by: widget.minted_by,
      metadata_hash: metadataHash,
      prepared_at: new Date().toISOString(),
    }
  };
}


// ══════════════════════════════════════════════════════════════════════════════
// MINT SIMULATION
// ══════════════════════════════════════════════════════════════════════════════
function simulateMint(payload, widget) {
  const warnings = [];
  const checks = [];

  // Check TransactionType
  checks.push({
    check: 'transaction_type',
    passed: payload.TransactionType === 'NFTokenMint',
    detail: `TransactionType = ${payload.TransactionType}`,
  });

  // Check Account
  checks.push({
    check: 'issuer_account',
    passed: !!payload.Account && payload.Account.length >= 25,
    detail: `Account = ${payload.Account}`,
  });

  // Check URI is hex-encoded
  checks.push({
    check: 'uri_encoded',
    passed: !!payload.URI && /^[0-9A-Fa-f]+$/.test(payload.URI),
    detail: `URI length = ${payload.URI?.length || 0} hex chars`,
  });

  // Check URI length (XRPL max 256 bytes = 512 hex chars)
  if (payload.URI && payload.URI.length > 512) {
    warnings.push('URI exceeds 256 bytes — may be rejected by XRPL');
  }
  checks.push({
    check: 'uri_length',
    passed: !payload.URI || payload.URI.length <= 512,
    detail: `URI ${payload.URI?.length || 0}/512 hex chars`,
  });

  // Check Flags
  checks.push({
    check: 'flags_valid',
    passed: typeof payload.Flags === 'number' && payload.Flags >= 0,
    detail: `Flags = ${payload.Flags}`,
  });

  // Check TransferFee (0-50000)
  checks.push({
    check: 'transfer_fee_range',
    passed: payload.TransferFee >= 0 && payload.TransferFee <= 50000,
    detail: `TransferFee = ${payload.TransferFee}`,
  });

  // Check Taxon
  checks.push({
    check: 'taxon_valid',
    passed: typeof payload.NFTokenTaxon === 'number' && payload.NFTokenTaxon >= 0,
    detail: `Taxon = ${payload.NFTokenTaxon}`,
  });

  // Check memos
  checks.push({
    check: 'memos_present',
    passed: payload.Memos && payload.Memos.length >= 2,
    detail: `${payload.Memos?.length || 0} memos attached`,
  });

  // Widget-specific warnings
  if (!widget.nft_id) {
    warnings.push('No nft_id set — assign before mainnet minting');
  }
  if (widget.widget_type === 'service' && !widget.royalties_config) {
    warnings.push('Service widget missing royalties_config');
  }
  if (!widget.transferable) {
    warnings.push('Widget is soul-bound (non-transferable) — confirm this is intentional');
  }

  const allPassed = checks.every(c => c.passed);

  return {
    valid: allPassed && warnings.length === 0,
    simulation_passed: allPassed,
    checks,
    warnings,
    summary: allPassed
      ? (warnings.length > 0 ? 'Payload valid with warnings' : 'Payload valid — ready for mainnet')
      : 'Payload has errors — fix before mainnet',
  };
}


// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function generateMetadataHash(widget) {
  // Deterministic canonical JSON of the core immutable fields
  const canonical = {
    name: widget.name,
    description: widget.description,
    widget_type: widget.widget_type,
    widget_class: widget.widget_class,
    category: widget.category,
    version: widget.version,
    nft_id: widget.nft_id || null,
    minted_by: widget.minted_by,
    creator_id: widget.creator_id || null,
    taxon: widget.taxon || 0,
    ui_behavior: widget.ui_behavior,
    feature_path: widget.feature_path || null,
  };

  // Simple hash (deterministic, not cryptographic — crypto.subtle is async)
  const str = JSON.stringify(canonical);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // 32-bit int
  }
  // Convert to hex and pad
  const hashHex = (hash >>> 0).toString(16).padStart(8, '0');
  return `sb-meta-${hashHex}-${str.length}`;
}

function stringToHex(str) {
  return Array.from(new TextEncoder().encode(str))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

async function logMintAction(base44, user, widget, status, metadata) {
  try {
    await base44.asServiceRole.entities.GovernanceLog.create({
      action: 'prepare_mainnet_mint',
      actor_did: user.email,
      target: widget.id,
      target_type: 'widget',
      status,
      permissions_used: ['can_mint_widgets'],
      rules_evaluated: metadata.rules_evaluated || [],
      denial_reason: status !== 'success' ? metadata.reason : null,
      metadata: {
        widget_name: widget.name,
        nft_id: widget.nft_id,
        metadata_hash: metadata.metadata_hash,
        ...metadata,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[prepareMainnetMint] Failed to log:', e.message);
  }
}