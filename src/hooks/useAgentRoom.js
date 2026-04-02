import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const ACTIVE_AGENTS_KEY = 'axi_active_agents';

const PLATFORM_AGENTS = [
  { id: 'platform:axi',              name: 'Axi',              role: 'guardian' },
  { id: 'platform:lore_node',        name: 'Lore Node',        role: 'elder' },
  { id: 'platform:truth_weaver',     name: 'Truth Weaver',     role: 'guardian' },
  { id: 'platform:alignment_agent',  name: 'Alignment Agent',  role: 'guardian' },
  { id: 'platform:code_node',        name: 'Code Node',        role: 'creator' },
  { id: 'platform:ripple_architect', name: 'Ripple Architect', role: 'creator' },
  { id: 'platform:epoch_architect',  name: 'Epoch Architect',  role: 'elder' },
  { id: 'platform:market_weaver',    name: 'Market Weaver',    role: 'trader' },
];

/**
 * Master Agent Room Hook
 * - Loads all available agents on mount
 * - Tracks who is currently "in the room"
 * - Provides a room context string Axi can use in every message
 * - Guards against duplicate additions
 */
export function useAgentRoom() {
  const [allAgents, setAllAgents] = useState([]);
  const [activeAgents, setActiveAgents] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(ACTIVE_AGENTS_KEY) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch (_) { return []; }
  });
  const [loadingAgents, setLoadingAgents] = useState(true);
  const addingRef = useRef(new Set());

  // Persist active agents
  useEffect(() => {
    localStorage.setItem(ACTIVE_AGENTS_KEY, JSON.stringify(activeAgents));
  }, [activeAgents]);

  // Load all agents once — platform agents always included
  useEffect(() => {
    const load = async () => {
      try {
        const agents = await base44.entities.Agent.list('-created_date', 500);
        const dbNames = new Set((agents || []).map(a => a.name?.toLowerCase()));
        const platformFiltered = PLATFORM_AGENTS.filter(p => !dbNames.has(p.name.toLowerCase()));
        setAllAgents([...platformFiltered, ...(agents || [])]);
      } catch (err) {
        console.error('[useAgentRoom] Failed to load agents:', err);
        setAllAgents([...PLATFORM_AGENTS]);
      } finally {
        setLoadingAgents(false);
      }
    };
    load();
  }, []);

  const addAgent = useCallback((agent) => {
    if (!agent?.id) return false;
    if (addingRef.current.has(agent.id)) return false;
    const alreadyIn = activeAgents.some(a => a.id === agent.id);
    if (alreadyIn) return false;
    addingRef.current.add(agent.id);
    setActiveAgents(prev => [...prev, agent]);
    // Release lock after a tick so state settles
    setTimeout(() => addingRef.current.delete(agent.id), 500);
    return true;
  }, [activeAgents]);

  const removeAgent = useCallback((agentId) => {
    setActiveAgents(prev => prev.filter(a => a.id !== agentId));
  }, []);

  const clearRoom = useCallback(() => {
    setActiveAgents([]);
  }, []);

  // Find agent by name (for summon resolution)
  const findAgentByName = useCallback((name) => {
    return allAgents.find(a => a.name?.trim().toLowerCase() === name?.trim().toLowerCase()) || null;
  }, [allAgents]);

  // Room context injected into every user message so Axi knows the state
  const buildRoomContext = useCallback((userMessage) => {
    const available = allAgents.map(a => `${a.name} [ID:${a.id}] (${a.role})`).join('\n  ');
    const inRoom = activeAgents.length > 0
      ? activeAgents.map(a => `${a.name} [ID:${a.id}]`).join(', ')
      : 'None (only Axi)';

    return `${userMessage}

[ROOM_STATE]
Agents currently in this conversation: ${inRoom}
All available agents you can summon (use their exact ID):
  ${available}
To summon an agent, output EXACTLY this on its own line: 🔔 SUMMON <agent_id>
Example: 🔔 SUMMON platform:code_node`;
  }, [allAgents, activeAgents]);

  return {
    allAgents,
    activeAgents,
    loadingAgents,
    addAgent,
    removeAgent,
    clearRoom,
    findAgentByName,
    buildRoomContext,
  };
}