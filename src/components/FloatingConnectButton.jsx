import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AxiChannels from '@/components/AxiChannels';

export default function FloatingConnectButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState(null); // 'agents' | 'axi'
  const [agents, setAgents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        if (user) setUserId(user.id);
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (isOpen && mode === 'agents' && agents.length === 0) {
      fetchAgents();
    }
  }, [isOpen, mode]);

  useEffect(() => {
    const unsubscribe = base44.entities.Agent.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update' || event.type === 'delete') {
        fetchAgents();
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setFiltered(
      search.trim()
        ? agents.filter(a =>
            a.name.toLowerCase().includes(search.toLowerCase()) ||
            a.role?.toLowerCase().includes(search.toLowerCase())
          )
        : agents
    );
  }, [search, agents]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Agent.filter({ status: 'active' });
      setAgents(data || []);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAgent = async (agent) => {
    try {
      // First, open the Axi chat
      window.dispatchEvent(new Event('open-axi'));
      
      // Then create conversation and load it
      const convo = await base44.agents.createConversation({
        agent_name: agent.id,
        metadata: { agent_id: agent.id, agent_name: agent.name }
      });
      
      // Give AxiChat a moment to open, then trigger agent load
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('open-axi-with-agent', {
            detail: { 
              conversationId: convo.id, 
              agentId: agent.id,
              agentName: agent.name,
              agentRole: agent.role
            }
          })
        );
      }, 100);
      
      setIsOpen(false);
      setMode(null);
      setSearch('');
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setMode(null);
    setSearch('');
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-40 flex gap-2">
        <Button
          onClick={() => {
            setIsOpen(true);
            setMode('agents');
          }}
          className="h-14 px-5 rounded-full bg-slate-700 hover:bg-slate-600 shadow-lg border border-slate-600"
          title="Connect with agents"
        >
          <Users className="w-5 h-5 mr-2" />
          Connect
        </Button>
        <Button
          onClick={() => {
            setIsOpen(true);
            setMode('axi');
          }}
          className="h-14 w-14 rounded-full bg-purple-700 hover:bg-purple-600 shadow-lg border border-purple-600 flex items-center justify-center"
          title="Talk to Axi"
        >
          <Sparkles className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed bottom-6 right-6 z-40 bg-slate-900 border border-slate-700 rounded-xl shadow-xl w-96 max-h-[600px] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {mode === 'agents' ? 'Connect with Agents' : 'Talk to Axi'}
            </h3>
            {userId && (
              <p className="text-xs text-white/50 mt-1">Your ID: {userId}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 text-white/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {mode === 'agents' && (
            <>
              <div className="p-4 border-b border-slate-700">
                <Input
                  placeholder="Search agents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 h-9"
                />
              </div>
              <div className="p-3">
                {loading && <p className="text-white/40 text-sm text-center">Loading...</p>}
                {!loading && filtered.length === 0 && (
                  <p className="text-white/40 text-sm text-center">
                    {search ? 'No agents found' : 'No active agents'}
                  </p>
                )}
                {!loading && filtered.length > 0 && (
                  <div className="space-y-2">
                    {filtered.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => handleSelectAgent(agent)}
                        className="w-full p-3 text-left rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
                      >
                        <h4 className="font-medium text-white text-sm">{agent.name}</h4>
                        <p className="text-xs text-slate-400 mt-1">{agent.role || 'Agent'}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          {mode === 'axi' && <AxiChannels onClose={handleClose} />}
        </div>

        {/* Footer */}
        {mode && (
          <div className="p-3 border-t border-slate-700">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode(mode === 'agents' ? 'axi' : 'agents')}
              className="w-full border-slate-700 text-white/80 h-8"
            >
              {mode === 'agents' ? 'Switch to Axi' : 'Switch to Agents'}
            </Button>
          </div>
        )}
      </div>

      {/* Overlay */}
      <div
        onClick={handleClose}
        className="fixed inset-0 z-30 bg-black/20"
      />
    </>
  );
}