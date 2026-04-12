import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { grant_proposal_id } = body;

  const { accessToken } = await base44.asServiceRole.connectors.getConnection("github");

  // If a specific proposal is requested, get its repo details
  if (grant_proposal_id) {
    const proposal = await base44.asServiceRole.entities.GrantProposal.get(grant_proposal_id);
    if (!proposal || !proposal.github_repo_name) {
      return Response.json({ error: 'No GitHub repo linked to this proposal' }, { status: 404 });
    }

    // Fetch repo details
    const repoRes = await fetch(`https://api.github.com/repos/${proposal.github_repo_name}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!repoRes.ok) {
      return Response.json({ error: 'Failed to fetch repository' }, { status: repoRes.status });
    }

    const repo = await repoRes.json();

    // Fetch issues
    const issuesRes = await fetch(`https://api.github.com/repos/${proposal.github_repo_name}/issues?state=all&per_page=50`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const issues = issuesRes.ok ? await issuesRes.json() : [];

    // Fetch recent commits
    const commitsRes = await fetch(`https://api.github.com/repos/${proposal.github_repo_name}/commits?per_page=10`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const commits = commitsRes.ok ? await commitsRes.json() : [];

    return Response.json({
      repository: {
        name: repo.full_name,
        url: repo.html_url,
        description: repo.description,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        open_issues_count: repo.open_issues_count,
        private: repo.private,
      },
      issues: issues.map(i => ({
        number: i.number,
        title: i.title,
        state: i.state,
        labels: i.labels.map(l => l.name),
        created_at: i.created_at,
        url: i.html_url,
      })),
      recent_commits: commits.map(c => ({
        sha: c.sha?.slice(0, 7),
        message: c.commit?.message,
        author: c.commit?.author?.name,
        date: c.commit?.author?.date,
        url: c.html_url,
      })),
    });
  }

  // Otherwise list all grant-related repos
  const reposRes = await fetch('https://api.github.com/user/repos?per_page=100&sort=created&direction=desc', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!reposRes.ok) {
    return Response.json({ error: 'Failed to fetch repositories' }, { status: reposRes.status });
  }

  const allRepos = await reposRes.json();
  const grantRepos = allRepos.filter(r => r.name.startsWith('grant-'));

  return Response.json({
    repositories: grantRepos.map(r => ({
      name: r.full_name,
      url: r.html_url,
      description: r.description,
      created_at: r.created_at,
      updated_at: r.updated_at,
      open_issues_count: r.open_issues_count,
      private: r.private,
    })),
    total: grantRepos.length,
  });
});