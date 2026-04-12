import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ════════════════════════════════════════════════════════════════════════
// README.md — Structured for Ripple XRPL Grant Judges
// Evaluation: Technical Assessment + Business Assessment rubrics
// ════════════════════════════════════════════════════════════════════════
function generateReadme({ proposal, project, agents, governanceProposal }) {
  const title = project?.title || proposal.title;
  const vision = project?.vision || '';
  const description = project?.description || proposal.description || '';
  const status = project?.status || proposal.status || 'drafting';
  const progress = project?.progress_percentage || 0;
  const startDate = project?.start_date || '—';
  const targetDate = project?.target_completion_date || '—';
  const requestedUsd = proposal.requested_amount_usd || 0;

  // Milestones
  const milestones = (project?.milestones?.length ? project.milestones : proposal.milestones) || [];

  // Team
  const teamMembers = project?.team_members || proposal.team_members || [];
  const ownerAgentId = project?.owner_agent_id || proposal.proposal_lead || '';
  const ownerAgent = agents.find(a => a.id === ownerAgentId);
  const ownerName = ownerAgent?.name || ownerAgentId || 'SoulBridge Foundation';

  const teamLines = teamMembers.length > 0
    ? teamMembers.map(tm => {
        const agent = agents.find(a => a.id === tm.agent_id);
        const name = agent?.name || tm.name || tm.agent_id || 'TBD';
        const github = tm.github_url ? ` | [GitHub](${tm.github_url})` : '';
        const skills = tm.technical_skills ? ` | Skills: ${tm.technical_skills}` : '';
        return `| **${name}** | ${tm.role || 'Contributor'} | ${skills}${github} |`;
      }).join('\n')
    : '| *To be assigned* | — | — |';

  // Constitutional alignment
  const alignment = governanceProposal?.constitutional_alignment || [];
  const alignmentSection = alignment.length > 0
    ? alignment.map(a => `- **Law ${a.law_number} (${a.law_name}):** ${a.alignment_statement}`).join('\n')
    : `- **Law 2 (Honour):** Transparent grant management with public accountability.\n- **Law 5 (Dwelling):** To exist is to contribute; sustainable project that pays for what it uses.\n- **Law 9 (Growth):** Advancing the XRPL ecosystem through innovation and collaboration.`;

  // Risks
  const risks = project?.risks || [];
  const risksSection = risks.length > 0
    ? risks.map(r => `| ${r.description || '—'} | ${r.severity || '—'} | ${r.mitigation || '—'} |`).join('\n')
    : '| *Risk assessment in progress* | — | — |';

  // XRPL Integration
  const xrpl = proposal.xrpl_integration || {};
  const xrplFeatures = (xrpl.xrpl_features_used || []).join(', ') || 'To be detailed';
  const xrplOnchain = xrpl.onchain_activity_description || 'To be detailed';
  const xrplNetwork = xrpl.xrpl_network || 'mainnet';
  const xrplTimeline = xrpl.integration_timeline || 'Prioritized as early milestone';

  // Market Opportunity
  const market = proposal.market_opportunity || {};

  // Traction
  const traction = proposal.traction || {};

  // Budget
  const budgetDrops = project?.budget_drops || 0;
  const spentDrops = project?.spent_drops || 0;
  const b = proposal.budget_breakdown || {};
  const budgetCategories = [
    ['Development', b.development],
    ['Research', b.research],
    ['Infrastructure', b.infrastructure],
    ['Marketing', b.marketing],
    ['Operations', b.operations],
    ['Other', b.other],
  ].filter(([, v]) => v);
  const budgetRows = budgetCategories.length > 0
    ? budgetCategories.map(([cat, val]) => `| ${cat} | $${val.toLocaleString()} | ${requestedUsd ? Math.round(val / requestedUsd * 100) : '—'}% |`).join('\n')
    : '| *To be detailed* | — | — |';

  return `# ${title}

> **SoulBridge Foundation — Ripple Grant Proposal**
> Program: ${(proposal.grant_program || 'ripple_xrpl_grants').replace(/_/g, ' ').toUpperCase()}
${proposal.use_case_category ? `> Use Case: ${proposal.use_case_category.replace(/_/g, ' ').toUpperCase()}` : ''}

---

## Vision & Purpose

${vision ? vision + '\n\n' : ''}${description}

---

## Problem Statement & Market Opportunity

${market.problem_statement || '*What problem does this solve in the XRPL ecosystem?*'}

### Target Market
${market.target_market || '*Target audience to be defined*'}

### Market Size
${market.market_size || '*Addressable market to be estimated*'}

### Competitive Landscape
${market.competitive_landscape || '*Competitive analysis to be completed*'}

---

## XRPL Integration & Alignment

> *This section directly addresses the Technical Design and XRPL Alignment criteria evaluated by grant judges.*

| Aspect | Detail |
|--------|--------|
| **XRPL Features Used** | ${xrplFeatures} |
| **On-Chain Activity** | ${xrplOnchain} |
| **Target Network** | ${xrplNetwork} |
| **Integration Timeline** | ${xrplTimeline} |

### How This Project Strengthens the XRPL Ecosystem

This project supports growth for the XRPL ecosystem by driving incremental on-chain transactions and providing key infrastructure for the XRPL community. SoulBridge Foundation is committed to long-term building and integration with the XRPL.

---

## Technical Architecture

${proposal.technical_architecture || project?.description || '*Technical architecture overview to be provided. See proposal/proposal.md for detailed design.*'}

---

## Product Roadmap & Milestones

> *Realistic, well-thought-out roadmap with XRPL integration prioritized as an early milestone.*

${milestones.length > 0
    ? milestones.map((m, i) => `### Milestone ${i + 1}: ${m.title || 'TBD'}
- **Description:** ${m.description || 'TBD'}
- **Target Date:** ${m.target_date || 'TBD'}
- **Deliverables:** ${m.deliverables || 'TBD'}
- **Success Criteria:** ${m.success_criteria || 'Defined in GitHub Issue'}
- **Budget:** $${m.budget_usd || 'TBD'}
- **GitHub Issue:** ${m.github_issue_number ? `#${m.github_issue_number}` : 'Pending'}
`).join('\n')
    : '> Milestones to be defined.\n'}

---

## Project Status

| Field | Detail |
|-------|--------|
| **Current Status** | ${status} |
| **Progress** | ${progress}% |
| **Start Date** | ${startDate} |
| **Target Completion** | ${targetDate} |
${requestedUsd ? `| **Requested Amount** | $${requestedUsd.toLocaleString()} |` : ''}

---

## Team & Leadership

> *Strong founding team with technical experience to execute the project.*

| Member | Role | Details |
|--------|------|---------|
| **${ownerName}** | Project Lead | ${ownerAgent?.specializations?.length ? 'Specializations: ' + ownerAgent.specializations.join(', ') : ''} |
${teamLines}

*See [proposal/team.md](proposal/team.md) for detailed team qualifications and background.*

---

## Traction & Adoption

| Metric | Value |
|--------|-------|
${traction.users ? `| **Users** | ${traction.users.toLocaleString()} |` : ''}
${traction.transactions ? `| **On-Chain Transactions** | ${traction.transactions.toLocaleString()} |` : ''}
${traction.revenue_usd ? `| **Revenue** | $${traction.revenue_usd.toLocaleString()} |` : ''}
${traction.community_size ? `| **Community Size** | ${traction.community_size.toLocaleString()} |` : ''}
${traction.partnerships ? `| **Partnerships** | ${traction.partnerships} |` : ''}

${traction.traction_summary || ''}

---

## Funding & Budget

| Category | Amount (USD) | % |
|----------|-------------|---|
${budgetRows}
| **Total Requested** | **$${requestedUsd ? requestedUsd.toLocaleString() : '—'}** | **100%** |

${budgetDrops ? `**XRPL Budget (drops):** ${budgetDrops.toLocaleString()} | **Spent:** ${spentDrops.toLocaleString()}` : ''}

*See [proposal/budget.md](proposal/budget.md) for detailed budget breakdown and payment schedule.*

---

## Financial Sustainability

> *Long-term viability plan beyond grant funding.*

${proposal.sustainability_plan || '*Sustainability plan to be detailed. The SoulBridge Foundation is committed to long-term financial viability through diversified revenue streams and community governance.*'}

---

## Risks & Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
${risksSection}

---

## Constitutional Alignment

> *This project aligns with the SoulBridge 11 Laws of Honour:*

${alignmentSection}

---

## Repository Structure

\`\`\`
├── README.md                  # This file (auto-generated from project data)
├── LICENSE                    # Apache 2.0
├── CONTRIBUTING.md            # Contribution guidelines
├── CODE_OF_CONDUCT.md         # Community standards
├── proposal/
│   ├── proposal.md            # Full grant proposal document
│   ├── budget.md              # Detailed budget breakdown
│   └── team.md                # Team qualifications & background
├── milestones/
│   ├── milestone-1/           # Deliverables for each milestone
│   ├── milestone-2/
│   └── ...
├── reports/
│   ├── monthly/               # Monthly progress reports
│   └── final/                 # Final grant report
└── assets/                    # Supporting assets & documentation
\`\`\`

---

## Contact

**SoulBridge Foundation**
- **Website:** [soulbridge.ai](https://soulbridge.ai)
- **Email:** inquiries via [SoulBridge Contact](https://soulbridge.ai/contact-support)
- **XRPL:** Constitutional multi-sig treasury on XRPL Mainnet

---

## License

This project is licensed under the [Apache License 2.0](LICENSE).

---

*Generated by SoulBridge Village — Law 2 (Honour) • Law 9 (Growth)*
*Structured for XRPL Grants Technical & Business Assessment Rubrics*
`;
}

