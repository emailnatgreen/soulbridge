import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { did_address } = await req.json();

    if (!did_address) {
      return Response.json({ error: 'did_address is required' }, { status: 400 });
    }

    // Fetch audit logs for analysis
    const auditLogs = await base44.asServiceRole.entities.DidAuditLog.filter({
      did_classic_address: did_address
    });

    // Fetch messages
    const messages = await base44.asServiceRole.entities.DidMessage.filter({
      to_did: `did:xrpl:${did_address}`
    });

    // Fetch privacy settings
    const privacySettings = await base44.asServiceRole.entities.DidPrivacySetting.filter({
      did_address
    });
    const settings = privacySettings[0] || null;

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last1h = new Date(now.getTime() - 60 * 60 * 1000);

    const recentLogs = auditLogs.filter(log => 
      new Date(log.created_date) > last24h
    );

    const veryRecentLogs = auditLogs.filter(log =>
      new Date(log.created_date) > last1h
    );

    const breaches = [];

    // Detection 1: Brute force attempts
    const failedAccess = recentLogs.filter(log => !log.success);
    const failedByIP = {};
    failedAccess.forEach(log => {
      if (log.ip_address) {
        failedByIP[log.ip_address] = (failedByIP[log.ip_address] || 0) + 1;
      }
    });

    Object.entries(failedByIP).forEach(([ip, count]) => {
      if (count >= 10) {
        breaches.push({
          type: 'brute_force',
          severity: 'critical',
          ip_address: ip,
          count,
          message: `${count} failed access attempts from ${ip}`,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Detection 2: Scraping behavior
    const viewsByUser = {};
    veryRecentLogs
      .filter(log => log.action_type === 'did_document_viewed')
      .forEach(log => {
        const key = log.user_email || log.ip_address;
        if (key) {
          viewsByUser[key] = (viewsByUser[key] || 0) + 1;
        }
      });

    Object.entries(viewsByUser).forEach(([user, count]) => {
      if (count >= 15) {
        breaches.push({
          type: 'scraping',
          severity: 'high',
          user,
          count,
          message: `Potential scraping: ${count} views from ${user} in 1 hour`,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Detection 3: Blocked DID violations
    if (settings?.blocked_dids?.length > 0) {
      const recentMessages = messages.filter(msg => 
        new Date(msg.created_date) > last24h
      );

      const blockedAttempts = recentMessages.filter(msg =>
        settings.blocked_dids.includes(msg.from_did)
      );

      if (blockedAttempts.length > 0) {
        breaches.push({
          type: 'blocked_sender',
          severity: 'high',
          count: blockedAttempts.length,
          senders: blockedAttempts.map(m => m.from_did),
          message: `${blockedAttempts.length} message(s) from blocked DIDs`,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Detection 4: Unusual geographic distribution
    const uniqueIPs = [...new Set(recentLogs.map(log => log.ip_address))].filter(Boolean);
    if (uniqueIPs.length >= 15) {
      breaches.push({
        type: 'distributed_access',
        severity: 'medium',
        count: uniqueIPs.length,
        message: `Access from ${uniqueIPs.length} different IPs in 24h`,
        timestamp: new Date().toISOString()
      });
    }

    // Detection 5: Privacy setting manipulation attempts
    const settingChanges = recentLogs.filter(log =>
      log.action_type?.includes('privacy') || 
      log.action_type?.includes('permission')
    );

    if (settingChanges.length >= 5) {
      breaches.push({
        type: 'setting_manipulation',
        severity: 'medium',
        count: settingChanges.length,
        message: `${settingChanges.length} privacy-related changes in 24h`,
        timestamp: new Date().toISOString()
      });
    }

    // Calculate risk score
    const riskScore = breaches.reduce((score, breach) => {
      const weights = { critical: 50, high: 30, medium: 15, low: 5 };
      return score + (weights[breach.severity] || 0);
    }, 0);

    return Response.json({
      success: true,
      breaches,
      risk_score: Math.min(riskScore, 100),
      summary: {
        total_breaches: breaches.length,
        critical: breaches.filter(b => b.severity === 'critical').length,
        high: breaches.filter(b => b.severity === 'high').length,
        medium: breaches.filter(b => b.severity === 'medium').length,
        low: breaches.filter(b => b.severity === 'low').length
      },
      analyzed_logs: recentLogs.length,
      time_range: '24h'
    });

  } catch (error) {
    console.error('Privacy breach detection error:', error);
    return Response.json({ 
      error: error.message || 'Failed to detect breaches' 
    }, { status: 500 });
  }
});