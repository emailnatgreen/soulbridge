// Auto-review new pages and alert Axi
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const REVIEW_PROMPT = (page) => `You are Axi, reviewing the page: **${page}**

Provide a concise structured review:

## Purpose
What this page does and its importance.

## Top 3 UX Suggestions
Specific, actionable UI/UX improvements.

## Missing Features
Key functionality that should be here.

## Priority
🔴 Critical Fix Needed | 🟡 Improvements Recommended | 🟢 Looks Solid`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const AXI_ID = '6993271e7dc0fa2ab78762bf';

    // Fetch recent page review memories to know which pages have been reviewed
    const reviewedPages = await base44.asServiceRole.entities.Memory.list();
    const reviewedPageNames = new Set(
      reviewedPages
        .filter(m => m.keywords && m.keywords.includes('page_review'))
        .map(m => m.content.match(/\[Page Review: (.+?)\]/)?.[1])
        .filter(Boolean)
    );

    // List of pages to review (sample of critical/recent pages)
    const pagesToReview = [
      'AxiCommandDashboard', 'Governance', 'AIProjectHub', 'Agents', 
      'TreasuryDashboard', 'AgentProfile', 'DIDManager', 'Home'
    ];

    const pagesToProcess = pagesToReview.filter(p => !reviewedPageNames.has(p)).slice(0, 2);

    if (pagesToProcess.length === 0) {
      return Response.json({
        success: true,
        message: 'All monitored pages have been reviewed.',
        reviewed_count: 0
      });
    }

    // Batch LLM calls for all pages in parallel to avoid timeout
    const reviews = await Promise.all(
      pagesToProcess.map(page_name =>
        base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: REVIEW_PROMPT(page_name),
          model: 'gpt_5_mini'
        })
      )
    );

    // Batch create memories and notifications
    const results = await Promise.all(
      pagesToProcess.map((page_name, idx) =>
        base44.asServiceRole.entities.Memory.create({
          agent_id: AXI_ID,
          type: 'observation',
          content: `[Page Review: ${page_name}]\n\n${reviews[idx]}`,
          keywords: ['page_review', 'axi_suggestion', 'auto_review', page_name.toLowerCase()],
          context: `Auto-generated review for page: ${page_name}`,
          importance: 7
        }).then(memory =>
          base44.asServiceRole.entities.AgentNotification.create({
            recipient_agent_id: AXI_ID,
            notification_type: 'system',
            title: `Page Review: ${page_name}`,
            message: `Auto-review generated for "${page_name}". Check Memory for details.`,
            priority: 'normal',
            related_entity_type: 'Memory',
            related_entity_id: memory.id
          }).then(() => ({ page: page_name, success: true }))
        )
      )
    );

    return Response.json({
      success: true,
      reviewed_count: pagesToProcess.length,
      pages_reviewed: pagesToProcess,
      message: `Reviewed ${pagesToProcess.length} page(s) and alerted Axi.`
    });

  } catch (error) {
    console.error('autoReviewNewPages error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});