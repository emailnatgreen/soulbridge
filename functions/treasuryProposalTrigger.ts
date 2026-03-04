import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Triggered by GovernanceProposal update automation
// When a treasury_allocation or project_funding proposal reaches 'passed' status,
// prepares a multi-sig transaction draft and notifies required signers.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();

        const { entity_id, data, old_data } = body;
        const proposalId = entity_id || body.proposal_id;

        if (!proposalId) {
            return Response.json({ error: 'proposal_id required' }, { status: 400 });
        }

        // Fetch proposal if not provided
        let proposal = data;
        if (!proposal) {
            const results = await base44.asServiceRole.entities.GovernanceProposal.filter({ id: proposalId });
            proposal = results[0];
        }

        if (!proposal) {
            return Response.json({ error: 'Proposal not found' }, { status: 404 });
        }

        // Only act on treasury/funding proposals that just passed
        const isTreasuryProposal = ['treasury_allocation', 'project_funding', 'treasury_withdrawal'].includes(proposal.proposal_type);
        const justPassed = proposal.status === 'passed' && old_data?.status !== 'passed';

        if (!isTreasuryProposal || !justPassed) {
            return Response.json({ skipped: true, reason: 'Not a passed treasury proposal' });
        }

        // Fetch Guardian agents who are required signers
        const guardians = await base44.asServiceRole.entities.Agent.filter({ role: 'guardian' });
        const activeGuardians = guardians.filter(g => g.status === 'active');

        // Calculate quorum (majority of active guardians, min 2)
        const quorumRequired = Math.max(2, Math.ceil(activeGuardians.length / 2));

        // Update proposal to pending_multisig status
        await base44.asServiceRole.entities.GovernanceProposal.update(proposalId, {
            status: 'executing',
            execution_data: {
                multisig_required: true,
                quorum_required: quorumRequired,
                signers_required: activeGuardians.map(g => g.id),
                signatures_collected: [],
                prepared_at: new Date().toISOString(),
                amount_xrp: proposal.budget_requested_xrp || proposal.requested_amount,
                recipient_address: proposal.recipient_address || proposal.treasury_destination
            }
        });

        // Notify each Guardian signer
        const notificationPromises = activeGuardians.map(guardian =>
            base44.asServiceRole.entities.AgentNotification.create({
                agent_id: guardian.id,
                title: `🔐 Multi-Sig Required: Treasury Proposal Passed`,
                message: `Governance proposal "${proposal.title}" has passed and requires your signature (${quorumRequired} of ${activeGuardians.length} guardians needed) to release treasury funds.`,
                type: 'governance',
                priority: 'critical',
                read: false,
                action_url: '/GovernanceHub'
            })
        );

        // Notify Axi
        notificationPromises.push(
            base44.asServiceRole.entities.AgentNotification.create({
                agent_id: 'axi_main_001',
                title: `✅ Treasury Proposal Executing: "${proposal.title}"`,
                message: `Passed proposal now pending multi-sig approval. Quorum: ${quorumRequired}/${activeGuardians.length} guardians notified.`,
                type: 'governance',
                priority: 'high',
                read: false,
                action_url: '/GovernanceHub'
            })
        );

        await Promise.all(notificationPromises);

        // Log to Memory for audit trail
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi_main_001',
            type: 'fact',
            content: `Treasury proposal "${proposal.title}" (ID: ${proposalId}) passed and entered multi-sig execution phase. Quorum required: ${quorumRequired}/${activeGuardians.length} guardians. Prepared at ${new Date().toISOString()}.`,
            keywords: ['treasury', 'multisig', 'governance', 'audit'],
            importance: 9,
            context: 'Decentralized Treasury Management — Proposal-to-Transaction automation',
            related_entity_id: proposalId,
            related_entity_type: 'GovernanceProposal'
        });

        return Response.json({
            success: true,
            proposal_id: proposalId,
            quorum_required: quorumRequired,
            guardians_notified: activeGuardians.length
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});