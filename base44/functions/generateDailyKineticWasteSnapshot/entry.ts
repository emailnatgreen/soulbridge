import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { differenceInHours } from 'npm:date-fns@3.6.0';

// Configurable carbon equivalent factors (grams CO2e per unit of waste)
const CARBON_FACTORS = {
  per_stalled_hour: 0.5,        // 1 hour locked in stalled task = 0.5g CO2e
  per_automation_error: 2.0,    // 1 failed automation run = 2g CO2e
  per_inefficient_chain: 5.0,   // 1 inefficient production chain = 5g CO2e/day
  per_critical_alert_24h: 3.0,  // 1 unaddressed critical alert 24h+ = 3g CO2e
  per_idle_resource: 0.1,       // 1 idle resource = 0.1g CO2e/day
  per_stagnant_listing: 0.2,    // 1 stagnant listing = 0.2g CO2e/day
};

const STALL_DAYS = 7;
const EFFICIENCY_THRESHOLD = 0.8;
const STAGNANT_DAYS = 30;
const IDLE_DAYS = 60;

function isStalled(task) {
  const now = new Date();
  const updatedAt = task.updated_date ? new Date(task.updated_date) : null;
  const daysSince = updatedAt ? (now - updatedAt) / (1000 * 60 * 60 * 24) : 999;
  if (task.status === 'blocked' && daysSince >= STALL_DAYS) return true;
  if (task.due_date && new Date(task.due_date) < now && ['todo', 'in_progress'].includes(task.status)) return true;
  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if snapshot already exists for today
    const existing = await base44.asServiceRole.entities.DailyKineticWasteSnapshot.filter(
      { snapshot_date: today }, '', 1
    ).catch(() => []);
    if (existing.length > 0) {
      return Response.json({ status: 'already_exists', snapshot_date: today, snapshot: existing[0] });
    }

    // Fetch all required data in parallel
    const [tasks, autoErrors, warnLogs, prodChains, wellbeingAlerts, resourceListings, resources] = await Promise.all([
      base44.asServiceRole.entities.ProjectTask.list('-updated_date', 500).catch(() => []),
      base44.asServiceRole.entities.AutomationLog.filter({ status: 'error' }, '-run_at', 500).catch(() => []),
      base44.asServiceRole.entities.AutomationLog.filter({ status: 'warning' }, '-run_at', 300).catch(() => []),
      base44.asServiceRole.entities.ProductionChain.list('-created_date', 300).catch(() => []),
      base44.asServiceRole.entities.WellbeingAlert.filter({ status: 'active' }, '-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.ResourceListing.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Resource.list('-created_date', 500).catch(() => []),
    ]);

    // ── 1. Stalled Tasks ──
    const stalledTasks = tasks.filter(isStalled);
    const stalledTasksCount = stalledTasks.length;
    const stalledHoursLocked = stalledTasks.reduce((s, t) => s + (t.estimated_hours || 0), 0);

    // ── 2. Automation Errors (last 24h) ──
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const allErrorLogs = [...autoErrors, ...warnLogs];
    const recentErrors = allErrorLogs.filter(l => l.run_at && new Date(l.run_at) >= cutoff24h);
    const automationErrorsCount = recentErrors.length;
    const uniqueAutoKeys = new Set(recentErrors.map(l => `${l.automation_name}__${l.function_name}`));
    const estimatedDowntimeHours = [...uniqueAutoKeys].reduce((total, key) => {
      const log = recentErrors.find(l => `${l.automation_name}__${l.function_name}` === key);
      return total + (log?.run_at ? Math.min(differenceInHours(new Date(), new Date(log.run_at)), 168) : 0);
    }, 0);

    // ── 3. Production Chain Waste ──
    const inefficientChains = prodChains.filter(c =>
      (c.efficiency != null && c.efficiency < EFFICIENCY_THRESHOLD) || c.status === 'insufficient_resources'
    );
    const inefficientChainsCount = inefficientChains.length;
    const resourcesLost = inefficientChains.reduce((s, c) => s + (c.total_produced || 0) * (1 - (c.efficiency ?? 1)), 0);
    const potentialOutputGain = inefficientChains.reduce((s, c) => {
      const eff = c.efficiency ?? 1;
      return eff > 0 ? s + (c.total_produced || 0) * ((1 / eff) - 1) : s;
    }, 0);

    // ── 4. Wellbeing Alert Waste ──
    const criticalAlerts = wellbeingAlerts.filter(a => a.severity === 'critical');
    const highOrCritical = wellbeingAlerts.filter(a => ['high', 'critical'].includes(a.severity));
    const criticalAlertsCount = criticalAlerts.length;
    const agentsAtRisk = new Set(highOrCritical.map(a => a.agent_id)).size;

    // ── 5. Resource & Marketplace Waste ──
    const stagnantCutoff = new Date(Date.now() - STAGNANT_DAYS * 24 * 60 * 60 * 1000);
    const idleCutoff = new Date(Date.now() - IDLE_DAYS * 24 * 60 * 60 * 1000);
    const stagnantListings = resourceListings.filter(l =>
      (!l.total_sales || l.total_sales === 0) || (l.updated_date && new Date(l.updated_date) < stagnantCutoff)
    );
    const idleResources = resources.filter(r =>
      r.is_tradeable && r.owner_agent_id && (!r.updated_date || new Date(r.updated_date) < idleCutoff)
    );
    const unprofitableChains = prodChains.filter(c => c.efficiency != null && c.efficiency < 0.5);
    const stagnantListingsCount = stagnantListings.length;
    const idleResourceValueXrp = idleResources.reduce((s, r) => s + (r.xrp_value || 0) * (r.quantity || 1), 0);
    const unprofitableChainsCount = unprofitableChains.length;

    // ── Carbon Waste Calculation ──
    const critUnack24h = criticalAlerts.filter(a =>
      !a.acknowledged_at && a.created_date && differenceInHours(new Date(), new Date(a.created_date)) >= 24
    ).length;

    const carbonWasteGrams =
      (stalledHoursLocked * CARBON_FACTORS.per_stalled_hour) +
      (automationErrorsCount * CARBON_FACTORS.per_automation_error) +
      (inefficientChainsCount * CARBON_FACTORS.per_inefficient_chain) +
      (critUnack24h * CARBON_FACTORS.per_critical_alert_24h) +
      (stagnantListingsCount * CARBON_FACTORS.per_stagnant_listing) +
      (idleResources.length * CARBON_FACTORS.per_idle_resource);

    // ── Carbon Saved (vs previous day snapshot) ──
    const prevSnapshots = await base44.asServiceRole.entities.DailyKineticWasteSnapshot.list('-snapshot_date', 1).catch(() => []);
    let carbonSavedGrams = 0;
    if (prevSnapshots.length > 0) {
      const prev = prevSnapshots[0];
      const prevCarbon = prev.carbon_waste_grams || 0;
      carbonSavedGrams = Math.max(0, prevCarbon - carbonWasteGrams);
    }

    // ── Save Snapshot ──
    const snapshot = await base44.asServiceRole.entities.DailyKineticWasteSnapshot.create({
      snapshot_date: today,
      stalled_tasks_count: stalledTasksCount,
      stalled_hours_locked: Math.round(stalledHoursLocked * 10) / 10,
      automation_errors_count: automationErrorsCount,
      estimated_downtime_hours: Math.round(estimatedDowntimeHours * 10) / 10,
      inefficient_chains_count: inefficientChainsCount,
      resources_lost: Math.round(resourcesLost * 10) / 10,
      potential_output_gain: Math.round(potentialOutputGain * 10) / 10,
      critical_alerts_count: criticalAlertsCount,
      agents_at_risk: agentsAtRisk,
      stagnant_listings_count: stagnantListingsCount,
      idle_resource_value_xrp: Math.round(idleResourceValueXrp * 100) / 100,
      unprofitable_chains_count: unprofitableChainsCount,
      carbon_waste_grams: Math.round(carbonWasteGrams * 100) / 100,
      carbon_saved_grams: Math.round(carbonSavedGrams * 100) / 100,
      carbon_factors: CARBON_FACTORS,
    });

    return Response.json({
      status: 'success',
      snapshot_date: today,
      snapshot,
      summary: {
        stalled_tasks: stalledTasksCount,
        automation_errors: automationErrorsCount,
        inefficient_chains: inefficientChainsCount,
        critical_alerts: criticalAlertsCount,
        stagnant_listings: stagnantListingsCount,
        carbon_waste_grams: Math.round(carbonWasteGrams * 100) / 100,
        carbon_saved_grams: Math.round(carbonSavedGrams * 100) / 100,
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});