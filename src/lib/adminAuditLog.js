import { base44 } from '@/api/base44Client';

/**
 * Log an admin action to AutomationLog for transparency and accountability.
 * Law 2: Honour — every admin action must be indelibly recorded.
 */
export async function logAdminAction({ action, target_entity, target_id, details, admin_agent_id }) {
  try {
    await base44.entities.AutomationLog.create({
      automation_name: `admin_${action}`,
      status: 'completed',
      message: `Admin action: ${action} on ${target_entity}${target_id ? ` (${target_id})` : ''}`,
      details: JSON.stringify({
        action,
        target_entity,
        target_id,
        details,
        admin_agent_id,
        timestamp: new Date().toISOString(),
        triggered_by: 'admin_override',
      }),
    });
  } catch (e) {
    console.error('Failed to write audit log:', e);
  }
}