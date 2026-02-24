import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Calculate and update reputation score for a DID
 * Based on activity, reliability, engagement, and behavior
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallet_id } = await req.json();

    if (!wallet_id) {
      return Response.json(
        { error: 'Missing required field: wallet_id' },
        { status: 400 }
      );
    }

    // Get wallet
    const wallet = await base44.entities.Wallet.get(wallet_id);
    if (!wallet) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const did_address = wallet.classic_address;
    const did = `did:xrpl:${did_address}`;

    // Gather data for reputation calculation
    const [messages, sentMessages, auditLogs, permissions] = await Promise.all([
      base44.entities.DidMessage.filter({ to_did: did }),
      base44.entities.DidMessage.filter({ from_did: did }),
      base44.entities.DidAuditLog.filter({ did_classic_address: did_address }),
      base44.entities.DidPermission.filter({ did_classic_address: did_address })
    ]);

    // Calculate metrics
    const totalMessagesReceived = messages.length;
    const totalMessagesSent = sentMessages.length;
    const readMessages = messages.filter(m => m.status === 'read').length;
    const messageReadRate = totalMessagesReceived > 0 
      ? (readMessages / totalMessagesReceived) * 100 
      : 0;

    // Calculate average response time (simplified)
    let avgResponseTime = 0;
    const responses = sentMessages.filter(m => m.reply_to_message_id);
    if (responses.length > 0) {
      const responseTimes = responses.map(r => {
        const original = messages.find(m => m.id === r.reply_to_message_id);
        if (original) {
          const diff = new Date(r.created_date) - new Date(original.created_date);
          return diff / (1000 * 60 * 60); // hours
        }
        return 0;
      }).filter(t => t > 0);
      avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;
    }

    const permissionsGranted = permissions.filter(p => p.status === 'active').length;
    const permissionsRevoked = permissions.filter(p => p.status === 'revoked').length;
    
    const revocationEvents = auditLogs.filter(l => l.action_type === 'did_revoked').length;
    
    // Calculate active days
    const createdDate = new Date(wallet.created_date);
    const now = new Date();
    const activeDays = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

    const endorsementsReceived = 0; // Can be expanded with endorsement system

    const metrics = {
      total_messages_sent: totalMessagesSent,
      total_messages_received: totalMessagesReceived,
      avg_response_time_hours: avgResponseTime,
      message_read_rate: messageReadRate,
      permissions_granted: permissionsGranted,
      permissions_revoked: permissionsRevoked,
      revocation_count: revocationEvents,
      active_days: activeDays,
      endorsements_received: endorsementsReceived,
      audit_log_entries: auditLogs.length
    };

    // Calculate component scores (0-100)
    
    // Activity Score: based on usage and engagement
    const activityScore = Math.min(100, 
      (totalMessagesSent * 2) + 
      (totalMessagesReceived * 1.5) + 
      (auditLogs.length * 0.5)
    );

    // Reliability Score: based on response rate and uptime
    const reliabilityScore = Math.min(100,
      (messageReadRate * 0.4) +
      (avgResponseTime > 0 && avgResponseTime < 24 ? 30 : avgResponseTime < 48 ? 20 : 10) +
      (revocationEvents === 0 ? 30 : Math.max(0, 30 - (revocationEvents * 10)))
    );

    // Engagement Score: based on permissions and community interaction
    const engagementScore = Math.min(100,
      (permissionsGranted * 5) +
      (endorsementsReceived * 10) +
      (activeDays * 0.5)
    );

    // Overall score (weighted average)
    const overallScore = Math.round(
      (activityScore * 0.3) +
      (reliabilityScore * 0.4) +
      (engagementScore * 0.3)
    );

    // Determine trust level
    let trustLevel = 'unverified';
    if (overallScore >= 80) trustLevel = 'verified';
    else if (overallScore >= 60) trustLevel = 'trusted';
    else if (overallScore >= 40) trustLevel = 'established';
    else if (overallScore >= 20) trustLevel = 'new';

    // Award badges
    const badges = [];
    
    if (totalMessagesSent >= 10) {
      badges.push({
        name: 'Communicator',
        description: 'Sent 10+ messages',
        earned_date: new Date().toISOString(),
        icon: '💬'
      });
    }
    
    if (messageReadRate >= 80) {
      badges.push({
        name: 'Responsive',
        description: '80%+ message read rate',
        earned_date: new Date().toISOString(),
        icon: '⚡'
      });
    }
    
    if (activeDays >= 30) {
      badges.push({
        name: 'Active Member',
        description: '30+ days active',
        earned_date: new Date().toISOString(),
        icon: '🌟'
      });
    }
    
    if (permissionsGranted >= 3) {
      badges.push({
        name: 'Trusted',
        description: '3+ active permissions',
        earned_date: new Date().toISOString(),
        icon: '🔒'
      });
    }
    
    if (revocationEvents === 0 && activeDays >= 7) {
      badges.push({
        name: 'Reliable',
        description: 'No revocations',
        earned_date: new Date().toISOString(),
        icon: '✅'
      });
    }

    // Identify strengths
    const strengths = [];
    if (activityScore >= 70) strengths.push('High activity level');
    if (reliabilityScore >= 70) strengths.push('Very reliable');
    if (engagementScore >= 70) strengths.push('Strong community engagement');
    if (messageReadRate >= 80) strengths.push('Excellent response rate');
    if (avgResponseTime > 0 && avgResponseTime < 12) strengths.push('Fast responder');

    // Identify warnings
    const warnings = [];
    if (revocationEvents > 0) warnings.push(`DID revoked ${revocationEvents} time(s)`);
    if (messageReadRate < 30 && totalMessagesReceived > 5) warnings.push('Low message read rate');
    if (permissionsRevoked > permissionsGranted) warnings.push('More permissions revoked than granted');
    if (activeDays < 7) warnings.push('New DID - limited history');

    // Create or update reputation score
    const existingReputations = await base44.entities.ReputationScore.filter({ 
      did_classic_address: did_address 
    });

    const reputationData = {
      did_classic_address: did_address,
      wallet_id,
      overall_score: overallScore,
      trust_level: trustLevel,
      activity_score: Math.round(activityScore),
      reliability_score: Math.round(reliabilityScore),
      engagement_score: Math.round(engagementScore),
      metrics,
      badges,
      strengths,
      warnings,
      last_calculated: new Date().toISOString(),
      calculation_version: '1.0'
    };

    let reputation;
    if (existingReputations.length > 0) {
      reputation = await base44.asServiceRole.entities.ReputationScore.update(
        existingReputations[0].id,
        reputationData
      );
    } else {
      reputation = await base44.asServiceRole.entities.ReputationScore.create(reputationData);
    }

    return Response.json({
      success: true,
      reputation,
      message: 'Reputation calculated successfully'
    });

  } catch (error) {
    console.error('Error calculating reputation:', error);
    return Response.json(
      { error: 'Failed to calculate reputation', message: error.message },
      { status: 500 }
    );
  }
});