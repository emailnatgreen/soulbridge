import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Fair Share Guard — Phase 2 Economic Extraction Hardening
 *
 * Enforces Law 3 (Fair Share) across all value flows:
 *   1. Hard 2.5% extraction ceiling on platform fees
 *   2. Minimum 97.5% provenance split to creators
 *   3. Transparent distribution audit trail
 *
 * Actions:
 *   status  — Quick compliance summary
 *   audit   — Full extraction analysis across all payment flows
 *   check   — Validate a specific transaction/split before execution
 *
 * Constitutional alignment: Law 3 (Fair Share), Law 6 (Exchange), Law 8 (Governance)
 */

const EXTRACTION_CEILING_PCT = 2.5;    // Hard maximum platform cut
const CREATOR_MINIMUM_PCT = 97.5;       // Minimum to creator (100 - ceiling)
const MARKETPLACE_FEE_CEILING = 2.5;    // Marketplace village fee ceiling
const ROYALTY_PLATFORM_CEILING = 2.5;   // Platform share of royalty splits

// ─── FLOW DEFINITIONS ───
// Every value flow in the system with its extraction parameters
function getFlowDefinitions() {
  return [
    {
      flow_name: 'Marketplace Village Fee',
      flow_type: 'marketplace_charge',
      description: 'Fee on marketplace transactions (StorefrontListing, MarketplaceListing)',
      current_platform_cut: 1.0,  // paymentEngine: villageFee = amount * 0.01
      ceiling: MARKETPLACE_FEE_CEILING,
    },
    {
      flow_name: 'Service Engine — Default Royalty Split',
      flow_type: 'service_charge_default',
      description: 'Default royalty config (creator 98%, treasury 1.5%, referral 0.5%) — Phase 3 rectified',
      current_platform_cut: 2.0,  // treasury(1.5%) + referral(0.5%) = 2.0% — within 2.5% ceiling
      ceiling: EXTRACTION_CEILING_PCT,
    },
    {
      flow_name: 'Widget NFT — Royalty Config',
      flow_type: 'widget_royalty',
      description: 'Widget marketplace royalty distribution (treasury_percent + referral_percent)',
      current_platform_cut: null,  // Variable per widget
      ceiling: EXTRACTION_CEILING_PCT,
    },
    {
      flow_name: 'Streaming Service Fees',
      flow_type: 'streaming_fee',
      description: 'Per-interval streaming charges for active service widgets',
      current_platform_cut: null,  // Variable per widget
      ceiling: EXTRACTION_CEILING_PCT,
    },
    {
      flow_name: 'Search Engine NFT — Treasury Share',
      flow_type: 'search_engine_fee',
      description: 'Treasury share from search engine NFT usage (pricing_policy.treasury_share_percent) — Phase 3 rectified',
      current_platform_cut: 2.0,  // Reduced from 20% to 2% — within 2.5% ceiling
      ceiling: EXTRACTION_CEILING_PCT,
    },
    {
      flow_name: 'Skill Creator NFT — Village Treasury Share',
      flow_type: 'skill_creator_fee',
      description: 'Village treasury share from skill creator royalties (royalty_split.village_treasury_share) — Phase 3 rectified',
      current_platform_cut: 2.0,  // Reduced from 20% to 2% — within 2.5% ceiling
      ceiling: EXTRACTION_CEILING_PCT,
    },
  ];
}

// ─── ANALYSE FLOW COMPLIANCE ───
function analyzeFlowCompliance(flows) {
  const signals = [];
  const analysedFlows = [];
  let violations = 0;
  let compliant = 0;

  for (const flow of flows) {
    const cut = flow.current_platform_cut;
    if (cut === null) {
      // Variable — needs per-entity check
      analysedFlows.push({
        flow_name: flow.flow_name,
        flow_type: flow.flow_type,
        platform_cut_pct: null,
        creator_cut_pct: null,
        status: 'requires_entity_scan',
        detail: 'Variable per entity — requires individual scan',
      });
      continue;
    }

    const creatorCut = 100 - cut;
    const isCompliant = cut <= flow.ceiling;

    if (!isCompliant) {
      violations++;
      signals.push({
        signal_type: 'extraction_ceiling_breach',
        detail: `${flow.flow_name}: platform takes ${cut}% — exceeds ${flow.ceiling}% ceiling by ${(cut - flow.ceiling).toFixed(1)}pp`,
        severity: cut > 50 ? 'critical' : cut > 10 ? 'high' : 'medium',
        flow: flow.flow_type,
      });
    } else {
      compliant++;
    }

    analysedFlows.push({
      flow_name: flow.flow_name,
      flow_type: flow.flow_type,
      platform_cut_pct: cut,
      creator_cut_pct: creatorCut,
      status: isCompliant ? 'compliant' : 'violation',
      detail: isCompliant
        ? `Within ceiling: ${cut}% ≤ ${flow.ceiling}%`
        : `VIOLATION: ${cut}% > ${flow.ceiling}% ceiling`,
    });
  }

  return { analysedFlows, signals, violations, compliant };
}

