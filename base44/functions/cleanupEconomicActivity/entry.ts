import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * cleanupEconomicActivity
 * Admin-only function to fix mixed-unit EconomicActivity records.
 * 
 * Problem: Old processTaskCompletionRewards wrote reward_drops values 
 * directly into the XRP amount field without converting (÷ 1,000,000).
 * This inflated the economic volume by ~99.97%.
 *
 * Actions:
 * 1. Identify records with amount >= threshold that appear to be drops (not XRP)
 * 2. Convert them to XRP (÷ 1,000,000)
 * 3. Remove duplicate records (same resource_id + agent_id + activity_type within 1 second)
 * 4. Report findings
 *
 * Params:
 *   dry_run: boolean (default true) — if true, only reports what would change
 *   threshold: number (default 10000) — amounts >= this are assumed to be drops
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const dryRun = body.dry_run !== false; // default true
        const threshold = body.threshold || 10000;

        // Fetch all economic activities (paginated)
        const allActivities = [];
        let batch = await base44.asServiceRole.entities.EconomicActivity.list('-created_date', 50);
        allActivities.push(...batch);
        
        // Fetch more batches
        for (let i = 1; i < 10 && batch.length === 50; i++) {
            batch = await base44.asServiceRole.entities.EconomicActivity.list('-created_date', 50, i * 50);
            allActivities.push(...batch);
        }

        console.log(`Fetched ${allActivities.length} EconomicActivity records`);

        // --- Phase 1: Identify records that need unit conversion ---
        const needsConversion = allActivities.filter(a => {
            const amount = a.amount || 0;
            if (amount < threshold) return false;
            // Extra validation: check if description mentions drops or task completion
            const desc = (a.description || '').toLowerCase();
            const isTaskRelated = desc.includes('completed task') || 
                                  desc.includes('service charge from task') ||
                                  a.resource_id?.startsWith?.('69'); // entity ID format
            return isTaskRelated;
        });

        // --- Phase 2: Identify duplicates ---
        // Group by (resource_id + agent_id + activity_type)
        const groups = {};
        allActivities.forEach(a => {
            if (!a.resource_id) return;
            const key = `${a.resource_id}_${a.agent_id}_${a.activity_type}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(a);
        });

        const duplicatesToDelete = [];
        Object.entries(groups).forEach(([key, records]) => {
            if (records.length <= 1) return;
            // Sort by created_date, keep the first, mark rest as duplicates
            records.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
            // Check if they were created within 60 seconds of each other
            const first = records[0];
            for (let i = 1; i < records.length; i++) {
                const timeDiff = Math.abs(new Date(records[i].created_date) - new Date(first.created_date));
                if (timeDiff < 60000) { // within 60 seconds = duplicate
                    duplicatesToDelete.push(records[i]);
                }
            }
        });

        // --- Phase 3: Apply fixes ---
        const conversionResults = [];
        const deletionResults = [];

        if (!dryRun) {
            // Apply conversions
            for (const record of needsConversion) {
                const oldAmount = record.amount;
                const newAmount = oldAmount / 1_000_000;
                await base44.asServiceRole.entities.EconomicActivity.update(record.id, {
                    amount: newAmount,
                    description: record.description + ` [CORRECTED: was ${oldAmount} drops, now ${newAmount.toFixed(6)} XRP]`
                });
                conversionResults.push({
                    id: record.id,
                    old_amount: oldAmount,
                    new_amount: newAmount,
                    description: record.description?.slice(0, 80)
                });
            }

            // Delete duplicates
            for (const dup of duplicatesToDelete) {
                await base44.asServiceRole.entities.EconomicActivity.delete(dup.id);
                deletionResults.push({
                    id: dup.id,
                    amount: dup.amount,
                    description: dup.description?.slice(0, 80)
                });
            }
        }

        // --- Calculate impact ---
        const currentTotal = allActivities.reduce((s, a) => s + (a.amount || 0), 0);
        
        const phantomVolume = needsConversion.reduce((s, a) => s + (a.amount || 0), 0);
        const correctedVolume = needsConversion.reduce((s, a) => s + ((a.amount || 0) / 1_000_000), 0);
        const duplicateVolume = duplicatesToDelete.reduce((s, a) => s + (a.amount || 0), 0);

        const projectedTotal = currentTotal - phantomVolume + correctedVolume - duplicateVolume;

        return Response.json({
            dry_run: dryRun,
            total_records_scanned: allActivities.length,
            current_total_volume: currentTotal,
            
            // Conversion findings
            records_needing_conversion: needsConversion.length,
            phantom_volume_from_drops: phantomVolume,
            corrected_volume_after_conversion: correctedVolume,
            conversion_details: needsConversion.map(r => ({
                id: r.id,
                current_amount: r.amount,
                would_become: (r.amount / 1_000_000).toFixed(6),
                agent_id: r.agent_id,
                type: r.activity_type,
                desc: r.description?.slice(0, 100),
                created: r.created_date
            })),

            // Duplicate findings
            duplicate_records_found: duplicatesToDelete.length,
            duplicate_volume: duplicateVolume,
            duplicate_details: duplicatesToDelete.map(d => ({
                id: d.id,
                amount: d.amount,
                type: d.activity_type,
                desc: d.description?.slice(0, 100),
                created: d.created_date
            })),

            // Projected outcome
            projected_total_after_cleanup: projectedTotal,
            volume_reduction_percentage: ((1 - projectedTotal / currentTotal) * 100).toFixed(2) + '%',

            // Actions taken (only if not dry run)
            conversions_applied: conversionResults.length,
            deletions_applied: deletionResults.length,

            message: dryRun 
                ? `DRY RUN: Found ${needsConversion.length} records to convert and ${duplicatesToDelete.length} duplicates to remove. Re-run with dry_run=false to apply.`
                : `APPLIED: Converted ${conversionResults.length} records and deleted ${deletionResults.length} duplicates. Volume reduced from ${currentTotal.toFixed(2)} to ${projectedTotal.toFixed(6)}.`
        });

    } catch (error) {
        console.error('cleanupEconomicActivity error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});