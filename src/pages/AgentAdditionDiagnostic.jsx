import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

export default function AgentAdditionDiagnostic() {
  const [agentConvoId, setAgentConvoId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [expandedPhases, setExpandedPhases] = useState(new Set());
  const [agents, setAgents] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const agentList = await base44.entities.Agent.list('-honor_score', 20);
        setAgents(agentList || []);

        const convoList = await base44.entities.AgentConversation.list('', 20);
        setConversations(convoList || []);
      } catch (e) {
        console.error('Failed to load data:', e);
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, []);

  const runDiagnostic = async () => {
    if (!agentConvoId || !agentId) {
      alert('Please select both an Agent Conversation and an Agent');
      return;
    }

    setRunning(true);
    setResults(null);

    try {
      const response = await base44.functions.invoke('instrumentedAddAgent', {
        agentConvoId,
        agentId
      });

      setResults(response.data);
    } catch (error) {
      setResults({
        status: 'error',
        error: error?.message || 'Unknown error'
      });
    } finally {
      setRunning(false);
    }
  };

  const togglePhase = (phaseIndex) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseIndex)) {
      newExpanded.delete(phaseIndex);
    } else {
      newExpanded.add(phaseIndex);
    }
    setExpandedPhases(newExpanded);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Agent Addition Diagnostic</h1>
          <p className="text-slate-400">Real-time unified trace across frontend, SDK, and backend layers</p>
        </div>

        {/* Control Panel */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Select Test Parameters</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Agent Conversation Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Agent Conversation
              </label>
              {loadingData ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              ) : (
                <select
                  value={agentConvoId}
                  onChange={(e) => setAgentConvoId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Select a conversation --</option>
                  {conversations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title || c.id.slice(0, 8)}... ({c.participant_agent_ids?.length || 0} agents)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Agent Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Agent to Add
              </label>
              {loadingData ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              ) : (
                <select
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Select an agent --</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.role})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Manual ID Entry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pt-4 border-t border-slate-700">
            <Input
              placeholder="Or paste Conversation ID"
              value={agentConvoId}
              onChange={(e) => setAgentConvoId(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
            <Input
              placeholder="Or paste Agent ID"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          {/* Run Button */}
          <Button
            onClick={runDiagnostic}
            disabled={running || !agentConvoId || !agentId}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-10"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Diagnostic...
              </>
            ) : (
              'Run Full Trace Diagnostic'
            )}
          </Button>
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-6">
            {/* Verdict */}
            <div className={`rounded-2xl p-6 border ${
              results.status === 'success'
                ? 'bg-green-900/20 border-green-500/50'
                : 'bg-red-900/20 border-red-500/50'
            }`}>
              <div className="flex items-start gap-4">
                {results.status === 'success' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {results.status === 'success' ? 'Diagnostic Passed' : 'Diagnostic Failed'}
                  </h3>
                  <p className="text-slate-300 mb-4">{results.recommendation}</p>

                  {results.verdict && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Update Returned:</span>
                        <span className={results.verdict.updateHasAgent ? 'text-green-400' : 'text-red-400'}>
                          {' '}{results.verdict.updateHasAgent ? '✓' : '✗'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Fresh Query 1:</span>
                        <span className={results.verdict.freshQuery1HasAgent ? 'text-green-400' : 'text-red-400'}>
                          {' '}{results.verdict.freshQuery1HasAgent ? '✓' : '✗'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Fresh Query 2 (500ms):</span>
                        <span className={results.verdict.freshQuery2HasAgent ? 'text-green-400' : 'text-red-400'}>
                          {' '}{results.verdict.freshQuery2HasAgent ? '✓' : '✗'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Raw List Inspection:</span>
                        <span className={results.verdict.rawListHasAgent ? 'text-green-400' : 'text-red-400'}>
                          {' '}{results.verdict.rawListHasAgent ? '✓' : '✗'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Full Timeline</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.trace?.timeline?.map((entry, idx) => (
                  <div key={idx} className="text-xs text-slate-400 font-mono">
                    <span className="text-purple-400">[{entry.timestamp}ms]</span>
                    <span className="text-slate-500"> {entry.phase}</span>
                    <span className="text-white"> {entry.step}</span>
                    {Object.keys(entry.data).length > 0 && (
                      <span className="text-slate-500"> {JSON.stringify(entry.data).slice(0, 60)}...</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* DB States */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Database State Snapshots</h3>
              <div className="space-y-4">
                {results.trace?.dbStates?.map((state, idx) => (
                  <div key={idx} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                    <div className="font-semibold text-purple-300 mb-2">{state.label}</div>
                    <pre className="text-xs text-slate-300 overflow-auto max-h-32">
                      {JSON.stringify(state.state, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            {/* SDK Calls */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">SDK Call Log</h3>
              <div className="space-y-3">
                {results.trace?.sdkCalls?.map((call, idx) => (
                  <div key={idx} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                    <div className="text-sm font-semibold text-blue-300">{call.method}</div>
                    {call.error ? (
                      <div className="text-xs text-red-400 mt-2">Error: {call.error}</div>
                    ) : (
                      <pre className="text-xs text-slate-300 mt-2 max-h-20 overflow-auto">
                        {JSON.stringify(call.result, null, 2).slice(0, 200)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}