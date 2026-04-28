import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Code2, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Copy, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

// Fields managed by the platform — read-only in the JSON editor
const READONLY_FIELDS = ['id', 'created_date', 'updated_date', 'created_by'];

export default function AgentJsonEditor({ agentData, onAgentDataChange }) {
  const [expanded, setExpanded] = useState(false);
  const [rawJson, setRawJson] = useState('');
  const [parseError, setParseError] = useState(null);

  // Sync rawJson whenever agentData changes from the form
  useEffect(() => {
    if (!agentData) return;
    // Show a clean copy without read-only fields
    const editable = { ...agentData };
    READONLY_FIELDS.forEach(f => delete editable[f]);
    setRawJson(JSON.stringify(editable, null, 2));
    setParseError(null);
  }, [agentData]);

  const handleJsonChange = (e) => {
    const val = e.target.value;
    setRawJson(val);

    try {
      const parsed = JSON.parse(val);
      setParseError(null);
      // Strip any read-only fields the user may have pasted
      READONLY_FIELDS.forEach(f => delete parsed[f]);
      onAgentDataChange(parsed);
    } catch (err) {
      setParseError(err.message);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(rawJson);
    toast.success('Agent JSON copied to clipboard');
  };

  const handleReset = () => {
    if (!agentData) return;
    const editable = { ...agentData };
    READONLY_FIELDS.forEach(f => delete editable[f]);
    setRawJson(JSON.stringify(editable, null, 2));
    setParseError(null);
    toast.info('Reset to current saved values');
  };

  return (
    <Card className="bg-white/[0.03] border-white/10">
      <CardHeader
        className="cursor-pointer select-none py-3 px-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xs font-medium text-white/60">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            Agent Metadata (JSON Editor)
          </CardTitle>
          <div className="flex items-center gap-2">
            {parseError ? (
              <Badge className="bg-red-500/10 text-red-300 border-red-500/30 text-[8px] gap-1">
                <AlertTriangle className="w-2.5 h-2.5" /> Parse Error
              </Badge>
            ) : (
              <Badge className="bg-green-500/10 text-green-300 border-green-500/30 text-[8px] gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" /> Valid JSON
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-white/30 text-[9px]">
              Edit the full Agent entity as JSON. Changes sync bidirectionally with the form fields above.
            </p>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={handleCopy} className="text-white/30 hover:text-white h-6 px-2 text-[9px] gap-1">
                <Copy className="w-2.5 h-2.5" /> Copy
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-white/30 hover:text-white h-6 px-2 text-[9px] gap-1">
                <RotateCcw className="w-2.5 h-2.5" /> Reset
              </Button>
            </div>
          </div>

          <textarea
            value={rawJson}
            onChange={handleJsonChange}
            className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-[11px] font-mono text-cyan-200/80 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 outline-none resize-y transition-colors"
            style={{ minHeight: '300px', maxHeight: '700px', tabSize: 2 }}
            spellCheck={false}
          />

          {parseError && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-300 text-[10px] font-mono">{parseError}</p>
            </div>
          )}

          <p className="text-white/20 text-[8px]">
            Read-only fields ({READONLY_FIELDS.join(', ')}) are excluded. All other fields are editable. Advanced users can add custom metadata, achievements, portfolio, testimonials, etc.
          </p>
        </CardContent>
      )}
    </Card>
  );
}