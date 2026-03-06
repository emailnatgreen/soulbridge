import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Globe, Zap, Shield, AlertTriangle, CheckCircle, Clock,
  RefreshCw, Play, Loader2, Bell, TrendingUp, Eye, FileSearch
} from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const THREAT_CONFIG = {
  low:      { color: 'bg-green-100 text-green-700 border-green-300',  dot: 'bg-green-500',  emoji: '🟢' },
  medium:   { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', dot: 'bg-yellow-500', emoji: '🟡' },
  high:     { color: 'bg-orange-100 text-orange-700 border-orange-300', dot: 'bg-orange-500', emoji: '🟠' },
  critical: { color: 'bg-red-100 text-red-700 border-red-300',         dot: 'bg-red-500',    emoji: '🔴' },
};

const PRIORITY_CONFIG = {
  info:     'bg-blue-100 text-blue-700',
  watch:    'bg-yellow-100 text-yellow-700',
  urgent:   'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

function ReportCard({ report }) {
  const [expanded, setExpanded] = useState(false);
  const meta = report.metadata || {};
  const threat = meta.threat_level || 'low';
  const tc = THREAT_CONFIG[threat] || THREAT_CONFIG.low;
  const findings = meta.raw_intelligence?.findings || [];
  const date = report.created_date ? format(new Date(report.created_date), 'dd MMM yyyy, HH:mm') : '';

  return (
    <Card className="border hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${tc.color}`}>
                {tc.emoji} {threat.toUpperCase()}
              </span>
              {meta.urgent_findings > 0 && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                  {meta.urgent_findings} urgent
                </span>
              )}
              {meta.governance_triggers > 0 && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                  🏛 {meta.governance_triggers} gov trigger{meta.governance_triggers > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="text-sm font-medium text-gray-800">{report.title}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />{date}
            </span>
          </div>
        </div>
        <div className="flex gap-3 text-xs text-gray-500 mt-1">
          <span>📰 {meta.findings_count || 0} findings</span>
          <span>🔍 {(meta.queries_used || []).length} queries</span>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {/* Axi Briefing */}
        {meta.raw_intelligence?.axi_briefing && (
          <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="text-xs font-semibold text-purple-600 mb-1 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Axi's Briefing
            </div>
            <p className="text-sm text-purple-800">{meta.raw_intelligence.axi_briefing}</p>
          </div>
        )}

        {/* Finding previews */}
        {findings.length > 0 && (
          <div className="space-y-2 mb-3">
            {(expanded ? findings : findings.slice(0, 2)).map((f, i) => (
              <div key={i} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-medium text-sm text-gray-900">{f.title}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${PRIORITY_CONFIG[f.priority] || 'bg-gray-100 text-gray-600'}`}>
                    {f.priority?.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-1">{f.category} · {f.source_domain}</div>
                <p className="text-xs text-gray-700">{f.summary}</p>
                {f.soulbridge_relevance && (
                  <p className="text-xs text-blue-700 mt-1 italic">↳ {f.soulbridge_relevance}</p>
                )}
                {f.action_suggested && (
                  <p className="text-xs text-orange-700 mt-1 font-medium">⚡ {f.action_suggested}</p>
                )}
                {f.triggers_governance_review && (
                  <span className="inline-block mt-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">🏛 Governance review recommended</span>
                )}
              </div>
            ))}
          </div>
        )}

        {findings.length > 2 && (
          <Button variant="ghost" size="sm" className="w-full text-gray-500 text-xs" onClick={() => setExpanded(e => !e)}>
            {expanded ? '▲ Show less' : `▼ Show ${findings.length - 2} more findings`}
          </Button>
        )}

        {/* Full report toggle */}
        <details className="mt-2">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">View full report text</summary>
          <div className="mt-2 p-3 bg-gray-50 rounded-lg max-h-72 overflow-y-auto">
            <ReactMarkdown
              className="text-xs text-gray-700 prose prose-sm max-w-none"
              components={{
                h2: ({ children }) => <h2 className="text-sm font-bold text-gray-900 mt-3 mb-1">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xs font-semibold text-gray-800 mt-2 mb-1">{children}</h3>,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-blue-300 pl-2 my-1 text-gray-600">{children}</blockquote>,
                strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                p: ({ children }) => <p className="my-0.5 leading-relaxed">{children}</p>,
              }}
            >
              {report.message}
            </ReactMarkdown>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

export default function AxiIntelligenceFeed() {
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['axi-intel-reports'],
    queryFn: () => base44.entities.AgentNotification.filter(
      { notification_type: 'ai_intelligence_report' }, '-created_date', 30
    ),
    refetchInterval: 60000,
  });

  const { data: govAlerts = [] } = useQuery({
    queryKey: ['gov-alerts'],
    queryFn: () => base44.entities.AgentNotification.filter(
      { notification_type: 'governance_alert' }, '-created_date', 20
    ),
  });

  const runMutation = useMutation({
    mutationFn: () => base44.functions.invoke('axiNewsIntelligence', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['axi-intel-reports'] });
      queryClient.invalidateQueries({ queryKey: ['gov-alerts'] });
    },
  });

  // Aggregate stats
  const totalFindings = reports.reduce((s, r) => s + (r.metadata?.findings_count || 0), 0);
  const totalUrgent = reports.reduce((s, r) => s + (r.metadata?.urgent_findings || 0), 0);
  const totalGovTriggers = reports.reduce((s, r) => s + (r.metadata?.governance_triggers || 0), 0);
  const latestThreat = reports[0]?.metadata?.threat_level || 'low';
  const tc = THREAT_CONFIG[latestThreat] || THREAT_CONFIG.low;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Globe className="w-7 h-7 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">Axi Intelligence Feed</h1>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${tc.color}`}>
                {tc.emoji} {latestThreat.toUpperCase()}
              </span>
            </div>
            <p className="text-gray-500 text-sm">AI ecosystem news · Regulatory monitoring · Governance triggers</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {runMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning...</>
                : <><Play className="w-4 h-4 mr-2" />Run Scan Now</>}
            </Button>
            <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {runMutation.isSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-xl text-green-700 text-sm font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Scan complete — threat level: <strong>{runMutation.data?.data?.threat_level?.toUpperCase()}</strong> · {runMutation.data?.data?.findings_count} findings · {runMutation.data?.data?.governance_triggers} governance triggers
          </div>
        )}

        {runMutation.isError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-xl text-red-700 text-sm">
            Scan failed. Please try again.
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <FileSearch className="w-4 h-4 text-indigo-500" />
                <span className="text-xs text-gray-500">Total Reports</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{reports.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-gray-500">Total Findings</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{totalFindings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-gray-500">Urgent Findings</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">{totalUrgent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-gray-500">Gov Triggers</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">{totalGovTriggers}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="reports">
          <TabsList className="mb-4">
            <TabsTrigger value="reports">Intelligence Reports ({reports.length})</TabsTrigger>
            <TabsTrigger value="governance">Governance Alerts ({govAlerts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="reports">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mr-3" /> Loading intelligence feed...
              </div>
            ) : reports.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <Globe className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="font-semibold text-gray-600">No intelligence reports yet</p>
                  <p className="text-sm text-gray-400 mt-1 mb-4">Click "Run Scan Now" to perform the first AI ecosystem scan.</p>
                  <Button onClick={() => runMutation.mutate()} disabled={runMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {runMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                    Run First Scan
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {reports.map(r => <ReportCard key={r.id} report={r} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="governance">
            {govAlerts.length === 0 ? (
              <Card>
                <CardContent className="pt-10 pb-10 text-center text-gray-500">
                  <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No governance alerts triggered yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {govAlerts.map(alert => (
                  <Card key={alert.id} className="border-purple-200 bg-purple-50">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-semibold text-purple-900 text-sm mb-1">{alert.title}</div>
                          <p className="text-sm text-purple-700 whitespace-pre-line">{alert.message}</p>
                          <div className="text-xs text-purple-400 mt-2">
                            {alert.created_date ? format(new Date(alert.created_date), 'dd MMM yyyy, HH:mm') : ''}
                          </div>
                        </div>
                        <Link to={createPageUrl('GovernanceHub')}>
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white shrink-0">
                            Review
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}