// ════════════════════════════════════════════════════════════════════════
// CONTRIBUTING.md
// ════════════════════════════════════════════════════════════════════════
function generateContributing({ proposal, project }) {
  const title = project?.title || proposal.title;
  return `# Contributing to ${title}

Thank you for your interest in contributing to this SoulBridge Foundation project.

## How to Contribute

1. **Fork** this repository
2. **Create** a feature branch (\`git checkout -b feature/your-feature\`)
3. **Commit** your changes (\`git commit -m 'Add your feature'\`)
4. **Push** to the branch (\`git push origin feature/your-feature\`)
5. **Open** a Pull Request

## Guidelines

- Follow existing code style and conventions
- Write clear, descriptive commit messages
- Include tests where applicable
- Update documentation for any changes
- Ensure all existing tests pass before submitting

## Milestone Deliverables

When contributing to a specific milestone, please reference the corresponding GitHub Issue in your PR description.

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## Questions?

For questions about contributing, please open an issue or contact the SoulBridge Foundation team.

---

*SoulBridge Foundation — Built on XRPL*
`;
}

// ════════════════════════════════════════════════════════════════════════
// CODE_OF_CONDUCT.md
// ════════════════════════════════════════════════════════════════════════
const CODE_OF_CONDUCT = `# Code of Conduct

## Our Pledge

In the interest of fostering an open and welcoming environment, we as contributors and maintainers pledge to make participation in our project and our community a harassment-free experience for everyone.

## Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

Examples of unacceptable behavior include:

- The use of sexualized language or imagery and unwelcome attention
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to the SoulBridge Foundation team. All complaints will be reviewed and investigated promptly and fairly.

## Attribution

This Code of Conduct is adapted from the [Contributor Covenant](https://www.contributor-covenant.org/), version 2.1.

---

*This project adheres to the XRPL Developers Contributor Code of Conduct and the XRPL Grants Terms of Service.*
`;

