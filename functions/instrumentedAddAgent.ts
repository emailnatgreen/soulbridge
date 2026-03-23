import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * UNIFIED DIAGNOSTIC: Traces agent addition across all layers with raw DB verification
 * Returns complete audit trail of every state change
 */
Deno.serve(async (req) => {
  const globalStartTime = Date.now();
  const trace = {
    timeline: [],
    dbStates: [],
    sdkCalls: [],
    errors: [],
    finalVerdictSuccessful: false
  };

  const mark = (phase, step, data = {}) => {
    const timestamp = Date.now() - globalStartTime;
    const entry = { timestamp, phase, step, data };
    trace.timeline.push(entry);
    console.log(`[${timestamp}ms] [${phase}] ${step}`, JSON.stringify(data));
  };

  const recordDbState = (label, state) => {
    trace.dbStates.push({
      label,
      timestamp: Date.now() - globalStartTime,
      state
    });
  };

  const recordSdkCall = (method, args, result, error = null) => {
    trace.sdkCalls.push({
      method,
      args,
      result,
      error,
      timestamp: Date.now() - globalStartTime
    });
  };

  try {
    mark('INIT', 'Diagnostic started');

    // Parse input
    const { agentConvoId, agentId } = await req.json();
    mark('INPUT', 'Received payload', { agentConvoId, agentId });

    // Initialize SDK with full auth context
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    mark('AUTH', 'User authenticated', { userId: user?.id, email: user?.email });

    // ===== PHASE 1: PRE-OPERATION STATE =====
    mark('PHASE_1', 'Querying existing AgentConversation');
    
    let preState;
    try {
      const result = await base44.entities.AgentConversation.filter(
        { id: agentConvoId },
        '',
        1
      );
      preState = result?.[0];
      recordSdkCall('AgentConversation.filter', { id: agentConvoId }, preState);
      mark('PHASE_1', 'Query succeeded', {
        found: !!preState,
        currentParticipants: preState?.participant_agent_ids || [],
        id: preState?.id
      });
      recordDbState('PRE_OPERATION', {
        agentConvoId: preState?.id,
        participant_agent_ids: preState?.participant_agent_ids,
        participant_count: preState?.participant_agent_ids?.length || 0,
        type_of_array: typeof preState?.participant_agent_ids,
        is_array: Array.isArray(preState?.participant_agent_ids)
      });
    } catch (e) {
      mark('PHASE_1', 'Query FAILED', { error: e.message });
      throw e;
    }

    if (!preState) {
      throw new Error(`AgentConversation ${agentConvoId} not found`);
    }

    // Check if agent already present
    const alreadyPresent = preState.participant_agent_ids?.includes(agentId);
    mark('PHASE_1', 'Agent presence check', { 
      agentId, 
      alreadyPresent,
      currentList: preState.participant_agent_ids
    });

    if (alreadyPresent) {
      mark('PHASE_1', 'Agent already present, returning early');
      recordDbState('ALREADY_PRESENT', preState.participant_agent_ids);
      return Response.json({
        status: 'already_present',
        trace,
        finalState: preState
      });
    }

    // ===== PHASE 2: PREPARE UPDATE =====
    mark('PHASE_2', 'Preparing update payload');
    
    const currentParticipants = preState.participant_agent_ids || [];
    const newParticipants = [...currentParticipants, agentId];
    
    mark('PHASE_2', 'Update payload prepared', {
      currentParticipants,
      agentToAdd: agentId,
      newParticipants,
      arrayLength: newParticipants.length
    });

    // ===== PHASE 3: EXECUTE UPDATE =====
    mark('PHASE_3', 'Executing AgentConversation.update');
    
    let updateResult;
    try {
      const updateStart = Date.now();
      updateResult = await base44.entities.AgentConversation.update(
        agentConvoId,
        { participant_agent_ids: newParticipants }
      );
      const updateDuration = Date.now() - updateStart;
      
      recordSdkCall('AgentConversation.update', 
        { id: agentConvoId, payload: { participant_agent_ids: newParticipants } },
        updateResult
      );
      
      mark('PHASE_3', 'Update returned successfully', {
        duration: `${updateDuration}ms`,
        resultExists: !!updateResult,
        resultParticipants: updateResult?.participant_agent_ids,
        hasAgent: updateResult?.participant_agent_ids?.includes(agentId),
        resultType: typeof updateResult
      });
      
      recordDbState('IMMEDIATELY_POST_UPDATE_SDK_RESULT', {
        update_returned_participants: updateResult?.participant_agent_ids,
        agent_in_result: updateResult?.participant_agent_ids?.includes(agentId),
        result_id: updateResult?.id
      });
    } catch (e) {
      mark('PHASE_3', 'Update FAILED', { error: e.message, stack: e.stack });
      throw e;
    }

    // ===== PHASE 4: IMMEDIATE FRESH QUERY =====
    mark('PHASE_4', 'Performing immediate fresh query (no delay)');
    
    let freshQuery1;
    try {
      const freshStart = Date.now();
      freshQuery1 = await base44.entities.AgentConversation.filter(
        { id: agentConvoId },
        '',
        1
      );
      const freshDuration = Date.now() - freshStart;
      
      const freshState = freshQuery1?.[0];
      recordSdkCall('AgentConversation.filter (FRESH_1)', { id: agentConvoId }, freshState);
      
      mark('PHASE_4', 'Fresh query returned', {
        duration: `${freshDuration}ms`,
        found: !!freshState,
        participants: freshState?.participant_agent_ids,
        hasAgent: freshState?.participant_agent_ids?.includes(agentId),
        type: typeof freshState?.participant_agent_ids
      });
      
      recordDbState('FRESH_QUERY_1_RESULT', {
        participants: freshState?.participant_agent_ids,
        agent_present: freshState?.participant_agent_ids?.includes(agentId),
        count: freshState?.participant_agent_ids?.length || 0
      });
    } catch (e) {
      mark('PHASE_4', 'Fresh query FAILED', { error: e.message });
      throw e;
    }

    // ===== PHASE 5: SMALL DELAY & RE-QUERY =====
    mark('PHASE_5', 'Waiting 500ms for potential consistency window');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    mark('PHASE_5', 'Performing delayed fresh query (after 500ms)');
    
    let freshQuery2;
    try {
      freshQuery2 = await base44.entities.AgentConversation.filter(
        { id: agentConvoId },
        '',
        1
      );
      
      const delayedState = freshQuery2?.[0];
      recordSdkCall('AgentConversation.filter (FRESH_2_DELAYED)', { id: agentConvoId }, delayedState);
      
      mark('PHASE_5', 'Delayed fresh query returned', {
        participants: delayedState?.participant_agent_ids,
        hasAgent: delayedState?.participant_agent_ids?.includes(agentId)
      });
      
      recordDbState('FRESH_QUERY_2_DELAYED_RESULT', {
        participants: delayedState?.participant_agent_ids,
        agent_present: delayedState?.participant_agent_ids?.includes(agentId)
      });
    } catch (e) {
      mark('PHASE_5', 'Delayed query FAILED', { error: e.message });
    }

    // ===== PHASE 6: LIST ALL FOR RAW INSPECTION =====
    mark('PHASE_6', 'Listing all AgentConversations for raw inspection');
    
    let allConvos;
    try {
      allConvos = await base44.entities.AgentConversation.list('', 200);
      recordSdkCall('AgentConversation.list', {}, { count: allConvos?.length });
      
      const targetConvo = allConvos?.find(c => c.id === agentConvoId);
      mark('PHASE_6', 'Raw inspection complete', {
        totalConvos: allConvos?.length,
        targetFound: !!targetConvo,
        targetParticipants: targetConvo?.participant_agent_ids,
        targetHasAgent: targetConvo?.participant_agent_ids?.includes(agentId)
      });
      
      recordDbState('RAW_LIST_INSPECTION', {
        target_found_in_list: !!targetConvo,
        participants_in_list: targetConvo?.participant_agent_ids,
        agent_present: targetConvo?.participant_agent_ids?.includes(agentId)
      });
    } catch (e) {
      mark('PHASE_6', 'List all FAILED', { error: e.message });
    }

    // ===== PHASE 7: DETERMINE VERDICT =====
    mark('PHASE_7', 'Determining operation verdict');
    
    const verdict = {
      updateReturned: !!updateResult,
      updateHasAgent: updateResult?.participant_agent_ids?.includes(agentId),
      freshQuery1Returned: !!freshQuery1?.[0],
      freshQuery1HasAgent: freshQuery1?.[0]?.participant_agent_ids?.includes(agentId),
      freshQuery2Returned: !!freshQuery2?.[0],
      freshQuery2HasAgent: freshQuery2?.[0]?.participant_agent_ids?.includes(agentId),
      rawListHasRecord: !!allConvos?.find(c => c.id === agentConvoId),
      rawListHasAgent: allConvos?.find(c => c.id === agentConvoId)?.participant_agent_ids?.includes(agentId)
    };
    
    trace.finalVerdictSuccessful = verdict.freshQuery1HasAgent && verdict.updateHasAgent;
    
    mark('PHASE_7', 'Verdict determined', verdict);

    // ===== FINAL REPORT =====
    mark('COMPLETE', 'Diagnostic finished', {
      success: trace.finalVerdictSuccessful,
      totalDuration: `${Date.now() - globalStartTime}ms`,
      phases: 7
    });

    return Response.json({
      status: trace.finalVerdictSuccessful ? 'success' : 'persistence_mismatch',
      trace,
      verdict,
      recommendation: generateRecommendation(verdict)
    });

  } catch (error) {
    trace.errors.push({
      phase: 'FATAL',
      message: error?.message,
      stack: error?.stack
    });
    mark('FATAL_ERROR', 'Unhandled exception', { error: error?.message });
    return Response.json({
      status: 'fatal_error',
      trace,
      error: error?.message
    }, { status: 500 });
  }
});

function generateRecommendation(verdict) {
  if (verdict.updateHasAgent && verdict.freshQuery1HasAgent && verdict.rawListHasAgent) {
    return 'VERDICT: SUCCESS - Agent properly persisted at all layers';
  }
  
  if (verdict.updateHasAgent && !verdict.freshQuery1HasAgent) {
    return 'VERDICT: CRITICAL - Update returned agent, but immediate fresh query does not. This indicates SDK deserialization or read consistency issue.';
  }
  
  if (!verdict.updateHasAgent) {
    return 'VERDICT: CRITICAL - Update SDK call did not return agent in response. Data was not committed or not returned by SDK.';
  }
  
  if (verdict.freshQuery1HasAgent && !verdict.freshQuery2HasAgent) {
    return 'VERDICT: CRITICAL - Inconsistent state: Agent present in first query, absent in second (500ms delay). Indicates eventual consistency issue or subscription event triggering.';
  }
  
  if (verdict.rawListHasAgent && !verdict.freshQuery1HasAgent) {
    return 'VERDICT: CRITICAL - Agent in raw list but not in filtered query. Filter logic may be broken or SDK filter has a bug.';
  }
  
  return 'VERDICT: CRITICAL - Unknown state mismatch pattern detected.';
}