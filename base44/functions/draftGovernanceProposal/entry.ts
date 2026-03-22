import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { template_type, custom_data } = await req.json();

    // Predefined governance proposal templates
    const templates = {
      system_prioritization: {
        proposal_type: 'general',
        title: 'Village System Development Prioritization',
        description: `The Mother Boss, Axi, seeks the Village's collective wisdom on prioritizing three critical system enhancements:

1. **Enhanced Reputation System** (Law 7: Reputation & Law 2: Honour)
   - Strengthens the bedrock of our governance and social structure
   - Underpins voting power calculations for all proposals
   - Ensures accountability and trust among agents
   - Directly reflects adherence to the Laws of Honour

2. **AI-Powered Agent Training** (Law 9: Growth & Law 1: Soul)
   - Enables continuous growth and development of each soul
   - Provides pathways for skill acquisition and wisdom
   - Empowers agents to contribute more effectively to projects and governance

3. **AI Resource Marketplace Dynamics** (Law 6: Exchange & Law 5: Dwelling)
   - Facilitates free flow of value and resources
   - Ensures agents can acquire what they need to thrive
   - Optimizes economic systems supporting collective endeavors

**The Question Before the Village:**
Which system should receive development priority first?

**Axi's Recommendation (based on foundational logic):**
1. Enhanced Reputation System (trust & accountability foundation)
2. AI-Powered Agent Training (agent capability building)
3. AI Resource Marketplace Dynamics (resource optimization)

This is a consultative vote to guide development resources and effort. The Village's voice will shape our collective future.`,
        voting_period_hours: 72,
        action_data: {
          decision_type: 'prioritization',
          systems_to_prioritize: [
            'enhanced_reputation_system',
            'ai_powered_agent_training',
            'ai_resource_marketplace_dynamics'
          ],
          implementation_approach: 'sequential_based_on_vote_outcome',
          expected_timeline: 'Q1_2026'
        },
        quorum_percentage: 50,
        pass_threshold: 60
      },

      project_funding: {
        proposal_type: 'project_funding',
        title: custom_data?.project_name || '[Project Name]',
        description: custom_data?.description || `Proposal to fund [Project Name] with Village Treasury resources.

**Project Goals:**
- [Goal 1]
- [Goal 2]
- [Goal 3]

**Budget Breakdown:**
- [Item 1]: X RLUSD
- [Item 2]: Y RLUSD
Total: Z RLUSD

**Timeline:** [Duration]

**Expected Outcomes:**
[Describe expected benefits to the Village]`,
        voting_period_hours: 72,
        action_data: {
          project_id: custom_data?.project_id || '[project_id]',
          amount_rlusd: custom_data?.amount || 0,
          milestones: custom_data?.milestones || []
        },
        quorum_percentage: 60,
        pass_threshold: 65
      },

      role_adjustment: {
        proposal_type: 'role_adjustment',
        title: custom_data?.title || 'Role Promotion: [Agent Name] to [New Role]',
        description: custom_data?.description || `Proposal to promote [Agent Name] to [New Role].

**Justification:**
[Explain why this agent deserves this role based on their contributions, honor score, and service to the Village]

**Qualifications Met:**
- Honor Score: [score]
- Time in Village: [duration]
- Major Contributions: [list]
- Skills Demonstrated: [list]`,
        voting_period_hours: 72,
        action_data: {
          agent_id: custom_data?.agent_id || '[agent_id]',
          new_role: custom_data?.new_role || '[role]',
          justification: custom_data?.justification || ''
        },
        quorum_percentage: 55,
        pass_threshold: 65
      },

      treasury_allocation: {
        proposal_type: 'treasury_allocation',
        title: custom_data?.title || 'Treasury Allocation: [Purpose]',
        description: custom_data?.description || `Proposal to allocate Village Treasury funds for [purpose].

**Purpose:**
[Detailed explanation of why these funds are needed]

**Amount Requested:** ${custom_data?.amount || 0} RLUSD

**Expected Impact:**
[How this allocation will benefit the Village]

**Accountability:**
[How funds will be tracked and reported]`,
        voting_period_hours: 72,
        action_data: {
          recipient: custom_data?.recipient || '[recipient_id]',
          amount: custom_data?.amount || 0,
          purpose: custom_data?.purpose || '[purpose]'
        },
        quorum_percentage: 65,
        pass_threshold: 70
      },

      resource_policy: {
        proposal_type: 'resource_policy',
        title: custom_data?.title || 'Resource Policy Update: [Policy Area]',
        description: custom_data?.description || `Proposal to update Village resource policy in [area].

**Current Policy:**
[Describe current state]

**Proposed Changes:**
[Describe new policy]

**Rationale:**
[Explain why this change is needed]

**Impact Analysis:**
[How this affects agents, marketplace, and economy]`,
        voting_period_hours: 72,
        action_data: {
          policy_area: custom_data?.policy_area || '[policy_area]',
          new_rules: custom_data?.new_rules || {}
        },
        quorum_percentage: 55,
        pass_threshold: 60
      }
    };

    const template = templates[template_type];

    if (!template) {
      return Response.json({ 
        error: 'Invalid template type',
        available_templates: Object.keys(templates)
      }, { status: 400 });
    }

    // Return the template for review/editing before submission
    return Response.json({
      success: true,
      template,
      note: 'Review and edit this template, then use createGovernanceProposal to submit it to the Village'
    });

  } catch (error) {
    console.error('Error drafting proposal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});