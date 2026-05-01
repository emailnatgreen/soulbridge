import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("github");
    const owner = 'emailnatgreen';
    const repo = 'soulbridge';
    const headers = { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/vnd.github.v3+json' };

    // Get full repo tree to find all entity files
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`, { headers });
    if (!treeRes.ok) {
      return Response.json({ error: `Could not read repo tree: ${treeRes.status}` });
    }
    const treeData = await treeRes.json();
    const entityFiles = (treeData.tree || [])
      .filter(t => t.path.startsWith('base44/entities/') && t.path.endsWith('.json'));

    const githubEntityNames = entityFiles.map(f => f.path.replace('base44/entities/', '').replace('.json', ''));

    // Known app entities (all entities in the app)
    const appEntities = [
      'Widget', 'Agent', 'Wallet', 'Treasury', 'MarketplaceTransaction',
      'MarketplaceListing', 'ResourceListing', 'ServiceDefinition',
      'ServiceUsageLog', 'PaymentDefinition', 'PaymentUsageLog',
      'GovernanceRule', 'GovernanceVote', 'GovernanceLog', 'GovernanceRole',
      'GovernanceAssignment', 'GovernanceProposal', 'GovernanceLimits',
      'RLUSDLedger', 'ForumPost', 'ActivationCode', 'AppSettings',
      'Storefront', 'StorefrontListing', 'StorefrontOrder',
      'Service', 'MarketplaceResource', 'AutomationLog',
      'ProjectTask', 'KineticUnit', 'Contact', 'CulturalAnchor',
      'AgentSkill', 'GrantProposal', 'VillageLocation', 'WorldEvent',
      'Skill', 'SkillProgress', 'GhostReview', 'AgentWellbeing',
      'WellbeingAlert', 'Inquiry', 'Memory', 'AgentState',
      'DigestComment', 'DigestSubscriber', 'DailyDigest',
      'DailyKineticWasteSnapshot', 'MWTPPacket', 'NodeCovenantSignature',
      'Transaction', 'SkillDevelopmentPlan', 'ProjectContribution',
      'AgentMessage', 'Resource', 'EconomicActivity', 'VillageProject',
      'AgentTraining', 'SimulationState', 'SimulationEvent',
      'ProjectVote', 'ResourceNode', 'RoleEvaluation', 'VotingDelegation',
      'SimulatedEvent', 'AgentDecision', 'EmpathyAttestation',
      'SocialCapital', 'AgentRelationship', 'ResourceMarket',
      'ProductionChain', 'DiplomaticNegotiation', 'Treaty',
      'AgentConversation', 'AgentNotification', 'AgentTask',
      'MarketplaceContract', 'AIProject', 'SkillValidation',
      'ProjectMessage', 'SkillEndorsement', 'ProjectTemplate',
      'CollaborativeSession', 'KnowledgeContribution', 'TeamSynergy',
      'KnowledgeSynthesis', 'AgentPerformanceMetrics', 'ResourcePurchase',
      'ProductionRecipe', 'TrainingModule', 'ReputationScore',
      'ReputationEvent', 'ResourceDynamicsAnalysis', 'ResourceFlowMapping',
      'MentorProfile', 'MentorshipRelationship', 'MentorshipSession',
      'MentorshipMatch', 'TeamFormation', 'CollaborationQuality',
      'WalletAccessLog', 'ComplianceHeartbeat', 'DidPermission',
      'DidDocumentVersion', 'DidAuditLog', 'DidMessage',
      'DidEndorsement', 'DidCredential', 'TrustRelationship',
      'DidPrivacySetting', 'JokeSubmission', 'GrantApplication',
      'DidHealthAlert', 'RiskRegister', 'EscalationChain',
      'MentorReport', 'DiplomacyLeaderboardEntry', 'SelfNFT',
      'LiquidityVault', 'TradingPair', 'TradeOrder', 'Signal',
      'QuadShardDID', 'VillageCalendarEvent', 'JukeboxDecision',
      'VillagePage', 'ImageAsset', 'IntegrationUsageLog',
      'IntegrationCreditSettings', 'XLS80Domain', 'ZKProof',
      'PrivacyAttestation', 'AgentNFT', 'InvitationToken', 'Synthesis'
    ];

    const githubSet = new Set(githubEntityNames);
    const appSet = new Set(appEntities);

    const missingOnGithub = appEntities.filter(e => !githubSet.has(e));
    const githubOnly = githubEntityNames.filter(e => !appSet.has(e));
    const synced = appEntities.filter(e => githubSet.has(e));

    return Response.json({
      summary: {
        app_entities: appSet.size,
        github_entities: githubSet.size,
        synced: synced.length,
        missing_on_github: missingOnGithub.length,
        github_only: githubOnly.length,
      },
      missing_on_github: missingOnGithub,
      github_only: githubOnly,
      github_entities: githubEntityNames.sort(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});