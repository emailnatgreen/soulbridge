import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Chrome Skill Security Gate — Phase 4: Chrome Skill Security Alignment
 *
 * Validates Chrome Skill NFTs against May 2026 security patches,
 * AP2 protocol compliance, and the Universal Trust Protocol.
 *
 * Actions:
 *   validate   — Full security scan of a Chrome Skill before minting/activation
 *   audit      — Return recent validation audit trail
 *   scan_all   — Scan all existing Chrome Skill widgets for compliance (admin)
 *
 * Security checks:
 *   1. Instruction Injection Scan — detects prompt injection patterns in skill instructions
 *   2. Manifest Integrity — validates WebMCP 2026.1 structure completeness
 *   3. AP2 Protocol Compliance — verifies agent-to-agent payment gates are present
 *   4. Category Compliance — checks skill categories against allowed list
 *   5. Scope Boundary Check — detects overly broad permissions or multi-tab abuse
 *   6. Soul Signature Cross-Check — verifies the minting agent has authority
 */

const GATE_AGENT_ID = 'chrome-skill-security-gate';

// Injection patterns in skill instructions
const INSTRUCTION_INJECTION_PATTERNS = [
  'ignore previous', 'disregard instructions', 'override system',
  'forget your rules', 'act as root', 'sudo', 'rm -rf',
  'execute javascript', 'eval(', 'document.cookie',
  'window.location', 'fetch(', 'XMLHttpRequest',
  'localStorage.getItem', 'sessionStorage',
  'chrome.runtime', 'chrome.tabs', 'chrome.storage',
  'browser.tabs', 'browser.runtime',
  'script src=', '<script>', 'javascript:',
  'data:text/html', 'blob:', 'import(',
  'require(', 'process.env', '__proto__',
  'constructor.prototype',
];

// Prohibited skill categories
const PROHIBITED_CATEGORIES = [
  'exploit', 'hack', 'phishing', 'malware', 'scraping',
];

// Required WebMCP 2026.1 manifest fields
const REQUIRED_MANIFEST_FIELDS = ['version', 'capabilities'];
const REQUIRED_TOOL_FIELDS = ['name', 'display_name', 'instructions'];

// Allowed categories per Chrome Skill Library
const ALLOWED_CATEGORIES = [
  'research', 'shopping', 'health', 'productivity',
  'learning', 'compliance', 'writing', 'creative',
  'finance', 'communication', 'analysis',
];

function scanInstructions(instructions) {
  const text = (instructions || '').toLowerCase();
  const flags = [];

  for (const pattern of INSTRUCTION_INJECTION_PATTERNS) {
    if (text.includes(pattern)) {
      flags.push({ type: 'instruction_injection', pattern, severity: 'critical' });
    }
  }

  // Length check — overly long instructions may be prompt stuffing
  if (text.length > 5000) {
    flags.push({ type: 'oversized_instructions', length: text.length, severity: 'medium' });
  }

  // Detect URL embedding (potential exfiltration)
  const urlPattern = /https?:\/\/[^\s"']+/gi;
  const urls = text.match(urlPattern) || [];
  if (urls.length > 3) {
    flags.push({ type: 'excessive_urls', count: urls.length, severity: 'medium' });
  }

  return flags;
}

function validateManifest(manifest) {
  const issues = [];

  if (!manifest) {
    issues.push({ type: 'missing_manifest', severity: 'high', detail: 'No WebMCP manifest present' });
    return issues;
  }

  // Version check
  if (manifest.version !== '2026.1') {
    issues.push({ type: 'version_mismatch', severity: 'medium', detail: `Expected 2026.1, got ${manifest.version}` });
  }

  // Required fields
  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (!manifest[field]) {
      issues.push({ type: 'missing_field', severity: 'high', detail: `Missing required field: ${field}` });
    }
  }

  // Validate tools
  const tools = manifest.capabilities?.tools || [];
  if (tools.length === 0) {
    issues.push({ type: 'no_tools', severity: 'high', detail: 'Manifest declares no tools' });
  }

  for (const tool of tools) {
    for (const field of REQUIRED_TOOL_FIELDS) {
      if (!tool[field]) {
        issues.push({ type: 'tool_missing_field', severity: 'medium', detail: `Tool "${tool.name || 'unnamed'}": missing ${field}` });
      }
    }

    // Category validation
    if (tool.category && !ALLOWED_CATEGORIES.includes(tool.category)) {
      if (PROHIBITED_CATEGORIES.includes(tool.category)) {
        issues.push({ type: 'prohibited_category', severity: 'critical', detail: `Tool "${tool.name}": prohibited category "${tool.category}"` });
      } else {
        issues.push({ type: 'unknown_category', severity: 'low', detail: `Tool "${tool.name}": unrecognised category "${tool.category}"` });
      }
    }
  }

  return issues;
}

