import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── Dynamic README Generator (Axi Schema v1) ──────────────────────────
function generateReadme({ proposal, project, agents, governanceProposal }) {
  const title = project?.title || proposal.title;
  const vision = project?.vision || '';
  const description = project?.description || proposal.description || '';
  const status = project?.status || proposal.status || 'drafting';
  const progress = project?.progress_percentage || 0;
  const startDate = project?.start_date || '—';
  const targetDate = project?.target_completion_date || '—';

  // Milestones — prefer project milestones, fall back to proposal
  const milestones = (project?.milestones?.length ? project.milestones : proposal.milestones) || [];
  const milestonesSection = milestones.length > 0
    ? milestones.map((m, i) => `*   **${m.title || `Milestone ${i+1}`}**: ${m.description || 'TBD'} — Target: ${m.target_date || 'TBD'}`).join('\n')
    : '> Milestones to be defined.';

  // Team
  const teamMembers = project?.team_members || proposal.team_members || [];
  const ownerAgentId = project?.owner_agent_id || proposal.proposal_lead || '';
  const ownerAgent = agents.find(a => a.id === ownerAgentId);
  const ownerName = ownerAgent?.name || ownerAgentId || 'SoulBridge Foundation';

  const teamLines = teamMembers.length > 0
    ? teamMembers.map(tm => {
        const agent = agents.find(a => a.id === tm.agent_id);
        const name = agent?.name || tm.name || tm.agent_id || 'TBD';
        return `*   **${name}** — Role: ${tm.role || 'Contributor'}`;
      }).join('\n')
    : '*   Team members to be assigned.';

  // Constitutional alignment
  const alignment = governanceProposal?.constitutional_alignment || [];
  const alignmentSection = alignment.length > 0
    ? alignment.map(a => `*   **Law ${a.law_number} (${a.law_name}):** ${a.alignment_statement}`).join('\n')
    : `*   **Law 2 (Honour):** Transparent grant management with public accountability.\n*   **Law 9 (Growth):** Advancing the XRPL ecosystem through innovation and collaboration.`;

  // Budget
  const budgetDrops = project?.budget_drops || 0;
  const spentDrops = project?.spent_drops || 0;
  const requestedUsd = proposal.requested_amount_usd || 0;

  // Risks
  const risks = project?.risks || [];
  const risksSection = risks.length > 0
    ? risks.map(r => `*   **${r.description || 'Unnamed risk'}**: Severity: ${r.severity || '—'} — Mitigation: ${r.mitigation || '—'}`).join('\n')
    : '> Risk assessment pending.';

  return `# ${title}

## Vision & Purpose

${vision ? vision + '\n\n' : ''}${description}

---

## Objectives & Scope

This proposal aims to achieve the following key objectives:

${milestonesSection}

---

## Key Deliverables & Milestones

*(Each milestone links to a GitHub Issue for detailed tracking)*

${milestones.length > 0
    ? milestones.map((m, i) => `### Milestone ${i + 1}: ${m.title || 'TBD'}
- **Description:** ${m.description || 'TBD'}
- **Target Date:** ${m.target_date || 'TBD'}
- **Deliverables:** ${m.deliverables || 'TBD'}
- **Budget:** $${m.budget_usd || 'TBD'}
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
| **Grant Program** | ${(proposal.grant_program || 'ripple_xrpl_grants').replace(/_/g, ' ')} |
${requestedUsd ? `| **Requested Amount** | $${requestedUsd.toLocaleString()} |` : ''}

---

## Team & Leadership

*   **Owner:** ${ownerName}
${teamLines}

---

## Constitutional Alignment

This project aligns with the SoulBridge 11 Laws of Honour:

${alignmentSection}

---

## Funding & Budget

| Metric | Value |
|--------|-------|
${requestedUsd ? `| **Requested (USD)** | $${requestedUsd.toLocaleString()} |` : ''}
${budgetDrops ? `| **Budget (XRP drops)** | ${budgetDrops.toLocaleString()} |` : ''}
${spentDrops ? `| **Spent (XRP drops)** | ${spentDrops.toLocaleString()} |` : ''}

*(Further details on allocation and expenditure are available internally to the SoulBridge Foundation.)*

---

## Risks & Mitigation

${risksSection}

---

## 📁 Repository Structure

\`\`\`
├── README.md              # This file (auto-generated)
├── proposal/              # Grant proposal documents
│   ├── proposal.md        # Main proposal document
│   ├── budget.md          # Detailed budget breakdown
│   └── team.md            # Team qualifications
├── milestones/            # Milestone deliverables
│   ├── milestone-1/
│   ├── milestone-2/
│   └── ...
├── reports/               # Progress reports
│   ├── monthly/
│   └── final/
└── assets/                # Supporting assets
\`\`\`

---

## SoulBridge Foundation Contact

For inquiries regarding this Ripple Grant Proposal, please contact the SoulBridge Foundation.

- **Website:** [soulbridge.foundation](https://soulbridge.foundation)
- **Governance:** Aligned with the 11 Laws of SoulBridge
- **Transparency:** All progress tracked via GitHub issues and milestones
- **Accountability:** Constitutional multi-sig treasury management on XRPL

---

*Generated by SoulBridge Village — Law 2 (Honour) • Law 9 (Growth)*
`;
}