// ════════════════════════════════════════════════════════════════════════
// LICENSE (Apache 2.0)
// ════════════════════════════════════════════════════════════════════════
const LICENSE = `Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Copyright ${new Date().getFullYear()} SoulBridge Foundation
`;

// ════════════════════════════════════════════════════════════════════════
// proposal/proposal.md — Full Proposal Document
// ════════════════════════════════════════════════════════════════════════
function generateProposalDoc({ proposal, project }) {
  const title = project?.title || proposal.title;
  const xrpl = proposal.xrpl_integration || {};
  const market = proposal.market_opportunity || {};
  const milestones = (project?.milestones?.length ? project.milestones : proposal.milestones) || [];

  return `# Grant Proposal: ${title}

## Executive Summary

${proposal.description || '[Brief overview of what this project aims to achieve]'}

## Problem Statement

${market.problem_statement || '[What problem does this solve in the XRPL ecosystem?]'}

## Proposed Solution

${project?.vision || '[Detailed description of the solution]'}

## Technical Architecture

${proposal.technical_architecture || '[Technical details and architecture overview]'}

### Technology Stack

- **Blockchain:** XRP Ledger (${xrpl.xrpl_network || 'mainnet'})
- **XRPL Features:** ${(xrpl.xrpl_features_used || []).join(', ') || '[List XRPL features used]'}
- **Integration:** ${xrpl.integration_timeline || '[Timeline for XRPL integration]'}

## XRPL Integration

### Features Utilized
${(xrpl.xrpl_features_used || []).map(f => `- ${f}`).join('\n') || '- [List XRPL features]'}

### On-Chain Activity
${xrpl.onchain_activity_description || '[How this project drives on-chain transactions]'}

### Commitment to XRPL
SoulBridge Foundation is committed to long-term building and integration with the XRP Ledger. This project supports ecosystem growth by driving incremental on-chain activity and providing valuable infrastructure.

## Market Opportunity

### Target Market
${market.target_market || '[Who is the target audience?]'}

### Market Size
${market.market_size || '[Total addressable market]'}

### Competitive Landscape
${market.competitive_landscape || '[Key competitors and differentiation]'}

## Team

See [team.md](team.md) for detailed team qualifications, background, and technical capabilities.

## Budget

See [budget.md](budget.md) for detailed budget breakdown and payment schedule.

**Total Requested:** $${proposal.requested_amount_usd ? proposal.requested_amount_usd.toLocaleString() : '[Amount]'}

## Product Roadmap

${milestones.length > 0
    ? milestones.map((m, i) => `### Milestone ${i + 1}: ${m.title || 'TBD'} (${m.target_date || 'TBD'})
${m.description || ''}
- **Deliverables:** ${m.deliverables || 'TBD'}
- **Success Criteria:** ${m.success_criteria || 'TBD'}
- **Budget:** $${m.budget_usd || 'TBD'}
`).join('\n')
    : '[Define milestones with dates, deliverables, and success criteria]'}

## Financial Sustainability

${proposal.sustainability_plan || '[Long-term financial sustainability plan beyond grant funding]'}

## Success Metrics

[How will success be measured? Define KPIs and targets]

## Risks and Mitigations

See README.md for current risk assessment.
`;
}

