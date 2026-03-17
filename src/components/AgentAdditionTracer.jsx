import React, { useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * HOC/Utility to trace agent addition flow in real-time
 * Wraps handleAddAgent to capture every state change and timing
 */
export function createTracedAddAgent(originalHandler) {
  return async function tracedAddAgent(agent) {
    const traceId = `trace_${Date.now()}`;
    const startTime = Date.now();
    const events = [];

    const event = (phase, step, data = {}) => {
      const timestamp = Date.now() - startTime;
      const entry = { timestamp, phase, step, data, traceId };
      events.push(entry);
      console.log(`[TRACE:${traceId}:${timestamp}ms] [${phase}] ${step}`, data);
      window.dispatchEvent(new CustomEvent('agent-trace-event', { detail: entry }));
    };

    event('FRONTEND', 'Add agent handler invoked', { agentId: agent.id, agentName: agent.name });

    try {
      // Call the original handler but wrapped with tracing
      event('FRONTEND', 'Calling original handleAddAgent');
      
      const result = await originalHandler(agent);
      
      event('FRONTEND', 'handleAddAgent returned successfully', { result });
      return result;
    } catch (error) {
      event('FRONTEND', 'handleAddAgent threw error', { 
        error: error?.message,
        stack: error?.stack 
      });
      throw error;
    } finally {
      event('FRONTEND', 'Handler complete', { 
        totalDuration: `${Date.now() - startTime}ms`,
        eventCount: events.length
      });
      
      // Log the full trace for debugging
      console.log(`[TRACE:${traceId}] FULL TIMELINE:`, events);
      window.dispatchEvent(new CustomEvent('agent-trace-complete', { detail: { traceId, events } }));
    }
  };
}

/**
 * Hook to monitor component state during agent addition
 */
export function useAgentTraceMonitor(activeAgents, agentConvoId) {
  const previousAgentsRef = useRef([]);
  const previousIdRef = useRef(null);

  React.useEffect(() => {
    const prevAgents = previousAgentsRef.current;
    const prevId = previousIdRef.current;

    if (prevId !== agentConvoId) {
      console.log('[TRACE] agentConvoId changed', {
        from: prevId,
        to: agentConvoId,
        timestamp: Date.now()
      });
    }

    if (JSON.stringify(prevAgents) !== JSON.stringify(activeAgents)) {
      const added = activeAgents.filter(a => !prevAgents.some(p => p.id === a.id));
      const removed = prevAgents.filter(p => !activeAgents.some(a => a.id === p.id));
      
      if (added.length > 0 || removed.length > 0) {
        console.log('[TRACE] activeAgents changed', {
          previous: prevAgents.map(a => ({ id: a.id, name: a.name })),
          current: activeAgents.map(a => ({ id: a.id, name: a.name })),
          added: added.map(a => a.id),
          removed: removed.map(a => a.id),
          timestamp: Date.now()
        });
      }
    }

    previousAgentsRef.current = activeAgents;
    previousIdRef.current = agentConvoId;
  }, [activeAgents, agentConvoId]);

  return {
    logStateSnapshot: (label) => {
      console.log(`[TRACE:SNAPSHOT] ${label}`, {
        activeAgents: activeAgents.map(a => ({ id: a.id, name: a.name })),
        agentConvoId,
        timestamp: Date.now()
      });
    }
  };
}

/**
 * Utility to test the instrumented flow end-to-end
 */
export async function testInstrumentedAddAgent(agentConvoId, agentId) {
  console.log('[TEST] Starting instrumented add agent test', { agentConvoId, agentId });

  try {
    const response = await base44.functions.invoke('instrumentedAddAgent', {
      agentConvoId,
      agentId
    });

    console.log('[TEST] Full response:', response.data);
    console.log('[TEST] Trace timeline:', response.data.trace.timeline);
    console.log('[TEST] DB states:', response.data.trace.dbStates);
    console.log('[TEST] SDK calls:', response.data.trace.sdkCalls);
    console.log('[TEST] Verdict:', response.data.verdict);
    console.log('[TEST] Recommendation:', response.data.recommendation);

    return {
      success: response.data.status === 'success',
      trace: response.data.trace,
      verdict: response.data.verdict,
      recommendation: response.data.recommendation
    };
  } catch (error) {
    console.error('[TEST] Test failed:', error);
    throw error;
  }
}