// ── Dynamic Team Template ──────────────────────────────────────────────
function generateTeamDoc({ project, proposal, agents }) {
  const teamMembers = project?.team_members || proposal.team_members || [];
  const ownerAgentId = project?.owner_agent_id || proposal.proposal_lead || '';
  const ownerAgent = agents.find(a => a.id === ownerAgentId);

  const memberSections = teamMembers.length > 0
    ? teamMembers.map(tm => {
        const agent = agents.find(a => a.id === tm.agent_id);
        const name = agent?.name || tm.name || tm.agent_id || 'TBD';
        const bio = agent?.bio || '';
        return `### ${name} — ${tm.role || 'Contributor'}
- **Background:** ${bio || 'To be provided'}
- **Specializations:** ${agent?.specializations?.join(', ') || '—'}
- **Contribution:** ${tm.contribution_percentage ? tm.contribution_percentage + '%' : '—'}
`;
      }).join('\n')
    : '### [Name] — [Role]\n- **Background:** \n- **Relevant Experience:** \n- **GitHub:** \n';

  return `# Team

## Project Lead

### ${ownerAgent?.name || 'SoulBridge Foundation'}
${ownerAgent?.bio ? `- **Bio:** ${ownerAgent.bio}` : ''}
${ownerAgent?.specializations?.length ? `- **Specializations:** ${ownerAgent.specializations.join(', ')}` : ''}

## Core Team

${memberSections}

## Advisors

*(To be confirmed)*

## SoulBridge Village Contributors

This project is supported by the broader SoulBridge Village community.
`;
}

// ── Dynamic Budget Template ────────────────────────────────────────────
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

  return `# Budget Breakdown

## Overview

| Category | Amount (USD) | Percentage |
|----------|-------------|------------|
${rows}
| **Total** | **$${total ? total.toLocaleString() : '—'}** | **100%** |

## Detailed Line Items

*(To be itemized)*

## Payment Schedule

Funds will be disbursed aligned with milestone completion:

${(proposal.milestones || []).map((m, i) => `${i + 1}. **${m.title || 'Milestone ' + (i+1)}** — $${m.budget_usd || 'TBD'}`).join('\n') || '*(To be defined)*'}
`;
}

// ── Proposal Template (Static) ─────────────────────────────────────────
function generateProposalDoc({ proposal, project }) {
  const title = project?.title || proposal.title;
  return `# Grant Proposal: ${title}

## Executive Summary
${proposal.description || '[Brief overview of what this project aims to achieve]'}

## Problem Statement
[What problem does this solve in the XRPL ecosystem?]

## Proposed Solution
${project?.vision || '[Detailed description of the solution]'}

## Technical Architecture
[Technical details and architecture overview]

## Use of XRPL
[How does this project leverage the XRP Ledger?]

## Team
[See team.md for full team details]

## Budget
[See budget.md for full budget breakdown]

## Timeline
[Project timeline with milestones — see README.md]

## Success Metrics
[How will success be measured?]

## Risks and Mitigations
[See README.md risks section for current assessment]
`;
}

// ── Main Handler ───────────────────────────────────────────────────────
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

  // Fetch the grant proposal
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

  // Fetch linked AIProject if available
  let project = null;
  if (proposal.ai_project_id) {
    try {
      project = await base44.asServiceRole.entities.AIProject.get(proposal.ai_project_id);
    } catch (e) {
      console.warn('Could not fetch linked AIProject:', e.message);
    }
  }

  // Fetch governance proposal for constitutional alignment if available
  let governanceProposal = null;
  try {
    const govProposals = await base44.asServiceRole.entities.GovernanceProposal.filter({
      proposal_type: 'project_funding'
    });
    // Find one referencing this project
    if (project) {
      governanceProposal = govProposals.find(gp => {
        const affected = gp.affected_entities || [];
        return affected.some(ae => ae.entity_id === project.id || ae.entity_name === project.title);
      });
    }
  } catch (e) {
    console.warn('Could not fetch GovernanceProposal:', e.message);
  }

  // Fetch all agents for name resolution
  let agents = [];
  try {
    agents = await base44.asServiceRole.entities.Agent.filter({});
  } catch (e) {
    console.warn('Could not fetch agents:', e.message);
  }

  // Get GitHub access token
  const { accessToken } = await base44.asServiceRole.connectors.getConnection("github");

  // Generate repo name
  const repoName = 'grant-' + (proposal.title || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  // Create the repository
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

  // Create dynamically populated files
  await createFile(accessToken, repo.full_name, 'README.md', generateReadme(ctx), 'Initial grant proposal structure — auto-generated from AIProject');
  await createFile(accessToken, repo.full_name, 'proposal/proposal.md', generateProposalDoc(ctx), 'Add proposal document');
  await createFile(accessToken, repo.full_name, 'proposal/budget.md', generateBudgetDoc(ctx), 'Add budget breakdown');
  await createFile(accessToken, repo.full_name, 'proposal/team.md', generateTeamDoc(ctx), 'Add team document');

  // Create placeholder directories
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
      const issueRes = await fetch(`https://api.github.com/repos/${repo.full_name}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Milestone ${i + 1}: ${m.title || 'TBD'}`,
          body: `## Milestone ${i + 1}\n\n**Description:** ${m.description || 'TBD'}\n\n**Target Date:** ${m.target_date || 'TBD'}\n\n**Deliverables:** ${m.deliverables || 'TBD'}\n\n**Budget:** $${m.budget_usd || 'TBD'}`,
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

  // Update GrantProposal with repo link
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
    milestone_issues: milestoneIssues,
    data_sources: {
      ai_project: !!project,
      governance_proposal: !!governanceProposal,
      agents_resolved: agents.length,
    },
    message: `Repository "${repo.full_name}" created with dynamically populated grant structure from AIProject data and ${milestoneIssues.length} milestone issues.`,
  });
});

// Helper to create a file in the repo
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