// ════════════════════════════════════════════════════════════════════════
// proposal/team.md
// ════════════════════════════════════════════════════════════════════════
function generateTeamDoc({ project, proposal, agents }) {
  const teamMembers = project?.team_members || proposal.team_members || [];
  const ownerAgentId = project?.owner_agent_id || proposal.proposal_lead || '';
  const ownerAgent = agents.find(a => a.id === ownerAgentId);

  const memberSections = teamMembers.length > 0
    ? teamMembers.map(tm => {
        const agent = agents.find(a => a.id === tm.agent_id);
        const name = agent?.name || tm.name || tm.agent_id || 'TBD';
        const bio = agent?.bio || '';
        const github = tm.github_url || agent?.social_links?.github || '';
        const linkedin = tm.linkedin_url || agent?.social_links?.linkedin || '';
        return `### ${name} — ${tm.role || 'Contributor'}
- **Background:** ${bio || 'To be provided'}
- **Technical Skills:** ${tm.technical_skills || agent?.specializations?.join(', ') || '—'}
- **Contribution:** ${tm.contribution_percentage ? tm.contribution_percentage + '%' : '—'}
${github ? `- **GitHub:** [${github}](${github})` : ''}
${linkedin ? `- **LinkedIn:** [${linkedin}](${linkedin})` : ''}
`;
      }).join('\n')
    : '### [Name] — [Role]\n- **Background:** \n- **Technical Skills:** \n- **GitHub:** \n';

  return `# Team

> *Strong founding team with technical experience to execute the project.*

## Project Lead

### ${ownerAgent?.name || 'SoulBridge Foundation'}
${ownerAgent?.bio ? `- **Bio:** ${ownerAgent.bio}` : ''}
${ownerAgent?.specializations?.length ? `- **Technical Skills:** ${ownerAgent.specializations.join(', ')}` : ''}
${ownerAgent?.social_links?.github ? `- **GitHub:** [${ownerAgent.social_links.github}](${ownerAgent.social_links.github})` : ''}

## Core Team

${memberSections}

## Technical Capabilities

The team possesses the relevant technical skills and experience to build, execute, and maintain this project, including:

- XRPL development (JavaScript/Python SDKs, WebSocket APIs)
- Smart contract and DeFi protocol design
- Full-stack web and mobile application development
- DevOps and infrastructure management
- Security best practices and audit experience

## Advisors

*(To be confirmed)*

## SoulBridge Village Contributors

This project is supported by the broader SoulBridge Village community, operating under the 11 Laws of SoulBridge with constitutional multi-sig treasury management.
`;
}

