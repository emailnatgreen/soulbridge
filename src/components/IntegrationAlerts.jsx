import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';

export default function IntegrationAlerts({ settings, usagePercent, usageLogs }) {
  const alerts = [];

  if (usagePercent >= settings.critical_threshold_percent) {
    alerts.push({
      type: 'critical',
      icon: AlertCircle,
      title: 'CRITICAL: Budget Nearly Exhausted',
      message: `You have used ${usagePercent}% of your monthly budget (${settings.critical_threshold_percent}% threshold).`,
      color: 'bg-red-500/10 border-red-500/30 text-red-300'
    });
  } else if (usagePercent >= settings.alert_threshold_percent) {
    alerts.push({
      type: 'warning',
      icon: AlertTriangle,
      title: 'Warning: Budget Approaching Limit',
      message: `You have used ${usagePercent}% of your monthly budget (${settings.alert_threshold_percent}% threshold).`,
      color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
    });
  } else {
    alerts.push({
      type: 'success',
      icon: CheckCircle,
      title: 'Budget Status: Healthy',
      message: `You have used ${usagePercent}% of your monthly budget. No action needed.`,
      color: 'bg-green-500/10 border-green-500/30 text-green-300'
    });
  }

  // Check for high-cost services
  const serviceCosts = usageLogs.reduce((acc, log) => {
    const existing = acc.find(item => item.name === log.service_name);
    if (existing) {
      existing.credits += log.credits_consumed;
      existing.count += 1;
    } else {
      acc.push({ name: log.service_name || 'Unknown', credits: log.credits_consumed, count: 1 });
    }
    return acc;
  }, []).sort((a, b) => b.credits - a.credits);

  const topService = serviceCosts[0];
  if (topService && topService.credits > (settings.monthly_budget_credits * 0.3)) {
    alerts.push({
      type: 'info',
      icon: AlertTriangle,
      title: 'High-Cost Service Alert',
      message: `"${topService.name}" is consuming ${topService.credits} credits (${((topService.credits / (settings.monthly_budget_credits || 1000)) * 100).toFixed(1)}% of budget).`,
      color: 'bg-orange-500/10 border-orange-500/30 text-orange-300'
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 mb-8">
      {alerts.map((alert, idx) => {
        const Icon = alert.icon;
        return (
          <Card key={idx} className={`border ${alert.color.split(' ').find(c => c.includes('border'))}`}>
            <div className={`p-4 flex items-start gap-3 ${alert.color.split(' ').filter(c => !c.includes('border')).join(' ')}`}>
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">{alert.title}</h3>
                <p className="text-xs opacity-90 mt-1">{alert.message}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}