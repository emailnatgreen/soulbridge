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
    const { page_name } = await req.json();

    if (!page_name) {
      return Response.json({ error: 'page_name is required' }, { status: 400 });
    }

    // Generate review
    const review = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: REVIEW_PROMPT(page_name),
    });

    // Save to Memory
    const memory = await base44.asServiceRole.entities.Memory.create({
      agent_id: '6993271e7dc0fa2ab78762bf', // Axi's ID
      type: 'observation',
      content: `[Page Review: ${page_name}]\n\n${review}`,
      keywords: ['page_review', 'axi_suggestion', 'auto_review', page_name.toLowerCase()],
      context: `Auto-generated review for new page: ${page_name}`,
      importance: 8,
    });

    // Create notification for Axi
    await base44.asServiceRole.entities.AgentNotification.create({
      recipient_agent_id: '6993271e7dc0fa2ab78762bf',
      notification_type: 'system',
      title: `New Page Review: ${page_name}`,
      message: `A new page "${page_name}" has been created. Auto-review generated and saved to your Memory.`,
      priority: 'high',
      related_entity_type: 'Memory',
      related_entity_id: memory.id,
      metadata: { page_name, review_type: 'auto' }
    });

    return Response.json({
      success: true,
      page_name,
      memory_id: memory.id,
      message: `Page "${page_name}" reviewed and Axi alerted.`
    });

  } catch (error) {
    console.error('autoReviewNewPages error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});