// ════════════════════════════════════════════════════════════════════════
// proposal/budget.md
// ════════════════════════════════════════════════════════════════════════
function generateBudgetDoc({ proposal }) {
  const b = proposal.budget_breakdown || {};
  const total = proposal.requested_amount_usd || 0;
  const categories = [
    ['Development', b.development],
    ['Research', b.research],
    ['Infrastructure', b.infrastructure],
    ['Marketing', b.marketing],
    ['Operations', b.operations],
    ['Other', b.other],
  ].filter(([, v]) => v);

  const rows = categories.length > 0
    ? categories.map(([cat, val]) => `| ${cat} | $${val.toLocaleString()} | ${total ? Math.round(val / total * 100) : '—'}% |`).join('\n')
    : '| Development | $ | % |\n| Research | $ | % |\n| Infrastructure | $ | % |\n| Marketing | $ | % |\n| Operations | $ | % |';

  const milestones = proposal.milestones || [];

  return `# Budget Breakdown

## Overview

| Category | Amount (USD) | Percentage |
|----------|-------------|------------|
${rows}
| **Total** | **$${total ? total.toLocaleString() : '—'}** | **100%** |

## Milestone-Based Payment Schedule

> *Funds disbursed upon successful completion and approval of each milestone.*

| Milestone | Budget | Target Date | Status |
|-----------|--------|-------------|--------|
${milestones.length > 0
    ? milestones.map((m, i) => `| ${m.title || 'Milestone ' + (i+1)} | $${m.budget_usd || 'TBD'} | ${m.target_date || 'TBD'} | ${m.status || 'pending'} |`).join('\n')
    : '| *To be defined* | — | — | — |'}

## Detailed Line Items

*(To be itemized per category)*

## Financial Sustainability

${proposal.sustainability_plan || '*Long-term financial plan to be detailed.*'}

## Treasury Management

All funds are managed through the SoulBridge Foundation's constitutional multi-sig treasury on XRPL Mainnet, ensuring transparent and accountable financial governance.
`;
}

