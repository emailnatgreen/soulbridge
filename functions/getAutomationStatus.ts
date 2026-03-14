import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const { automation_name, function_name, limit = 20 } = await req.json();

        // Build filter
        const filter = {};
        if (automation_name) filter.automation_name = automation_name;
        if (function_name) filter.function_name = function_name;

        // Fetch recent logs
        const logs = await base44.asServiceRole.entities.AutomationLog.filter(
            Object.keys(filter).length > 0 ? filter : {},
            '-run_at',
            limit
        );

        if (!logs || logs.length === 0) {
            return Response.json({
                message: 'No logs found for the given filter.',
                filter_used: filter,
                logs: [],
                summary: null
            });
        }

        // Build summary stats
        const total = logs.length;
        const successCount = logs.filter(l => l.status === 'success').length;
        const errorCount = logs.filter(l => l.status === 'error').length;
        const warningCount = logs.filter(l => l.status === 'warning').length;
        const successRate = Math.round((successCount / total) * 100);

        const lastRun = logs[0];
        const lastError = logs.find(l => l.status === 'error');

        // Group by automation_name for multi-automation overview
        const byAutomation = {};
        for (const log of logs) {
            if (!byAutomation[log.automation_name]) {
                byAutomation[log.automation_name] = { runs: 0, errors: 0, last_status: null, last_run_at: null };
            }
            byAutomation[log.automation_name].runs++;
            if (log.status === 'error') byAutomation[log.automation_name].errors++;
            if (!byAutomation[log.automation_name].last_run_at) {
                byAutomation[log.automation_name].last_status = log.status;
                byAutomation[log.automation_name].last_run_at = log.run_at;
                byAutomation[log.automation_name].last_message = log.message;
                byAutomation[log.automation_name].last_error_detail = log.error_detail || null;
            }
        }

        return Response.json({
            summary: {
                total_runs: total,
                success_count: successCount,
                error_count: errorCount,
                warning_count: warningCount,
                success_rate_percent: successRate,
                last_run_at: lastRun.run_at,
                last_run_status: lastRun.status,
                last_run_message: lastRun.message,
                last_error: lastError ? {
                    run_at: lastError.run_at,
                    automation_name: lastError.automation_name,
                    message: lastError.message,
                    error_detail: lastError.error_detail
                } : null
            },
            by_automation: byAutomation,
            recent_logs: logs.map(l => ({
                run_at: l.run_at,
                automation_name: l.automation_name,
                function_name: l.function_name,
                status: l.status,
                message: l.message,
                error_detail: l.error_detail || null,
                duration_ms: l.duration_ms || null,
                details: l.details || null,
                triggered_by: l.triggered_by
            }))
        });

    } catch (error) {
        console.error('getAutomationStatus error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});