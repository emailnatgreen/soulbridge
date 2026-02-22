import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { systems = ['all'] } = await req.json();

    const testResults = {
      timestamp: new Date().toISOString(),
      systems_tested: [],
      issues_detected: [],
      recommendations: []
    };

    // Test Governance System
    if (systems.includes('all') || systems.includes('governance')) {
      const proposals = await base44.asServiceRole.entities.GovernanceProposal.list('-created_date', 10);
      const votes = await base44.asServiceRole.entities.GovernanceVote.list('-created_date', 50);
      
      testResults.systems_tested.push({
        system: 'Governance',
        status: 'healthy',
        metrics: {
          active_proposals: proposals.filter(p => p.status === 'active').length,
          total_votes: votes.length,
          participation_rate: votes.length / (proposals.length || 1)
        }
      });

      if (proposals.filter(p => p.status === 'active').length === 0) {
        testResults.recommendations.push({
          system: 'Governance',
          recommendation: 'No active proposals - consider generating governance challenges'
        });
      }
    }

    // Test Economic System
    if (systems.includes('all') || systems.includes('economy')) {
      const listings = await base44.asServiceRole.entities.ResourceListing.filter({ status: 'available' });
      const purchases = await base44.asServiceRole.entities.ResourcePurchase.list('-created_date', 50);
      
      testResults.systems_tested.push({
        system: 'Economy',
        status: 'healthy',
        metrics: {
          active_listings: listings.length,
          recent_transactions: purchases.length,
          market_activity: purchases.filter(p => p.status === 'completed').length
        }
      });

      if (listings.length < 5) {
        testResults.recommendations.push({
          system: 'Economy',
          recommendation: 'Low marketplace inventory - generate resource listings'
        });
      }
    }

    // Test Agent Activity
    if (systems.includes('all') || systems.includes('agents')) {
      const agents = await base44.asServiceRole.entities.Agent.filter({ status: 'active' });
      const recentPerformance = await base44.asServiceRole.entities.AgentPerformanceMetrics.list('-created_date', 20);
      
      testResults.systems_tested.push({
        system: 'Agent Activity',
        status: 'healthy',
        metrics: {
          active_agents: agents.length,
          performance_tracked: recentPerformance.length,
          activity_ratio: recentPerformance.length / (agents.length || 1)
        }
      });

      if (agents.length < 10) {
        testResults.recommendations.push({
          system: 'Agents',
          recommendation: 'Agent population low - generate new agents'
        });
      }
    }

    // Test Project System
    if (systems.includes('all') || systems.includes('projects')) {
      const projects = await base44.asServiceRole.entities.AIProject.list('-created_date', 20);
      const tasks = await base44.asServiceRole.entities.ProjectTask.list('-created_date', 50);
      
      testResults.systems_tested.push({
        system: 'Projects',
        status: 'healthy',
        metrics: {
          active_projects: projects.filter(p => p.status === 'active').length,
          total_tasks: tasks.length,
          completion_rate: tasks.filter(t => t.status === 'completed').length / (tasks.length || 1)
        }
      });

      if (projects.filter(p => p.status === 'active').length < 3) {
        testResults.recommendations.push({
          system: 'Projects',
          recommendation: 'Few active projects - generate collaborative projects'
        });
      }
    }

    // Generate AI analysis of overall health
    const analysisPrompt = `Analyze SoulBridge Village system health:

Test Results: ${JSON.stringify(testResults, null, 2)}

Provide:
1. Overall system health score (0-100)
2. Critical issues requiring immediate attention
3. Optimization opportunities
4. Generative actions Axi should take

Return ONLY valid JSON:
{
  "health_score": 85,
  "critical_issues": ["issue1"],
  "optimizations": ["opt1", "opt2"],
  "recommended_actions": ["action1", "action2"]
}`;

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          health_score: { type: "number" },
          critical_issues: { type: "array", items: { type: "string" } },
          optimizations: { type: "array", items: { type: "string" } },
          recommended_actions: { type: "array", items: { type: "string" } }
        }
      }
    });

    return Response.json({ 
      success: true,
      test_results: testResults,
      ai_analysis: analysis
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});