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
      const saved = localStorage.getItem(ACTIVE_AGENTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [loadingAgents, setLoadingAgents] = useState(true);
  const addingRef = useRef(new Set());

  // Persist active agents to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(ACTIVE_AGENTS_KEY, JSON.stringify(activeAgents));
  }, [activeAgents]);

  // Load all agents once — platform agents always included, then poll for updates
  useEffect(() => {
    const load = async () => {
      try {
        const agents = await base44.entities.Agent.list('-created_date', 500);
        const platformByName = {};
        PLATFORM_AGENTS.forEach(p => { platformByName[p.name.toLowerCase()] = p; });
        const merged = (agents || []).map(a => {
          const platformMatch = platformByName[a.name?.toLowerCase()];
          if (platformMatch) {
            return { ...a, _isPlatformAgent: true, _agentName: platformMatch._agentName || platformMatch.id?.replace('platform:', '') };
          }
          return a;
        });
        const dbNames = new Set((agents || []).map(a => a.name?.toLowerCase()));
        const platformOnly = PLATFORM_AGENTS.filter(p => !dbNames.has(p.name.toLowerCase()));
        const allAvailable = [...platformOnly, ...merged];
        setAllAgents(allAvailable);

        // Rehydrate saved active agents with full data from the freshly loaded list
        setActiveAgents(prev => {
          if (prev.length === 0) return prev;
          const lookup = {};
          allAvailable.forEach(a => { lookup[a.id] = a; });
          return prev.map(saved => lookup[saved.id] || saved);
        });
      } catch (err) {
        console.error('[useAgentRoom] Failed to load agents:', err);
        setAllAgents([...PLATFORM_AGENTS]);
      } finally {
        setLoadingAgents(false);
      }
    };
    load();
    // Poll every 60 seconds for new agents (reduced from 8s)
    const interval = setInterval(load, 60000);
    // Also listen for cross-tab agent creation signals
    const handleSignal = (e) => {
      if (e.detail?.type === 'agent_created') load();
    };
    window.addEventListener('soulbridge-signal', handleSignal);
    return () => {
      clearInterval(interval);
      window.removeEventListener('soulbridge-signal', handleSignal);
    };
  }, []);

  const addAgent = useCallback((agent) => {
    if (!agent?.id) return false;
    if (addingRef.current.has(agent.id)) return false;
    addingRef.current.add(agent.id);
    // Use functional updater so multiple rapid adds don't clobber each other
    let wasAdded = false;
    setActiveAgents(prev => {
      if (prev.some(a => a.id === agent.id)) return prev;
      wasAdded = true;
      return [...prev, agent];
    });
    // Release lock after a short delay
    setTimeout(() => addingRef.current.delete(agent.id), 1000);
    return true; // optimistic — the functional updater handles dedup
  }, []);

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
  // IMPORTANT: Do NOT advertise available agents — this causes Axi to auto-summon them
  const buildRoomContext = useCallback((userMessage) => {
    if (activeAgents.length === 0) return userMessage;

    const inRoom = activeAgents.map(a => `${a.name} [ID:${a.id}]`).join(', ');

    return `${userMessage}

[ROOM_STATE]
Agents currently in this conversation: ${inRoom}
Do NOT summon additional agents unless the user explicitly asks you to.`;
  }, [activeAgents]);

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