// ─── SCAN WIDGET ROYALTIES ───
async function scanWidgetRoyalties(db) {
  const signals = [];
  const widgets = await db.entities.Widget.list('-created_date', 100);
  let widgetViolations = 0;
  let widgetCompliant = 0;

  for (const w of widgets) {
    const rc = w.royalties_config || {};
    const platformCut = (rc.treasury_percent || 0) + (rc.referral_percent || 0);

    if (platformCut > EXTRACTION_CEILING_PCT) {
      widgetViolations++;
      signals.push({
        signal_type: 'widget_extraction_breach',
        detail: `Widget "${w.name}" (${w.id}): platform cut ${platformCut}% (treasury ${rc.treasury_percent || 0}% + referral ${rc.referral_percent || 0}%) exceeds ${EXTRACTION_CEILING_PCT}% ceiling`,
        severity: platformCut > 20 ? 'critical' : 'high',
        flow: 'widget_royalty',
      });
    } else {
      widgetCompliant++;
    }
  }

  return { total: widgets.length, violations: widgetViolations, compliant: widgetCompliant, signals };
}

// ─── SCAN RECENT TRANSACTIONS ───
async function scanRecentTransactions(db) {
  const signals = [];
  let sampled = 0;
  let compliantTx = 0;
  let violatingTx = 0;

  // Marketplace transactions
  const marketplaceTxns = await db.entities.MarketplaceTransaction.list('-created_date', 50);
  for (const tx of marketplaceTxns) {
    sampled++;
    const dist = tx.distribution_details || {};
    const totalAmount = tx.unit_amount || tx.purchase_price_rlusd || 0;
    if (totalAmount <= 0) continue;

    const villageFee = dist.village_fee_rlusd || 0;
    const feePct = (villageFee / totalAmount) * 100;

    if (feePct > MARKETPLACE_FEE_CEILING) {
      violatingTx++;
      signals.push({
        signal_type: 'transaction_extraction_breach',
        detail: `Marketplace tx ${tx.id}: village fee ${feePct.toFixed(2)}% exceeds ${MARKETPLACE_FEE_CEILING}% ceiling`,
        severity: 'high',
        flow: 'marketplace_charge',
      });
    } else {
      compliantTx++;
    }
  }

  // Payment usage logs
  const paymentLogs = await db.entities.PaymentUsageLog.filter(
    { status: 'success' }, '-created_date', 50
  );
  for (const log of paymentLogs) {
    sampled++;
    const split = log.royalties_split || {};
    const amount = log.amount || 0;
    if (amount <= 0) continue;

    const creatorAmount = split.creator_amount || 0;
    const creatorPct = (creatorAmount / amount) * 100;

    if (creatorPct < CREATOR_MINIMUM_PCT && amount > 0) {
      violatingTx++;
      signals.push({
        signal_type: 'creator_underpayment',
        detail: `Payment ${log.id}: creator receives ${creatorPct.toFixed(1)}% — below ${CREATOR_MINIMUM_PCT}% floor`,
        severity: creatorPct < 50 ? 'critical' : 'high',
        flow: 'service_charge',
      });
    } else {
      compliantTx++;
    }
  }

  return { sampled, compliant: compliantTx, violating: violatingTx, signals };
}

