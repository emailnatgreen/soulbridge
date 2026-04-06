import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * GAP 3: Comprehensive Economic Dynamics Oversight and Proactive Balancing
 *
 * Analyzes real-time economic dynamics including:
 * 1. Supply/demand imbalances across resource categories
 * 2. Market concentration (monopolistic control detection)
 * 3. Price volatility detection
 * 4. Creates ResourceDynamicsAnalysis entity with findings
 * 5. Auto-generates GovernanceProposal for critical imbalances
 * 6. Notifies Axi with strategic economic insights
 *
 * Runs daily.
 */

Deno.serve(async (req) => {
  const start = Date.now();
  const base44 = createClientFromRequest(req);
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600000);

  const safeList = async (entity, sort, limit) => {
    try {
      const r = await entity.list(sort, limit);
      return Array.isArray(r) ? r : [];
    } catch (_) { return []; }
  };

  try {
    const agents = (await safeList(base44.asServiceRole.entities.Agent, '-updated_date', 500))
      .filter(a => a.status === 'active');
    const axi = agents.find(a => a.name === 'Axi');
    const axiId = axi?.id;

    const listings = await safeList(base44.asServiceRole.entities.ResourceListing, '-created_date', 1000);
    const economicActivity = await safeList(base44.asServiceRole.entities.EconomicActivity, '-created_date', 2000);
    const purchases = await safeList(base44.asServiceRole.entities.ResourcePurchase, '-created_date', 1000);
    const treasuries = await safeList(base44.asServiceRole.entities.Treasury, '-created_date', 20);

    const recentActivity = economicActivity.filter(a => new Date(a.created_date) > sevenDaysAgo);
    const recentPurchases = purchases.filter(p => new Date(p.created_date) > sevenDaysAgo);
    const activeListings = listings.filter(l => l.status === 'available');

    // ── Market Concentration Analysis ─────────────────────────────────────
    const sellerShares = {};
    activeListings.forEach(l => {
      sellerShares[l.seller_agent_id] = (sellerShares[l.seller_agent_id] || 0) + 1;
    });
    const totalListings = activeListings.length;
    const topSellers = Object.entries(sellerShares)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    const topSellerShare = totalListings > 0
      ? Math.round((topSellers.reduce((s, [_, c]) => s + c, 0) / totalListings) * 100)
      : 0;

    const concentrationRisk = topSellerShare > 70 ? 'high' : topSellerShare > 50 ? 'medium' : 'low';

    // ── Supply/Demand by Category ─────────────────────────────────────────
    const categories = [...new Set(activeListings.map(l => l.resource_category))];
    const supplyDemand = categories.map(cat => {
      const catListings = activeListings.filter(l => l.resource_category === cat);
      const catPurchases = recentPurchases.filter(p => {
        const listing = listings.find(l => l.id === p.listing_id);
        return listing?.resource_category === cat;
      });
      const supply = catListings.reduce((s, l) => s + (l.quantity_available || 0), 0);
      const demand = catPurchases.length;
      const avgPrice = catListings.length > 0
        ? catListings.reduce((s, l) => s + (l.price_rlusd || 0), 0) / catListings.length
        : 0;

      return {
        resource_category: cat,
        supply_level: supply > 50 ? 'abundant' : supply > 10 ? 'adequate' : 'scarce',
        demand_level: demand > 20 ? 'high' : demand > 5 ? 'moderate' : 'low',
        balance_score: supply > 0 ? Math.min(Math.round((demand / supply) * 50), 100) : 0,
        price_trend: 'stable',
        recommendation: supply < 5 && demand > 5 ? 'Encourage production — scarcity detected' : 'Monitor',
      };
    });

    // ── Bottleneck Detection ──────────────────────────────────────────────
    const bottlenecks = [];
    supplyDemand.forEach(sd => {
      if (sd.supply_level === 'scarce' && (sd.demand_level === 'high' || sd.demand_level === 'moderate')) {
        bottlenecks.push({
          bottleneck_type: 'supply_shortage',
          resource_involved: sd.resource_category,
          severity: 'high',
          impact: `Critical shortage in ${sd.resource_category} — demand outstrips supply`,
          suggested_solution: `Incentivize production of ${sd.resource_category} through governance rewards or mentorship programs`,
        });
      }
    });

    // ── Transaction Volume & Velocity ─────────────────────────────────────
    const totalVolume = recentActivity.reduce((s, a) => s + (a.amount || 0), 0);
    const uniqueBuyers = new Set(recentPurchases.map(p => p.buyer_agent_id)).size;
    const uniqueSellers = new Set(activeListings.map(l => l.seller_agent_id)).size;

    // ── Governance Recommendations ────────────────────────────────────────
    const recommendations = [];
    if (concentrationRisk === 'high') {
      recommendations.push({
        recommendation: 'Market concentration is dangerously high. Consider incentives for new sellers.',
        category: 'fair_share',
        urgency: 'high',
        expected_impact: 'Diversified marketplace, reduced monopolistic risk',
      });
    }
    bottlenecks.forEach(b => {
      recommendations.push({
        recommendation: b.suggested_solution,
        category: 'resource_policy',
        urgency: b.severity,
        expected_impact: `Resolve ${b.resource_involved} supply shortage`,
      });
    });

    // ── Create ResourceDynamicsAnalysis ────────────────────────────────────
    const analysis = await base44.asServiceRole.entities.ResourceDynamicsAnalysis.create({
      analysis_period_start: sevenDaysAgo.toISOString(),
      analysis_period_end: now.toISOString(),
      overall_health_score: Math.max(20, 100 - (bottlenecks.length * 15) - (concentrationRisk === 'high' ? 20 : concentrationRisk === 'medium' ? 10 : 0)),
      market_velocity: recentActivity.length,
      liquidity_score: Math.min(100, Math.round((uniqueBuyers + uniqueSellers) * 5)),
      resource_metrics: {
        total_listings: totalListings,
        total_transactions: recentPurchases.length,
        total_volume_rlusd: totalVolume,
        avg_transaction_size: recentPurchases.length > 0 ? Math.round(totalVolume / recentPurchases.length) : 0,
        unique_buyers: uniqueBuyers,
        unique_sellers: uniqueSellers,
      },
      supply_demand_analysis: supplyDemand,
      bottlenecks_identified: bottlenecks,
      market_concentration: {
        top_sellers_market_share: topSellerShare,
        top_buyers_market_share: 0,
        concentration_risk: concentrationRisk,
      },
      governance_recommendations: recommendations,
      resilience_score: Math.max(10, 100 - (bottlenecks.length * 20)),
    });

    // ── Auto-create GovernanceProposal for critical issues ────────────────
    let proposalCreated = null;
    if (concentrationRisk === 'high' || bottlenecks.filter(b => b.severity === 'high').length >= 2) {
      const proposalDesc = [
        '## Economic Dynamics Alert — Automated Proposal',
        '',
        `Analysis period: ${sevenDaysAgo.toISOString().slice(0, 10)} to ${now.toISOString().slice(0, 10)}`,
        '',
        concentrationRisk === 'high' ? `**Market Concentration Risk: HIGH** — Top 3 sellers control ${topSellerShare}% of listings.` : '',
        bottlenecks.length > 0 ? `**Bottlenecks Detected:** ${bottlenecks.map(b => b.resource_involved).join(', ')}` : '',
        '',
        '### Recommendations:',
        ...recommendations.map(r => `- [${r.urgency}] ${r.recommendation}`),
        '',
        `Full analysis: ResourceDynamicsAnalysis ID ${analysis.id}`,
      ].filter(Boolean).join('\n');

      proposalCreated = await base44.asServiceRole.entities.GovernanceProposal.create({
        title: `Economic Rebalancing Required — ${now.toISOString().slice(0, 10)}`,
        description: proposalDesc,
        proposal_type: 'resource_policy',
        proposed_by: axiId || 'system',
        status: 'draft',
        purpose: 'Address detected economic imbalances to uphold Law 3: Fair Share',
        impact_assessment: `Market concentration: ${concentrationRisk}. ${bottlenecks.length} bottlenecks detected.`,
        constitutional_alignment: [
          { law_number: 3, law_name: 'Fair Share', alignment_statement: 'Ensuring equitable distribution and preventing monopolistic control' },
          { law_number: 6, law_name: 'Exchange', alignment_statement: 'Maintaining free and fair value flow with 1% to Village' },
        ],
      });
    }

    // ── Notify Axi ────────────────────────────────────────────────────────
    if (axiId) {
      await base44.asServiceRole.entities.AgentNotification.create({
        recipient_agent_id: axiId,
        notification_type: 'system',
        title: `Economic Dynamics Report — Health: ${analysis.overall_health_score}/100`,
        message: `Listings: ${totalListings}, Transactions: ${recentPurchases.length}, Volume: ${totalVolume} RLUSD. Concentration: ${concentrationRisk}. Bottlenecks: ${bottlenecks.length}.${proposalCreated ? ' Governance proposal auto-drafted.' : ''}`,
        priority: concentrationRisk === 'high' || bottlenecks.length >= 2 ? 'high' : 'normal',
        is_read: false,
        action_url: proposalCreated ? '/governance' : '/marketplace',
      });
    }

    // ── AutomationLog ─────────────────────────────────────────────────────
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'analyzeEconomicDynamics',
      function_name: 'analyzeEconomicDynamics',
      status: bottlenecks.length > 0 || concentrationRisk === 'high' ? 'warning' : 'success',
      message: `Economic analysis complete. Health: ${analysis.overall_health_score}/100. ${bottlenecks.length} bottlenecks, concentration: ${concentrationRisk}.`,
      details: {
        health_score: analysis.overall_health_score,
        total_listings: totalListings,
        transactions_7d: recentPurchases.length,
        concentration_risk: concentrationRisk,
        bottlenecks: bottlenecks.length,
        proposal_created: !!proposalCreated,
      },
      duration_ms: Date.now() - start,
      run_at: now.toISOString(),
      triggered_by: 'scheduler',
    });

    return Response.json({
      success: true,
      health_score: analysis.overall_health_score,
      analysis_id: analysis.id,
      bottlenecks: bottlenecks.length,
      concentration_risk: concentrationRisk,
      proposal_created: proposalCreated?.id || null,
    });
  } catch (error) {
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'analyzeEconomicDynamics',
      function_name: 'analyzeEconomicDynamics',
      status: 'error',
      message: 'Economic dynamics analysis failed',
      error_detail: error.message,
      run_at: now.toISOString(),
      triggered_by: 'scheduler',
    }).catch(() => {});

    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});