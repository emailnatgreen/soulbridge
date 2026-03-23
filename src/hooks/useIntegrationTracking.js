import { base44 } from '@/api/base44Client';

export async function trackIntegrationUsage(params) {
  try {
    const response = await base44.functions.invoke('trackIntegrationUsage', params);
    return response?.data || {};
  } catch (error) {
    console.error('Failed to track integration usage:', error);
    return { error: error.message };
  }
}

export function createIntegrationTracker(serviceName, integrationType = 'other') {
  return {
    async track(credits, options = {}) {
      const startTime = Date.now();
      return trackIntegrationUsage({
        service_name: serviceName,
        integration_type: integrationType,
        credits_consumed: credits,
        triggered_by: options.triggeredBy || 'user_action',
        function_name: options.functionName,
        model_used: options.modelUsed,
        response_time_ms: options.responseTimeMs || (Date.now() - startTime),
        success: options.success !== false,
        error_message: options.errorMessage,
        metadata: options.metadata,
        cost_estimate_usd: options.costEstimate
      });
    }
  };
}