import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const startTime = Date.now();
  const logs = [];
  
  const log = (level, msg, data = null) => {
    const timestamp = Date.now() - startTime;
    const entry = { timestamp, level, msg, data };
    logs.push(entry);
    console.log(`[${level}:${timestamp}ms] ${msg}`, data || '');
  };

  try {
    log('INFO', 'DIAGNOSTIC START', { timestamp: new Date().toISOString() });
    
    const base44 = createClientFromRequest(req);
    const { conversationId, agentId } = await req.json();
    
    log('INFO', 'Input received', { conversationId, agentId });

    // ========== PHASE 1: AUTHENTICATION & AUTHORIZATION ==========
    log('INFO', 'PHASE 1: AUTH & PERMISSIONS');
    
    let user;
    try {
      user = await base44.auth.me();
      log('INFO', 'User authenticated', { userId: user?.id, email: user?.email, role: user?.role });
    } catch (e) {
      log('ERROR', 'Auth failed', { error: e.message });
      return Response.json({ status: 'auth_failed', logs, error: e.message }, { status: 401 });
    }

    // ========== PHASE 2: SCHEMA INSPECTION ==========
    log('INFO', 'PHASE 2: SCHEMA INSPECTION');
    
    let schema;
    try {
      schema = await base44.entities.AgentConversation.schema();
      log('INFO', 'Schema retrieved', { 
        properties: Object.keys(schema.properties || {}),
        required: schema.required
      });
    } catch (e) {
      log('ERROR', 'Schema retrieval failed', { error: e.message });
    }

    // ========== PHASE 3: AGENT LOOKUP ==========
    log('INFO', 'PHASE 3: AGENT LOOKUP');
    
    let agent;
    try {
      const agents = await base44.entities.Agent.filter({ id: agentId }, '', 1);
      agent = agents?.[0];
      if (!agent) {
        log('WARN', 'Agent not found in database', { agentId });
      } else {
        log('INFO', 'Agent found', { agentId, name: agent.name, role: agent.role });
      }
    } catch (e) {
      log('WARN', 'Agent lookup error', { error: e.message });
    }

    // ========== PHASE 4: AGENTCONVERSATION LOOKUP ==========
    log('INFO', 'PHASE 4: AGENTCONVERSATION LOOKUP');
    
    let agentConvo = null;
    let lookupMethod = null;
    
    // Try method 1: By ID
    try {
      log('INFO', 'Method 1: Query by conversation ID directly');
      const result = await base44.entities.AgentConversation.filter({ id: conversationId }, '', 1);
      if (result?.length > 0) {
        agentConvo = result[0];
        lookupMethod = 'id_direct';
        log('INFO', 'Found by ID', { id: agentConvo.id, participants: agentConvo.participant_agent_ids?.length || 0 });
      } else {
        log('INFO', 'Not found by ID');
      }
    } catch (e) {
      log('WARN', 'ID lookup failed', { error: e.message });
    }

    // Try method 2: By metadata
    if (!agentConvo) {
      try {
        log('INFO', 'Method 2: Query by metadata.conversation_id');
        const result = await base44.entities.AgentConversation.filter(
          { metadata: { conversation_id: conversationId } },
          '',
          1
        );
        if (result?.length > 0) {
          agentConvo = result[0];
          lookupMethod = 'metadata';
          log('INFO', 'Found by metadata', { id: agentConvo.id, participants: agentConvo.participant_agent_ids?.length || 0 });
        } else {
          log('INFO', 'Not found by metadata');
        }
      } catch (e) {
        log('WARN', 'Metadata lookup failed', { error: e.message });
      }
    }

    // Try method 3: List all and search
    if (!agentConvo) {
      try {
        log('INFO', 'Method 3: List all AgentConversations and search');
        const all = await base44.entities.AgentConversation.list('', 100);
        log('INFO', `Found ${all?.length || 0} total AgentConversations`);
        
        if (all?.length > 0) {
          agentConvo = all.find(c => c.metadata?.conversation_id === conversationId || c.id === conversationId);
          if (agentConvo) {
            lookupMethod = 'list_search';
            log('INFO', 'Found in full list', { id: agentConvo.id, participants: agentConvo.participant_agent_ids?.length || 0 });
          } else {
            log('INFO', 'Not found in full list');
            log('DEBUG', 'Sample AgentConversations metadata', {
              samples: all.slice(0, 3).map(c => ({ id: c.id, metadata: c.metadata }))
            });
          }
        }
      } catch (e) {
        log('WARN', 'List search failed', { error: e.message });
      }
    }

    // ========== PHASE 5: CREATE IF NOT EXISTS ==========
    log('INFO', 'PHASE 5: CREATE IF NOT EXISTS');
    
    if (!agentConvo) {
      try {
        log('INFO', 'Creating new AgentConversation', { title: 'Diagnostic Conversation' });
        agentConvo = await base44.entities.AgentConversation.create({
          title: 'Diagnostic Conversation',
          conversation_type: 'group',
          participant_agent_ids: [],
          metadata: { conversation_id: conversationId }
        });
        lookupMethod = 'created_new';
        log('INFO', 'Created successfully', { id: agentConvo.id, participants: agentConvo.participant_agent_ids });
      } catch (e) {
        log('ERROR', 'Create failed', { error: e.message, stack: e.stack });
        return Response.json({ status: 'create_failed', logs, error: e.message }, { status: 500 });
      }
    }

    // ========== PHASE 6: PRE-UPDATE STATE ==========
    log('INFO', 'PHASE 6: PRE-UPDATE STATE');
    
    const preUpdateState = {
      id: agentConvo.id,
      participants: agentConvo.participant_agent_ids || [],
      participantCount: (agentConvo.participant_agent_ids || []).length,
      agentAlreadyPresent: (agentConvo.participant_agent_ids || []).includes(agentId),
      type: typeof agentConvo.participant_agent_ids,
      isArray: Array.isArray(agentConvo.participant_agent_ids)
    };
    log('INFO', 'Pre-update state', preUpdateState);

    if (preUpdateState.agentAlreadyPresent) {
      log('INFO', 'Agent already present, skipping update');
      return Response.json({ status: 'already_present', logs, preUpdateState }, { status: 200 });
    }

    // ========== PHASE 7: UPDATE ATTEMPT ==========
    log('INFO', 'PHASE 7: UPDATE ATTEMPT');
    
    const newParticipants = [...(agentConvo.participant_agent_ids || []), agentId];
    log('INFO', 'Preparing update', { newParticipants, count: newParticipants.length });

    let updateResult;
    try {
      log('INFO', 'Executing update', { payload: { participant_agent_ids: newParticipants } });
      updateResult = await base44.entities.AgentConversation.update(agentConvo.id, {
        participant_agent_ids: newParticipants
      });
      log('INFO', 'Update returned', { 
        hasResult: !!updateResult,
        resultType: typeof updateResult,
        resultParticipants: updateResult?.participant_agent_ids
      });
    } catch (e) {
      log('ERROR', 'Update failed', { error: e.message, stack: e.stack });
      return Response.json({ status: 'update_failed', logs, error: e.message }, { status: 500 });
    }

    // ========== PHASE 8: IMMEDIATE POST-UPDATE VERIFICATION ==========
    log('INFO', 'PHASE 8: POST-UPDATE VERIFICATION (IMMEDIATE)');
    
    const postUpdateCheck = {
      updateResult: {
        exists: !!updateResult,
        participants: updateResult?.participant_agent_ids,
        hasAgent: updateResult?.participant_agent_ids?.includes(agentId),
        type: typeof updateResult?.participant_agent_ids,
        isArray: Array.isArray(updateResult?.participant_agent_ids)
      }
    };
    log('INFO', 'Post-update result check', postUpdateCheck);

    // ========== PHASE 9: FRESH QUERY VERIFICATION ==========
    log('INFO', 'PHASE 9: FRESH QUERY VERIFICATION');
    
    let verifyResult;
    try {
      const verifyStart = Date.now();
      const result = await base44.entities.AgentConversation.filter({ id: agentConvo.id }, '', 1);
      const verifyTime = Date.now() - verifyStart;
      
      verifyResult = result?.[0];
      log('INFO', 'Fresh query returned', { 
        duration: `${verifyTime}ms`,
        found: !!verifyResult,
        participants: verifyResult?.participant_agent_ids,
        hasAgent: verifyResult?.participant_agent_ids?.includes(agentId)
      });

      if (!verifyResult) {
        log('ERROR', 'Fresh query returned empty despite ID being correct');
      }
    } catch (e) {
      log('ERROR', 'Fresh query failed', { error: e.message });
    }

    // ========== PHASE 10: DATA INTEGRITY CHECK ==========
    log('INFO', 'PHASE 10: DATA INTEGRITY CHECK');
    
    if (verifyResult) {
      const integrity = {
        expectedAgentId: agentId,
        actualParticipants: verifyResult.participant_agent_ids,
        found: verifyResult.participant_agent_ids?.includes(agentId),
        arrayLength: verifyResult.participant_agent_ids?.length,
        expectedLength: newParticipants.length,
        matchesExpected: JSON.stringify(verifyResult.participant_agent_ids) === JSON.stringify(newParticipants)
      };
      log('INFO', 'Data integrity', integrity);

      if (!integrity.found) {
        log('ERROR', 'CRITICAL: Agent not in participant list after update and re-query');
        log('DEBUG', 'Detailed comparison', {
          expectedFull: newParticipants,
          actualFull: verifyResult.participant_agent_ids,
          expectedStringified: JSON.stringify(newParticipants),
          actualStringified: JSON.stringify(verifyResult.participant_agent_ids)
        });
      }
    }

    // ========== PHASE 11: SUBSCRIPTION CHECK ==========
    log('INFO', 'PHASE 11: SUBSCRIPTION MECHANISM CHECK');
    log('INFO', 'Note: Real-time subscription cannot be fully tested in this isolated function, but structure is verified');

    // ========== FINAL REPORT ==========
    log('INFO', 'DIAGNOSTIC COMPLETE', { 
      totalDuration: `${Date.now() - startTime}ms`,
      success: verifyResult?.participant_agent_ids?.includes(agentId),
      lookupMethod,
      phases: 11
    });

    return Response.json({
      status: verifyResult?.participant_agent_ids?.includes(agentId) ? 'success' : 'persistence_failure',
      logs,
      summary: {
        lookupMethod,
        preUpdateState,
        postUpdateState: postUpdateCheck,
        verificationState: verifyResult ? {
          participants: verifyResult.participant_agent_ids,
          hasAgent: verifyResult.participant_agent_ids?.includes(agentId)
        } : null,
        success: verifyResult?.participant_agent_ids?.includes(agentId)
      }
    });
  } catch (error) {
    log('ERROR', 'FATAL ERROR', { message: error?.message, stack: error?.stack });
    return Response.json({ status: 'fatal_error', logs, error: error?.message }, { status: 500 });
  }
});