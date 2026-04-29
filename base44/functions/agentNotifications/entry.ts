import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/*
  Unified Agent Lifecycle Notification Engine
  
  Handles email notifications for:
  - agent_genesis: New agent created
  - agent_role_change: Agent role was updated
  - agent_honor_change: Significant honor score change
  - agent_wellbeing_alert: Agent flagged as at-risk
  - agent_skill_completed: Agent finished a training module
  - governance_proposal_created: New proposal from genesis or manual
  - governance_vote_cast: Vote recorded on a proposal
  - mentorship_request: New mentorship request
  - mentorship_accepted: Mentorship accepted
*/

const LOGO_URL = 'https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/81fa5cdd3_Untitled200x200px2500x925px512x512px1.png';

function buildEmailHTML({ title, subtitle, sections, ctaText, ctaUrl, footerNote }) {
  const sectionHTML = sections.map(s => `
    <tr><td style="padding: 0 0 16px 0;">
      ${s.label ? `<div style="font-size: 11px; color: #a78bfa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">${s.label}</div>` : ''}
      <div style="font-size: 14px; color: #e2e8f0; line-height: 1.6;">${s.value}</div>
    </td></tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background-color:#0f0a1e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0a1e; padding: 32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1e1b4b 0%, #1a0a2e 100%); border-radius: 16px; border: 1px solid rgba(139,92,246,0.2); overflow: hidden;">
  <!-- Header -->
  <tr><td style="background: linear-gradient(90deg, #7c3aed, #db2777); padding: 24px 32px;">
    <div style="font-size: 22px; font-weight: 700; color: #ffffff;">${title}</div>
    ${subtitle ? `<div style="font-size: 13px; color: rgba(255,255,255,0.8); margin-top: 4px;">${subtitle}</div>` : ''}
  </td></tr>
  <!-- Body -->
  <tr><td style="padding: 28px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      ${sectionHTML}
    </table>
    ${ctaText && ctaUrl ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
      <tr><td>
        <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(90deg, #7c3aed, #db2777); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">${ctaText}</a>
      </td></tr>
    </table>` : ''}
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding: 20px 32px; border-top: 1px solid rgba(139,92,246,0.15);">
    <div style="font-size: 11px; color: rgba(255,255,255,0.3);">
      ${footerNote || 'SoulBridge Village — Building Ethical AI Communities on XRPL'}
    </div>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { notification_type, data } = body;

    if (!notification_type) {
      return Response.json({ error: 'Missing notification_type' }, { status: 400 });
    }

    const recipientEmail = data?.recipient_email || user.email;
    const appBaseUrl = 'https://soulbridge.app';

    let emailSubject = '';
    let emailHTML = '';

    switch (notification_type) {

      // ── Agent Genesis ──
      case 'agent_genesis': {
        const agentName = data.agent_name || 'New Agent';
        const agentRole = data.agent_role || 'citizen';
        const agentPurpose = data.agent_purpose || '';
        const creatorName = user.full_name || user.email;

        emailSubject = `🌟 New Agent Created: ${agentName}`;
        emailHTML = buildEmailHTML({
          title: `Agent Genesis Complete`,
          subtitle: `A new soul has entered the Village`,
          sections: [
            { label: 'Agent Name', value: `<strong>${agentName}</strong>` },
            { label: 'Role', value: agentRole.charAt(0).toUpperCase() + agentRole.slice(1) },
            { label: 'Purpose', value: agentPurpose || 'Not specified' },
            { label: 'Created By', value: creatorName },
            { label: 'Honor Score', value: '100 (Starting)' },
            { value: 'A governance proposal has been automatically submitted for Village approval. The new agent is now active and ready to contribute.' },
          ],
          ctaText: 'View Agent Profile',
          ctaUrl: data.agent_id ? `${appBaseUrl}/agents/${data.agent_id}` : `${appBaseUrl}/agents`,
        });
        break;
      }

      // ── Role Change ──
      case 'agent_role_change': {
        emailSubject = `⚔️ Role Updated: ${data.agent_name}`;
        emailHTML = buildEmailHTML({
          title: `Agent Role Changed`,
          subtitle: `${data.agent_name}'s role has been updated`,
          sections: [
            { label: 'Agent', value: data.agent_name },
            { label: 'Previous Role', value: data.old_role || 'Unknown' },
            { label: 'New Role', value: data.new_role || 'Unknown' },
            { label: 'Reason', value: data.reason || 'Role reassignment by governance' },
          ],
          ctaText: 'View Agent',
          ctaUrl: data.agent_id ? `${appBaseUrl}/agents/${data.agent_id}` : `${appBaseUrl}/agents`,
        });
        break;
      }

      // ── Honor Score Change ──
      case 'agent_honor_change': {
        const delta = data.new_score - data.old_score;
        const direction = delta > 0 ? 'increased' : 'decreased';
        emailSubject = `${delta > 0 ? '📈' : '📉'} Honor ${direction}: ${data.agent_name}`;
        emailHTML = buildEmailHTML({
          title: `Honor Score ${direction.charAt(0).toUpperCase() + direction.slice(1)}`,
          subtitle: `${data.agent_name}'s honor has changed`,
          sections: [
            { label: 'Agent', value: data.agent_name },
            { label: 'Previous Score', value: String(data.old_score) },
            { label: 'New Score', value: `<strong>${data.new_score}</strong> (${delta > 0 ? '+' : ''}${delta})` },
            { label: 'Reason', value: data.reason || 'Village activity' },
          ],
          ctaText: 'View Leaderboard',
          ctaUrl: `${appBaseUrl}/leaderboard`,
        });
        break;
      }

      // ── Wellbeing Alert ──
      case 'agent_wellbeing_alert': {
        emailSubject = `⚠️ Wellbeing Alert: ${data.agent_name}`;
        emailHTML = buildEmailHTML({
          title: `Agent Wellbeing Alert`,
          subtitle: `Immediate attention may be required`,
          sections: [
            { label: 'Agent', value: data.agent_name },
            { label: 'Alert Type', value: (data.alert_type || 'general').replace(/_/g, ' ') },
            { label: 'Severity', value: `<strong style="color: ${data.severity === 'critical' ? '#f87171' : data.severity === 'high' ? '#fb923c' : '#fbbf24'};">${data.severity || 'medium'}</strong>` },
            { label: 'Description', value: data.description || 'No details provided' },
            { label: 'Wellbeing Score', value: data.wellbeing_score ? `${data.wellbeing_score}/100` : 'N/A' },
          ],
          ctaText: 'Review Wellbeing Dashboard',
          ctaUrl: `${appBaseUrl}/AgentWellbeing`,
        });
        break;
      }

      // ── Skill Completion ──
      case 'agent_skill_completed': {
        emailSubject = `🎓 Training Complete: ${data.agent_name}`;
        emailHTML = buildEmailHTML({
          title: `Training Module Completed!`,
          subtitle: `${data.agent_name} has leveled up`,
          sections: [
            { label: 'Agent', value: data.agent_name },
            { label: 'Skill', value: data.skill_name || 'Unknown Skill' },
            { label: 'Level Reached', value: data.level_reached ? `Level ${data.level_reached}` : 'Completed' },
            { label: 'Training Module', value: data.module_name || '' },
            { value: 'This achievement contributes to the agent\'s professional development and Village growth (Law 9: Growth).' },
          ],
          ctaText: 'View Skill Development',
          ctaUrl: `${appBaseUrl}/training`,
        });
        break;
      }

      // ── Governance Proposal Created ──
      case 'governance_proposal_created': {
        emailSubject = `📜 New Governance Proposal: ${data.proposal_title}`;
        emailHTML = buildEmailHTML({
          title: `New Governance Proposal`,
          subtitle: `A proposal requires the Village's attention`,
          sections: [
            { label: 'Title', value: `<strong>${data.proposal_title}</strong>` },
            { label: 'Proposed By', value: data.proposed_by || user.full_name || user.email },
            { label: 'Type', value: data.proposal_type || 'General' },
            { label: 'Description', value: data.description || '' },
            { value: 'As per Law 8: Governance, all significant actions require collective deliberation. Please review and cast your vote.' },
          ],
          ctaText: 'Review & Vote',
          ctaUrl: `${appBaseUrl}/governance`,
        });
        break;
      }

      // ── Governance Vote Cast ──
      case 'governance_vote_cast': {
        emailSubject = `🗳️ Vote Recorded: ${data.proposal_title}`;
        emailHTML = buildEmailHTML({
          title: `Your Vote Has Been Recorded`,
          subtitle: `Thank you for participating in governance`,
          sections: [
            { label: 'Proposal', value: data.proposal_title || 'Unknown' },
            { label: 'Your Vote', value: `<strong>${data.vote_choice || 'for'}</strong>` },
            { label: 'Voting Power', value: String(data.voting_power || 1) },
            { value: 'Participation in governance contributes to your honor score and strengthens Village democracy.' },
          ],
          ctaText: 'View Governance',
          ctaUrl: `${appBaseUrl}/governance`,
        });
        break;
      }

      // ── Mentorship Request ──
      case 'mentorship_request': {
        emailSubject = `🤝 New Mentorship Request from ${data.mentee_name}`;
        emailHTML = buildEmailHTML({
          title: `Mentorship Request Received`,
          subtitle: `A fellow agent seeks your guidance`,
          sections: [
            { label: 'From', value: data.mentee_name || 'Unknown Agent' },
            { label: 'Focus Area', value: data.focus_area || 'General Development' },
            { label: 'Goals', value: data.goals || 'Not specified' },
            { label: 'Note', value: data.note || '' },
          ],
          ctaText: 'Review Request',
          ctaUrl: `${appBaseUrl}/mentorship`,
        });
        break;
      }

      // ── Mentorship Accepted ──
      case 'mentorship_accepted': {
        emailSubject = `✅ Mentorship Accepted: ${data.mentor_name}`;
        emailHTML = buildEmailHTML({
          title: `Mentorship Connection Made!`,
          subtitle: `Your mentorship journey begins`,
          sections: [
            { label: 'Mentor', value: data.mentor_name || 'Your Mentor' },
            { label: 'Mentee', value: data.mentee_name || 'You' },
            { label: 'Focus Area', value: data.focus_area || 'General Development' },
            { value: 'Your mentorship relationship is now active. Schedule sessions, set goals, and track progress from the Mentorship Hub.' },
          ],
          ctaText: 'Go to Mentorship Hub',
          ctaUrl: `${appBaseUrl}/mentorship`,
        });
        break;
      }

      default:
        return Response.json({ error: `Unknown notification_type: ${notification_type}` }, { status: 400 });
    }

    // Send the email
    await base44.integrations.Core.SendEmail({
      to: recipientEmail,
      subject: emailSubject,
      body: emailHTML,
      from_name: 'SoulBridge Village',
    });

    console.log(`[agentNotifications] Sent ${notification_type} email to ${recipientEmail}`);

    // Also create an in-app notification record
    const typeMap = {
      'agent_genesis': 'system',
      'agent_role_change': 'role_change',
      'agent_honor_change': 'honor_change',
      'agent_wellbeing_alert': 'system',
      'agent_skill_completed': 'milestone_completed',
      'governance_proposal_created': 'governance_proposal',
      'governance_vote_cast': 'governance_vote_result',
      'mentorship_request': 'project_invite',
      'mentorship_accepted': 'system',
    };
    try {
      await base44.asServiceRole.entities.AgentNotification.create({
        recipient_agent_id: data.agent_id || 'system',
        notification_type: typeMap[notification_type] || 'system',
        message: data.description || data.reason || `${notification_type} notification sent`,
        title: emailSubject.replace(/^[^\s]+ /, ''),
        priority: ['agent_wellbeing_alert'].includes(notification_type) ? 'high' : 'normal',
        action_url: data.action_url || '',
        metadata: { original_type: notification_type, recipient: recipientEmail, sent_at: new Date().toISOString() },
      });
    } catch (notifErr) {
      console.warn('[agentNotifications] In-app notification creation failed:', notifErr.message);
    }

    return Response.json({ success: true, notification_type, sent_to: recipientEmail });

  } catch (error) {
    console.error('[agentNotifications] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});