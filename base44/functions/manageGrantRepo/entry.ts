import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { action, repo_full_name } = body;

    if (!repo_full_name) {
      return Response.json({ error: 'repo_full_name is required' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("github");
    const ghHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    if (action === 'make_public') {
      // Update repo visibility to public
      const res = await fetch(`https://api.github.com/repos/${repo_full_name}`, {
        method: 'PATCH',
        headers: ghHeaders,
        body: JSON.stringify({ private: false }),
      });

      if (!res.ok) {
        const err = await res.json();
        return Response.json({ error: 'Failed to make repo public', details: err }, { status: res.status });
      }

      const repo = await res.json();

      // Update the GrantProposal entity if linked
      const proposals = await base44.asServiceRole.entities.GrantProposal.filter({ github_repo_name: repo_full_name });
      if (proposals.length > 0) {
        // Add a note about public visibility
        const existingNotes = proposals[0].notes || '';
        await base44.asServiceRole.entities.GrantProposal.update(proposals[0].id, {
          notes: `${existingNotes}\n[${new Date().toISOString()}] Repository made public for Ripple review.`.trim(),
        });
      }

      return Response.json({
        success: true,
        repo_name: repo.full_name,
        url: repo.html_url,
        private: repo.private,
        message: `Repository "${repo.full_name}" is now PUBLIC. Invite codes remain protected in Base44 (never stored in repo).`,
      });
    }

    if (action === 'make_private') {
      const res = await fetch(`https://api.github.com/repos/${repo_full_name}`, {
        method: 'PATCH',
        headers: ghHeaders,
        body: JSON.stringify({ private: true }),
      });

      if (!res.ok) {
        const err = await res.json();
        return Response.json({ error: 'Failed to make repo private', details: err }, { status: res.status });
      }

      const repo = await res.json();
      return Response.json({
        success: true,
        repo_name: repo.full_name,
        url: repo.html_url,
        private: repo.private,
        message: `Repository "${repo.full_name}" is now PRIVATE.`,
      });
    }

    return Response.json({ error: `Unknown action: ${action}. Use 'make_public' or 'make_private'.` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});