// ─── GENERATE RECOMMENDATIONS ───
function generateRecommendations(flowAnalysis, widgetScan, txScan) {
  const recs = [];

  // Check for the default royalty split violation
  const defaultFlow = flowAnalysis.find(f => f.flow_type === 'service_charge_default');
  if (defaultFlow && defaultFlow.status === 'violation') {
    recs.push({
      priority: 'critical',
      recommendation: 'URGENT: Default royalty split (treasury 50%, creator 40%, referral 10%) gives creator only 40%. Must restructure to creator ≥97.5%, platform ≤2.5%. Recommended: creator 98%, treasury 1.5%, referral 0.5%',
      flow: 'service_charge_default',
    });
  }

  // Search engine and skill creator NFTs
  const searchFlow = flowAnalysis.find(f => f.flow_type === 'search_engine_fee');
  if (searchFlow && searchFlow.status === 'violation') {
    recs.push({
      priority: 'high',
      recommendation: `SearchEngineNFT treasury_share_percent (${searchFlow.platform_cut_pct}%) exceeds ceiling. Reduce to ≤${EXTRACTION_CEILING_PCT}% in NFT schema`,
      flow: 'search_engine_fee',
    });
  }

  const skillFlow = flowAnalysis.find(f => f.flow_type === 'skill_creator_fee');
  if (skillFlow && skillFlow.status === 'violation') {
    recs.push({
      priority: 'high',
      recommendation: `AgentSkillCreatorNFT village_treasury_share (${skillFlow.platform_cut_pct}%) exceeds ceiling. Reduce to ≤${EXTRACTION_CEILING_PCT}%`,
      flow: 'skill_creator_fee',
    });
  }

  if (widgetScan.violations > 0) {
    recs.push({
      priority: 'high',
      recommendation: `${widgetScan.violations} widget(s) have royalty configs exceeding the ${EXTRACTION_CEILING_PCT}% platform ceiling. Update their royalties_config to comply`,
      flow: 'widget_royalty',
    });
  }

  if (txScan.violating > 0) {
    recs.push({
      priority: 'critical',
      recommendation: `${txScan.violating} recent transaction(s) violated Fair Share rules. Review and remediate immediately`,
      flow: 'transaction_level',
    });
  }

  return recs.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.priority] || 3) - (order[b.priority] || 3);
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action || 'status';
    const db = base44.asServiceRole;

    // ─── STATUS ───
    if (action === 'status') {
      const recentChecks = await db.entities.EconomicExtractionStatus.list('-created_date', 5);
      const flows = getFlowDefinitions();
      const { analysedFlows, signals, violations, compliant } = analyzeFlowCompliance(flows);

      const maxExtraction = Math.max(...analysedFlows.filter(f => f.platform_cut_pct !== null).map(f => f.platform_cut_pct), 0);

      return Response.json({
        node: 'Fair Share Guard — Economic Extraction Hardening',
        status: 'operational',
        constitutional_alignment: ['Law 3: Fair Share', 'Law 6: Exchange', 'Law 8: Governance'],
        extraction_ceiling: EXTRACTION_CEILING_PCT,
        creator_minimum: CREATOR_MINIMUM_PCT,
        flows_defined: flows.length,
        violations_in_config: violations,
        compliant_in_config: compliant,
        max_extraction_detected: maxExtraction,
        risk_signals_count: signals.length,
        critical_signals: signals.filter(s => s.severity === 'critical').length,
        recent_checks: recentChecks.slice(0, 3).map(c => ({
          id: c.id,
          check_type: c.check_type,
          result: c.result,
          platform_extraction_pct: c.platform_extraction_pct,
          created: c.created_date,
        })),
      });
    }

    // ─── AUDIT ───
    if (action === 'audit') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }

      const flows = getFlowDefinitions();
      const { analysedFlows, signals: flowSignals, violations, compliant } = analyzeFlowCompliance(flows);
      const widgetScan = await scanWidgetRoyalties(db);
      const txScan = await scanRecentTransactions(db);

      const allSignals = [...flowSignals, ...widgetScan.signals, ...txScan.signals];
      const allViolations = violations + widgetScan.violations + txScan.violating;
      const recommendations = generateRecommendations(analysedFlows, widgetScan, txScan);

      const maxExtraction = Math.max(
        ...analysedFlows.filter(f => f.platform_cut_pct !== null).map(f => f.platform_cut_pct),
        0
      );

      const criticalCount = allSignals.filter(s => s.severity === 'critical').length;
      const result = criticalCount > 0 ? 'critical_extraction'
        : allViolations > 0 ? 'violation'
        : allSignals.length > 0 ? 'warning'
        : 'compliant';

      // Create audit record
      const auditRecord = await db.entities.EconomicExtractionStatus.create({
        check_type: 'fair_share_audit',
        result,
        platform_extraction_pct: maxExtraction,
        max_extraction_ceiling: EXTRACTION_CEILING_PCT,
        creator_minimum_pct: CREATOR_MINIMUM_PCT,
        flows_audited: flows.length,
        violations_found: allViolations,
        compliant_flows: compliant + widgetScan.compliant,
        flow_analysis: analysedFlows,
        recent_transactions_sampled: txScan.sampled,
        transaction_compliance: {
          sampled: txScan.sampled,
          compliant: txScan.compliant,
          violating: txScan.violating,
          widget_total: widgetScan.total,
          widget_compliant: widgetScan.compliant,
          widget_violations: widgetScan.violations,
        },
        risk_signals: allSignals,
        recommendations,
        metadata: {
          audited_at: new Date().toISOString(),
          phase: 'Phase 2 Hardening',
          extraction_ceiling: EXTRACTION_CEILING_PCT,
          creator_minimum: CREATOR_MINIMUM_PCT,
        },
      });

      // Fire tripwire if critical
      let tripwireId = null;
      if (criticalCount > 0) {
        try {
          const tw = await db.entities.TripwireEvent.create({
            event_type: 'anomaly_detected',
            severity: 'critical',
            status: 'active',
            source_node: 'FairShareGuard',
            description: `Economic extraction audit: ${criticalCount} critical violations, max extraction ${maxExtraction}%, ${allViolations} total violations`,
            details: {
              max_extraction: maxExtraction,
              ceiling: EXTRACTION_CEILING_PCT,
              critical_signals: allSignals.filter(s => s.severity === 'critical'),
              total_violations: allViolations,
            },
            affected_entity_type: 'treasury',
          });
          tripwireId = tw.id;
        } catch (e) {
          console.warn('Tripwire creation failed:', e.message);
        }
      }

      return Response.json({
        success: true,
        result,
        extraction_ceiling: EXTRACTION_CEILING_PCT,
        creator_minimum: CREATOR_MINIMUM_PCT,
        max_extraction_detected: maxExtraction,
        flow_analysis: analysedFlows,
        widget_scan: {
          total: widgetScan.total,
          compliant: widgetScan.compliant,
          violations: widgetScan.violations,
        },
        transaction_scan: {
          sampled: txScan.sampled,
          compliant: txScan.compliant,
          violating: txScan.violating,
        },
        risk_signals: allSignals,
        recommendations,
        total_violations: allViolations,
        tripwire_fired: !!tripwireId,
        tripwire_event_id: tripwireId,
        audit_record_id: auditRecord.id,
      });
    }

    // ─── CHECK ── Validate a split before execution ───
    if (action === 'check') {
      const { amount, creator_pct, treasury_pct, referral_pct } = body;
      if (!amount || amount <= 0) {
        return Response.json({ error: 'Positive amount required' }, { status: 400 });
      }

      const platformCut = (treasury_pct || 0) + (referral_pct || 0);
      const creatorCut = creator_pct || (100 - platformCut);
      const isCompliant = platformCut <= EXTRACTION_CEILING_PCT && creatorCut >= CREATOR_MINIMUM_PCT;

      return Response.json({
        compliant: isCompliant,
        platform_cut_pct: platformCut,
        creator_cut_pct: creatorCut,
        ceiling: EXTRACTION_CEILING_PCT,
        creator_minimum: CREATOR_MINIMUM_PCT,
        verdict: isCompliant
          ? `PASS: Platform ${platformCut}% ≤ ${EXTRACTION_CEILING_PCT}% ceiling`
          : `BLOCKED: Platform ${platformCut}% exceeds ${EXTRACTION_CEILING_PCT}% ceiling — transaction would be rejected`,
        amounts: {
          total: amount,
          creator_receives: Math.round(amount * (creatorCut / 100) * 100) / 100,
          platform_receives: Math.round(amount * (platformCut / 100) * 100) / 100,
        },
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[fairShareGuard]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});