import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle,
  Shield,
  Activity,
  MapPin,
  Clock,
  Eye,
  MessageCircle,
  UserX,
  TrendingUp,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function PrivacyAlerts({ myDid }) {
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['privacy-alerts-logs', myDid],
    queryFn: () => base44.entities.DidAuditLog.filter({
      did_classic_address: myDid
    }),
    enabled: !!myDid,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['privacy-alerts-messages', myDid],
    queryFn: () => base44.entities.DidMessage.filter({
      to_did: `did:xrpl:${myDid}`
    }),
    enabled: !!myDid
  });

  const { data: privacySettings } = useQuery({
    queryKey: ['privacy-alerts-settings', myDid],
    queryFn: async () => {
      const settings = await base44.entities.DidPrivacySetting.filter({
        did_address: myDid
      });
      return settings[0] || null;
    },
    enabled: !!myDid
  });

  // Detect anomalies
  const detectAnomalies = () => {
    const alerts = [];
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last1h = new Date(now.getTime() - 60 * 60 * 1000);

    const recentLogs = auditLogs.filter(log => 
      new Date(log.created_date) > last24h
    );

    const veryRecentLogs = auditLogs.filter(log =>
      new Date(log.created_date) > last1h
    );

    // 1. Multiple failed access attempts
    const failedAccess = recentLogs.filter(log => !log.success);
    if (failedAccess.length >= 5) {
      alerts.push({
        id: 'failed-access',
        severity: 'high',
        type: 'Failed Access Attempts',
        message: `${failedAccess.length} failed access attempts in the last 24 hours`,
        count: failedAccess.length,
        timestamp: failedAccess[0]?.created_date,
        icon: XCircle,
        color: 'red'
      });
    }

    // 2. Unusual access pattern (too many views in short time)
    const viewLogs = veryRecentLogs.filter(log => 
      log.action_type === 'did_document_viewed'
    );
    if (viewLogs.length >= 10) {
      alerts.push({
        id: 'unusual-views',
        severity: 'medium',
        type: 'Unusual Activity',
        message: `${viewLogs.length} profile views in the last hour`,
        count: viewLogs.length,
        timestamp: viewLogs[0]?.created_date,
        icon: Eye,
        color: 'orange'
      });
    }

    // 3. Access from multiple IPs
    const uniqueIPs = [...new Set(recentLogs.map(log => log.ip_address))].filter(Boolean);
    if (uniqueIPs.length >= 8) {
      alerts.push({
        id: 'multiple-ips',
        severity: 'medium',
        type: 'Multiple Locations',
        message: `Access from ${uniqueIPs.length} different IP addresses`,
        count: uniqueIPs.length,
        timestamp: recentLogs[0]?.created_date,
        icon: MapPin,
        color: 'yellow'
      });
    }

    // 4. Messages from blocked DIDs (if we have blocked list)
    if (privacySettings?.blocked_dids?.length > 0) {
      const blockedMessages = messages.filter(msg => 
        privacySettings.blocked_dids.includes(msg.from_did) &&
        new Date(msg.created_date) > last24h
      );
      if (blockedMessages.length > 0) {
        alerts.push({
          id: 'blocked-sender',
          severity: 'high',
          type: 'Blocked Sender Attempt',
          message: `${blockedMessages.length} message(s) from blocked DIDs`,
          count: blockedMessages.length,
          timestamp: blockedMessages[0]?.created_date,
          icon: UserX,
          color: 'red'
        });
      }
    }

    // 5. Rapid successive actions from same user
    const userActions = {};
    recentLogs.forEach(log => {
      if (log.user_email) {
        userActions[log.user_email] = (userActions[log.user_email] || 0) + 1;
      }
    });
    const suspiciousUsers = Object.entries(userActions).filter(([_, count]) => count >= 20);
    if (suspiciousUsers.length > 0) {
      const [email, count] = suspiciousUsers[0];
      alerts.push({
        id: 'rapid-actions',
        severity: 'medium',
        type: 'Suspicious Behavior',
        message: `${count} actions from ${email} in 24h`,
        count,
        timestamp: recentLogs.find(l => l.user_email === email)?.created_date,
        icon: Activity,
        color: 'orange'
      });
    }

    // 6. Privacy setting changed recently
    const recentChanges = recentLogs.filter(log => 
      log.action_type === 'privacy_settings_updated' &&
      new Date(log.created_date) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    );
    if (recentChanges.length > 0) {
      alerts.push({
        id: 'settings-changed',
        severity: 'low',
        type: 'Settings Updated',
        message: 'Privacy settings were recently modified',
        count: recentChanges.length,
        timestamp: recentChanges[0]?.created_date,
        icon: Shield,
        color: 'blue'
      });
    }

    return alerts.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  };

  const alerts = detectAnomalies();
  const highSeverityCount = alerts.filter(a => a.severity === 'high').length;
  const mediumSeverityCount = alerts.filter(a => a.severity === 'medium').length;

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getIconColor = (color) => {
    switch (color) {
      case 'red': return 'text-red-600';
      case 'orange': return 'text-orange-600';
      case 'yellow': return 'text-yellow-600';
      case 'blue': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{highSeverityCount}</div>
              <div className="text-sm text-gray-600">High Priority</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Activity className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{mediumSeverityCount}</div>
              <div className="text-sm text-gray-600">Medium Priority</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{alerts.length === 0 ? '✓' : alerts.length}</div>
              <div className="text-sm text-gray-600">Total Alerts</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            Security Alerts
          </CardTitle>
          <CardDescription>
            Automatic detection of suspicious activity and potential threats
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">All Clear</h3>
              <p className="text-gray-600">No security alerts detected in the last 24 hours</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const Icon = alert.icon;
                
                return (
                  <div 
                    key={alert.id} 
                    className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Icon className={`w-6 h-6 mt-0.5 ${getIconColor(alert.color)}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{alert.type}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs uppercase ${
                                alert.severity === 'high' ? 'border-red-500 text-red-700' : 
                                alert.severity === 'medium' ? 'border-orange-500 text-orange-700' : 
                                'border-blue-500 text-blue-700'
                              }`}
                            >
                              {alert.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700">{alert.message}</p>
                          {alert.timestamp && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                              <Clock className="w-3 h-3" />
                              {new Date(alert.timestamp).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                      {alert.severity === 'high' && (
                        <Button size="sm" variant="outline" className="ml-2">
                          Investigate
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {alerts.some(a => a.severity === 'high') && (
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="w-5 h-5" />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-red-900">
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">•</span>
                Review your privacy settings and consider restricting access
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">•</span>
                Update your blocked DIDs list to prevent unwanted contact
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">•</span>
                Enable "Require Verification for Messages" in preferences
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">•</span>
                Consider using temporary access grants instead of public visibility
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}