import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Users, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AgentDropdown from '@/components/AgentDropdown';
import AxiChannels from '@/components/AxiChannels';

export default function DynamicFloatingConnectButton() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeMode, setActiveMode] = useState(null); // 'agents' | 'axi' | null
  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  // Fetch active agents when expanding
  useEffect(() => {
    if (isExpanded && agents.length === 0) {
      fetchAgents();
    }
  }, [isExpanded]);

  // Filter agents based on search
  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredAgents(
        agents.filter(a =>
          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.role?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredAgents(agents);
    }
  }, [searchQuery, agents]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const activeAgents = await base44.entities.Agent.filter({ status: 'active' });
      setAgents(activeAgents || []);
      setFilteredAgents(activeAgents || []);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsExpanded(false);
    setActiveMode(null);
    setSearchQuery('');
  };

  return (
    <>
      {/* Floating Button Container */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.div
            ref={containerRef}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-40 flex gap-2"
          >
            {/* Left: Agent Dropdown Button */}
            <Button
              onClick={() => {
                setIsExpanded(true);
                setActiveMode('agents');
              }}
              className="h-14 px-5 rounded-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 shadow-2xl border border-slate-600/50 flex items-center gap-2"
              title="Connect with agents"
            >
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">Connect</span>
            </Button>

            {/* Right: Axi Button */}
            <Button
              onClick={() => {
                setIsExpanded(true);
                setActiveMode('axi');
              }}
              className="h-14 w-14 rounded-full bg-gradient-to-br from-purple-700 to-pink-700 hover:from-purple-800 hover:to-pink-800 shadow-2xl hover:shadow-purple-600/50 flex items-center justify-center border border-purple-500/30"
              title="Talk to Axi"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-40 bg-slate-950/98 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-96 max-h-[600px] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
              <h3 className="text-lg font-semibold text-white">
                {activeMode === 'agents' ? 'Connect with Agents' : 'Talk to Axi'}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {activeMode === 'agents' && (
                <AgentDropdown
                  agents={filteredAgents}
                  loading={loading}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onSelectAgent={() => handleClose()}
                />
              )}

              {activeMode === 'axi' && (
                <AxiChannels onClose={handleClose} />
              )}
            </div>

            {/* Footer Navigation */}
            {activeMode && (
              <div className="p-3 border-t border-white/10 flex gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveMode(activeMode === 'agents' ? 'axi' : 'agents')}
                  className="flex-1 border-white/20 text-white/80 hover:text-white h-8"
                >
                  {activeMode === 'agents' ? 'Switch to Axi' : 'Switch to Agents'}
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleClose();
              }
            }}
            className="fixed inset-0 z-30 bg-black/20"
          />
        )}
      </AnimatePresence>
    </>
  );
}