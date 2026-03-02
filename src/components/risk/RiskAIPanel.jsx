import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import {
  Brain, Loader2, AlertTriangle, ShieldAlert, Sparkles,
  Plus, ChevronDown, ChevronUp, Zap, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const SEVERITY_COLOR = {
  Low: 'bg-green-100 text-green-800 border-green-200',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  High: 'bg-orange-100 text-orange-800 border-orange-200',
  Critical: 'bg-red-100 text-red-800 border-red-200',
};

const OVERALL_COLOR = {
  Low: 'border-green-300 bg-green-50',
  Medium: 'border-yellow-300 bg-yellow-50',
  High: 'border-orange-300 bg-orange-50',
  Critical: 'border-red-300 bg-red-50',
};

export default function RiskAIPanel({ onAddRisk }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [addedRisks, setAddedRisks] = useState(new Set());
  const [analyzedAt, setAnalyzedAt] = useState(null);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('analyzeRisks', {});
      if (res.data?.analysis) {
        setAnalysis(res.data.analysis);
        setAnalyzedAt(res.data.analyzed_at);
        setAddedRisks(new Set());
        toast.success('AI risk analysis complete');
      }
    } catch (e) {
      toast.error('Analysis failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRisk = (risk) => {
    onAddRisk({
      name: risk.name,
      description: risk.description,
      category: risk.category,
      severity: risk.severity,
      likelihood: risk.likelihood,
      mitigation_plan: risk.mitigation_plan,
      impact_description: risk.impact_description,
      status: 'Identified',
    });
    setAddedRisks(prev => new Set([...prev, risk.name]));
    toast.success(`"${risk.name}" added to Risk Register`);
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2 text-purple-900">
            <Brain className="w-5 h-5 text-purple-600" />
            AI Risk Intelligence
          </CardTitle>
          <Button
            onClick={runAnalysis}
            disabled={loading}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {loading ? (
              <><Loader2 className="w-3 h-3 animate-spin mr-1.5" /> Analysing...</>
            ) : (
              <><Sparkles className="w-3 h-3 mr-1.5" /> {analysis ? 'Re-analyse' : 'Analyse Now'}</>
            )}
          </Button>
        </div>
        {!analysis && !loading && (
          <p className="text-sm text-purple-600/70 mt-1">
            Scans agent communications & system alerts to proactively identify emerging risks.
          </p>
        )}
        {analyzedAt && (
          <p className="text-xs text-purple-400 mt-1 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Analysed {new Date(analyzedAt).toLocaleTimeString()}
          </p>
        )}
      </CardHeader>

      {loading && (
        <CardContent>
          <div className="text-center py-8">
            <Brain className="w-10 h-10 text-purple-400 mx-auto mb-3 animate-pulse" />
            <p className="text-purple-700 font-medium text-sm">Scanning agent communications & system logs...</p>
            <p className="text-purple-500 text-xs mt-1">This may take 10–20 seconds</p>
          </div>
        </CardContent>
      )}

      {analysis && !loading && (
        <CardContent className="space-y-4">

          {/* Overall risk level + summary */}
          <div className={`rounded-lg border p-3 ${OVERALL_COLOR[analysis.overall_risk_level] || 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-4 h-4" />
              <span className="font-semibold text-sm">Overall Ecosystem Risk: </span>
              <Badge className={`${SEVERITY_COLOR[analysis.overall_risk_level]} border text-xs`}>
                {analysis.overall_risk_level}
              </Badge>
            </div>
            <p className="text-sm text-gray-700">{analysis.summary}</p>
          </div>

          {/* High-risk activity alerts */}
          {analysis.high_risk_activities?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3" /> Contextual Alerts
              </p>
              {analysis.high_risk_activities.map((a, i) => (
                <div key={i} className="flex gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-800 font-medium">{a.activity}</p>
                    <p className="text-xs text-red-600 mt-0.5">→ {a.recommendation}</p>
                  </div>
                  <Badge className={`${SEVERITY_COLOR[a.severity]} border text-xs ml-auto shrink-0 h-fit`}>
                    {a.severity}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Suggested risks */}
          {analysis.suggested_risks?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                <Brain className="w-3 h-3" /> Suggested Risks to Register ({analysis.suggested_risks.length})
              </p>
              {analysis.suggested_risks.map((risk, i) => {
                const isExpanded = expandedIdx === i;
                const alreadyAdded = addedRisks.has(risk.name);
                return (
                  <div key={i} className={`border rounded-lg overflow-hidden ${risk.urgent_alert ? 'border-red-300 bg-red-50' : 'border-purple-200 bg-white'}`}>
                    <button
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-black/5 transition-colors"
                      onClick={() => setExpandedIdx(isExpanded ? null : i)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {risk.urgent_alert && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                          <span className="font-medium text-sm text-gray-900">{risk.name}</span>
                          <Badge className={`${SEVERITY_COLOR[risk.severity]} border text-xs`}>{risk.severity}</Badge>
                          <Badge variant="outline" className="text-xs text-gray-500">{risk.category}</Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{risk.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant={alreadyAdded ? 'outline' : 'default'}
                          className={alreadyAdded ? 'h-7 text-xs border-green-300 text-green-700' : 'h-7 text-xs bg-red-600 hover:bg-red-700 text-white'}
                          onClick={e => { e.stopPropagation(); if (!alreadyAdded) handleAddRisk(risk); }}
                          disabled={alreadyAdded}
                        >
                          {alreadyAdded ? '✓ Added' : <><Plus className="w-3 h-3 mr-1" />Add</>}
                        </Button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-0.5">Evidence Detected</p>
                          <p className="text-xs text-gray-700 italic">{risk.evidence}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-0.5">Impact if Unaddressed</p>
                          <p className="text-xs text-gray-700">{risk.impact_description}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-0.5">Suggested Mitigation</p>
                          <p className="text-xs text-gray-700">{risk.mitigation_plan}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs">Likelihood: {risk.likelihood}</Badge>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}