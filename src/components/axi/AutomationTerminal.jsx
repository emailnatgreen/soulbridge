import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Terminal, Send, X, Maximize2, Minimize2 } from 'lucide-react';

export default function AutomationTerminal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState([
    { type: 'system', text: '🤖 Automation Terminal Ready · Natural language automation control' }
  ]);
  const [isExecuting, setIsExecuting] = useState(false);
  const logsEndRef = useRef(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const addLog = (type, text) => {
    setLogs(prev => [...prev, { type, text, timestamp: new Date().toLocaleTimeString() }]);
  };

  const executeFunctionByName = async (functionName) => {
    try {
      addLog('info', `▶ Executing: ${functionName}`);
      setIsExecuting(true);
      
      const response = await base44.functions.invoke(functionName, {});
      
      if (response.status === 200) {
        addLog('success', `✓ ${functionName} completed successfully`);
        const data = response.data;
        if (data && typeof data === 'object') {
          addLog('output', JSON.stringify(data, null, 2).substring(0, 500));
        }
      } else {
        addLog('error', `✗ ${functionName} failed with status ${response.status}`);
      }
    } catch (err) {
      addLog('error', `✗ Error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCommand = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    addLog('command', `$ ${input}`);
    setInput('');

    // Simple natural language parsing
    const lower = input.toLowerCase();

    if (lower.includes('check') && lower.includes('honor')) {
      await executeFunctionByName('checkAndScoreHonor');
    } else if (lower.includes('automation') && lower.includes('status')) {
      await executeFunctionByName('getAutomationStatus');
    } else if (lower.includes('monitor') && lower.includes('automation')) {
      await executeFunctionByName('monitorCriticalAutomations');
    } else if (lower.includes('generate') && lower.includes('report')) {
      await executeFunctionByName('generateDailyReport');
    } else if (lower.includes('clear')) {
      setLogs([{ type: 'system', text: '🤖 Logs cleared' }]);
    } else if (lower.includes('help')) {
      addLog('info', 'Available commands: check honor | automation status | monitor automation | generate report | clear');
    } else {
      addLog('warning', '⚠ Command not recognized. Try: "check honor", "automation status", "monitor automation", "generate report"');
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-40 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-lg shadow-lg transition-all"
        title="Automation Terminal"
      >
        <Terminal className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed top-0 right-0 z-50 w-full md:w-[500px] h-full md:h-auto md:max-h-[600px] md:rounded-b-xl md:rounded-r-none bg-slate-900 border-b md:border-b md:border-r border-slate-700 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 p-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-white">Automation Terminal</span>
          {isExecuting && <span className="text-xs text-amber-300 animate-pulse">executing...</span>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-slate-700 rounded transition-all"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4 text-slate-400" /> : <Minimize2 className="w-4 h-4 text-slate-400" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-slate-700 rounded transition-all"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      {!isMinimized && (
        <>
          {/* Logs Display */}
          <div className="flex-1 overflow-y-auto p-3 font-mono text-sm bg-slate-950 space-y-1">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={`${
                  log.type === 'command' ? 'text-cyan-400' :
                  log.type === 'success' ? 'text-green-400' :
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'warning' ? 'text-yellow-400' :
                  log.type === 'output' ? 'text-slate-300' :
                  log.type === 'system' ? 'text-indigo-400' :
                  'text-slate-400'
                }`}
              >
                {log.timestamp && <span className="text-slate-600">[{log.timestamp}]</span>} {log.text}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleCommand} className="p-3 border-t border-slate-700 bg-slate-900">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter command (e.g., 'check honor', 'automation status')..."
                className="bg-slate-800 border-slate-600 text-white text-xs placeholder:text-slate-500"
                disabled={isExecuting}
              />
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                disabled={isExecuting}
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}