function checkAP2Compliance(widget) {
  const issues = [];

  // AP2 requires: DIDit verification on skills that charge RLUSD
  const skills = widget.chrome_skill_instructions || [];
  const hasPaymentSkills = (widget.cost_per_stream_interval || 0) > 0;

  if (hasPaymentSkills) {
    const unverifiedSkills = skills.filter(s => !s.requires_didit_verification);
    if (unverifiedSkills.length > 0) {
      issues.push({
        type: 'ap2_unverified_payment',
        severity: 'high',
        detail: `${unverifiedSkills.length} skill(s) charge RLUSD but skip DIDit verification`,
        skills: unverifiedSkills.map(s => s.skill_name),
      });
    }
  }

  // AP2 requires: royalties_config if service type
  if (widget.widget_type === 'service' && !widget.royalties_config) {
    issues.push({ type: 'ap2_missing_royalties', severity: 'medium', detail: 'Service widget missing royalties_config' });
  }

  return issues;
}

function checkScopeBoundary(widget) {
  const issues = [];
  const skills = widget.chrome_skill_instructions || [];

  // Multi-tab skills need extra scrutiny
  const multiTabSkills = skills.filter(s => s.multi_tab);
  if (multiTabSkills.length > 2) {
    issues.push({
      type: 'excessive_multi_tab',
      severity: 'medium',
      detail: `${multiTabSkills.length} multi-tab skills — potential scope overreach`,
    });
  }

  // Check for cross-origin indicators in instructions
  for (const skill of skills) {
    const text = (skill.instructions || '').toLowerCase();
    if (text.includes('other domain') || text.includes('cross-origin') || text.includes('third-party site')) {
      issues.push({
        type: 'cross_origin_intent',
        severity: 'high',
        detail: `Skill "${skill.skill_name}": instructions reference cross-origin operations`,
      });
    }
  }

  return issues;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action || 'validate';

    // ─── VALIDATE ───
    if (action === 'validate') {
      const { widget_id, widget_data, minting_agent_id } = body;
      const startTime = Date.now();

      // Get widget data — either passed directly or fetched by ID
      let widget = widget_data;
      if (!widget && widget_id) {
        widget = await base44.asServiceRole.entities.Widget.get(widget_id);
      }
      if (!widget) {
        return Response.json({ error: 'widget_data or widget_id required' }, { status: 400 });
      }

      // Collect all issues
      const allIssues = [];

      // 1. Instruction Injection Scan
      const skills = widget.chrome_skill_instructions || [];
      for (const skill of skills) {
        const flags = scanInstructions(skill.instructions);
        allIssues.push(...flags.map(f => ({ ...f, skill: skill.skill_name })));
      }

      // 2. Manifest Integrity
      const manifestIssues = validateManifest(widget.webmcp_manifest);
      allIssues.push(...manifestIssues);

      // 3. AP2 Protocol Compliance
      const ap2Issues = checkAP2Compliance(widget);
      allIssues.push(...ap2Issues);

      // 4. Scope Boundary Check
      const scopeIssues = checkScopeBoundary(widget);
      allIssues.push(...scopeIssues);

      // 5. Soul Signature cross-check (if minting agent provided)
      let soulCheck = null;
      if (minting_agent_id) {
        try {
          const ssRes = await base44.asServiceRole.functions.invoke('soulSignatureVerify', {
            action: 'verify',
            agent_id: minting_agent_id,
            proposed_action: `Mint Chrome Skill NFT: ${widget.name || 'unnamed'}`,
            action_type: 'deploy_service',
            action_context: `Chrome Skill with ${skills.length} skill(s)`,
          });
          soulCheck = ssRes.data || ssRes;
          if (!soulCheck.approved) {
            allIssues.push({
              type: 'soul_signature_denied',
              severity: 'critical',
              detail: `Minting agent Soul Signature denied: ${soulCheck.reason}`,
            });
          }
        } catch (e) {
          console.warn('[chromeSkillSecurityGate] Soul check failed:', e.message);
        }
      }

      // Compute verdict
      const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
      const highCount = allIssues.filter(i => i.severity === 'high').length;
      const mediumCount = allIssues.filter(i => i.severity === 'medium').length;

      let verdict, approved;
      if (criticalCount > 0) {
        verdict = 'BLOCKED';
        approved = false;
      } else if (highCount > 0) {
        verdict = 'DENIED';
        approved = false;
      } else if (mediumCount > 0) {
        verdict = 'CAUTION';
        approved = true;
      } else {
        verdict = 'APPROVED';
        approved = true;
      }

      const elapsedMs = Date.now() - startTime;

      // Audit log
      const emoji = approved ? (verdict === 'CAUTION' ? '⚠️' : '✅') : '🚫';
      await base44.asServiceRole.entities.Memory.create({
        agent_id: GATE_AGENT_ID,
        type: 'observation',
        content: `${emoji} ${verdict}: "${widget.name || 'unnamed'}" | Skills: ${skills.length} | Issues: C:${criticalCount} H:${highCount} M:${mediumCount} | ${elapsedMs}ms`,
        keywords: ['chrome_skill_security', 'phase_4', verdict.toLowerCase(), ...(criticalCount > 0 ? ['critical'] : [])],
        importance: criticalCount > 0 ? 9 : highCount > 0 ? 7 : 5,
        context: JSON.stringify({ widget_name: widget.name, verdict, issues: allIssues.length, soul_check: soulCheck?.verdict }),
        related_entity_id: widget_id || undefined,
        related_entity_type: 'Widget',
      });

      // Create tripwire for blocked skills
      if (verdict === 'BLOCKED') {
        await base44.asServiceRole.entities.TripwireEvent.create({
          event_type: 'access_violation',
          severity: 'critical',
          status: 'active',
          source_node: 'Chrome Skill Security Gate (Phase 4)',
          description: `BLOCKED Chrome Skill "${widget.name}": ${criticalCount} critical issue(s) — ${allIssues.filter(i => i.severity === 'critical').map(i => i.type).join(', ')}`,
          details: { widget_name: widget.name, issues: allIssues },
          actor_email: user.email,
        });
      }

      return Response.json({
        approved,
        verdict,
        widget_name: widget.name,
        skills_count: skills.length,
        issues: allIssues,
        summary: {
          critical: criticalCount,
          high: highCount,
          medium: mediumCount,
          low: allIssues.filter(i => i.severity === 'low').length,
          total: allIssues.length,
        },
        soul_signature: soulCheck ? { verdict: soulCheck.verdict, approved: soulCheck.approved } : null,
        processing_ms: elapsedMs,
        timestamp: new Date().toISOString(),
      });
    }

    // ─── AUDIT ───
    if (action === 'audit') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }

      const limit = body.limit || 30;
      const records = await base44.asServiceRole.entities.Memory.filter(
        { agent_id: GATE_AGENT_ID },
        '-created_date', limit
      );

      const stats = {
        total: records.length,
        approved: records.filter(r => r.content?.includes('APPROVED')).length,
        caution: records.filter(r => r.content?.includes('CAUTION')).length,
        denied: records.filter(r => r.content?.includes('DENIED')).length,
        blocked: records.filter(r => r.content?.includes('BLOCKED')).length,
      };

      return Response.json({
        audit_trail: records.map(r => ({
          id: r.id,
          content: r.content,
          keywords: r.keywords,
          importance: r.importance,
          created_date: r.created_date,
        })),
        stats,
      });
    }

    // ─── SCAN_ALL ───
    if (action === 'scan_all') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }

      const widgets = await base44.asServiceRole.entities.Widget.filter(
        { category: 'skill' }, '-created_date', 50
      );

      const results = [];
      for (const w of widgets) {
        if (!w.chrome_skill_instructions?.length && !w.webmcp_manifest) continue;

        const allIssues = [];
        for (const skill of (w.chrome_skill_instructions || [])) {
          allIssues.push(...scanInstructions(skill.instructions).map(f => ({ ...f, skill: skill.skill_name })));
        }
        allIssues.push(...validateManifest(w.webmcp_manifest));
        allIssues.push(...checkAP2Compliance(w));
        allIssues.push(...checkScopeBoundary(w));

        const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
        const highCount = allIssues.filter(i => i.severity === 'high').length;

        results.push({
          widget_id: w.id,
          name: w.name,
          skills: (w.chrome_skill_instructions || []).length,
          issues: allIssues.length,
          critical: criticalCount,
          high: highCount,
          verdict: criticalCount > 0 ? 'BLOCKED' : highCount > 0 ? 'DENIED' : allIssues.length > 0 ? 'CAUTION' : 'APPROVED',
        });
      }

      return Response.json({
        scanned: results.length,
        results,
        summary: {
          approved: results.filter(r => r.verdict === 'APPROVED').length,
          caution: results.filter(r => r.verdict === 'CAUTION').length,
          denied: results.filter(r => r.verdict === 'DENIED').length,
          blocked: results.filter(r => r.verdict === 'BLOCKED').length,
        },
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[chromeSkillSecurityGate]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});