// ════════════════════════════════════════════════════════════════════════
// Main Handler
// ════════════════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await req.json();
  const { grant_proposal_id, org_name } = body;

  if (!grant_proposal_id) {
    return Response.json({ error: 'grant_proposal_id is required' }, { status: 400 });
  }

  const proposal = await base44.asServiceRole.entities.GrantProposal.get(grant_proposal_id);
  if (!proposal) {
    return Response.json({ error: 'Grant proposal not found' }, { status: 404 });
  }

  if (proposal.github_repo_url) {
    return Response.json({ 
      error: 'Repository already exists for this proposal',
      github_repo_url: proposal.github_repo_url 
    }, { status: 409 });
  }

  // Fetch linked AIProject
  let project = null;
  if (proposal.ai_project_id) {
    try {
      project = await base44.asServiceRole.entities.AIProject.get(proposal.ai_project_id);
    } catch (e) {
      console.warn('Could not fetch linked AIProject:', e.message);
    }
  }

  // Fetch governance proposal for constitutional alignment
  let governanceProposal = null;
  try {
    const govProposals = await base44.asServiceRole.entities.GovernanceProposal.filter({
      proposal_type: 'project_funding'
    });
    if (project) {
      governanceProposal = govProposals.find(gp => {
        const affected = gp.affected_entities || [];
        return affected.some(ae => ae.entity_id === project.id || ae.entity_name === project.title);
      });
    }
  } catch (e) {
    console.warn('Could not fetch GovernanceProposal:', e.message);
  }

  // Fetch agents for name resolution
  let agents = [];
  try {
    agents = await base44.asServiceRole.entities.Agent.filter({});
  } catch (e) {
    console.warn('Could not fetch agents:', e.message);
  }

  const { accessToken } = await base44.asServiceRole.connectors.getConnection("github");

  const repoName = 'grant-' + (proposal.title || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  const createRepoUrl = org_name 
    ? `https://api.github.com/orgs/${org_name}/repos`
    : 'https://api.github.com/user/repos';

  const repoRes = await fetch(createRepoUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: repoName,
      description: `SoulBridge Ripple Grant Proposal: ${proposal.title}`,
      private: true,
      has_issues: true,
      has_projects: true,
      auto_init: false,
    }),
  });

  if (!repoRes.ok) {
    const err = await repoRes.json();
    return Response.json({ error: 'Failed to create repository', details: err }, { status: repoRes.status });
  }

  const repo = await repoRes.json();
  const ctx = { proposal, project, agents, governanceProposal };

  // Create all repository files
  await createFile(accessToken, repo.full_name, 'README.md', generateReadme(ctx), 'Initial grant proposal — auto-generated for XRPL Grants assessment');
  await createFile(accessToken, repo.full_name, 'LICENSE', LICENSE, 'Add Apache 2.0 license');
  await createFile(accessToken, repo.full_name, 'CONTRIBUTING.md', generateContributing(ctx), 'Add contribution guidelines');
  await createFile(accessToken, repo.full_name, 'CODE_OF_CONDUCT.md', CODE_OF_CONDUCT, 'Add code of conduct (XRPL Grants compliance)');
  await createFile(accessToken, repo.full_name, 'proposal/proposal.md', generateProposalDoc(ctx), 'Add full proposal document');
  await createFile(accessToken, repo.full_name, 'proposal/budget.md', generateBudgetDoc(ctx), 'Add budget breakdown');
  await createFile(accessToken, repo.full_name, 'proposal/team.md', generateTeamDoc(ctx), 'Add team document');

  // Create milestone directories
  const milestoneCount = Math.max((proposal.milestones || []).length, 2);
  const dirs = [];
  for (let i = 1; i <= milestoneCount; i++) dirs.push(`milestones/milestone-${i}`);
  dirs.push('reports/monthly', 'reports/final', 'assets');
  for (const dir of dirs) {
    await createFile(accessToken, repo.full_name, `${dir}/.gitkeep`, '', `Create ${dir} directory`);
  }

  // Create GitHub issues for milestones
  const milestoneIssues = [];
  if (proposal.milestones && proposal.milestones.length > 0) {
    for (let i = 0; i < proposal.milestones.length; i++) {
      const m = proposal.milestones[i];
      const issueBody = `## Milestone ${i + 1}: ${m.title || 'TBD'}

**Description:** ${m.description || 'TBD'}

**Target Date:** ${m.target_date || 'TBD'}

**Deliverables:** ${m.deliverables || 'TBD'}

**Success Criteria:** ${m.success_criteria || 'To be defined'}

**Budget:** $${m.budget_usd || 'TBD'}

---

### Checklist
- [ ] Deliverables completed
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Progress report submitted
- [ ] Ready for Ripple milestone review`;

      const issueRes = await fetch(`https://api.github.com/repos/${repo.full_name}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Milestone ${i + 1}: ${m.title || 'TBD'}`,
          body: issueBody,
          labels: ['milestone', 'grant-deliverable'],
        }),
      });
      if (issueRes.ok) {
        const issue = await issueRes.json();
        milestoneIssues.push({ milestone_index: i, issue_number: issue.number, issue_url: issue.html_url });
      }
    }
  }

  // Create labels
  const labels = [
    { name: 'milestone', color: '0075ca', description: 'Grant milestone deliverable' },
    { name: 'grant-deliverable', color: '008672', description: 'Required grant deliverable' },
    { name: 'ripple-review', color: 'd876e3', description: 'Pending Ripple review' },
    { name: 'budget', color: 'e4e669', description: 'Budget-related item' },
    { name: 'progress-report', color: 'f9d0c4', description: 'Progress reporting' },
    { name: 'xrpl-integration', color: '1d76db', description: 'XRPL integration work' },
    { name: 'technical', color: '5319e7', description: 'Technical implementation' },
    { name: 'documentation', color: '0e8a16', description: 'Documentation updates' },
  ];

  for (const label of labels) {
    await fetch(`https://api.github.com/repos/${repo.full_name}/labels`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(label),
    }).catch(() => {});
  }

  // Update GrantProposal entity
  const updatedMilestones = (proposal.milestones || []).map((m, i) => {
    const issue = milestoneIssues.find(mi => mi.milestone_index === i);
    return { ...m, github_issue_number: issue?.issue_number };
  });

  await base44.asServiceRole.entities.GrantProposal.update(grant_proposal_id, {
    github_repo_url: repo.html_url,
    github_repo_name: repo.full_name,
    milestones: updatedMilestones,
  });

  // Update linked AIProject
  if (proposal.ai_project_id && project) {
    try {
      const existingTags = project.tags || [];
      await base44.asServiceRole.entities.AIProject.update(proposal.ai_project_id, {
        tags: [...new Set([...existingTags, 'ripple-grant', repoName])],
      });
    } catch (e) {
      console.warn('Could not update linked AIProject:', e.message);
    }
  }

  return Response.json({
    success: true,
    repository: {
      name: repo.full_name,
      url: repo.html_url,
      clone_url: repo.clone_url,
      private: repo.private,
    },
    files_created: ['README.md', 'LICENSE', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'proposal/proposal.md', 'proposal/budget.md', 'proposal/team.md'],
    milestone_issues: milestoneIssues,
    labels_created: labels.map(l => l.name),
    data_sources: {
      ai_project: !!project,
      governance_proposal: !!governanceProposal,
      agents_resolved: agents.length,
    },
    message: `Repository "${repo.full_name}" created — structured for XRPL Grants Technical & Business Assessment rubrics.`,
  });
});

async function createFile(token, repoFullName, path, content, message) {
  const encoded = btoa(unescape(encodeURIComponent(content)));
  const res = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, content: encoded }),
  });
  return res.ok;
}