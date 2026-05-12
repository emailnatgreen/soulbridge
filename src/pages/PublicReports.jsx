import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Shield, ExternalLink } from 'lucide-react';

import PublicSearchBar from '@/components/public/PublicSearchBar';
import PublicReportList from '@/components/public/PublicReportList';
import PublicReportViewer from '@/components/public/PublicReportViewer';
import PublicAnalyticsWidget from '@/components/public/PublicAnalyticsWidget';

export default function PublicReports() {
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [veracityFilter, setVeracityFilter] = useState('all');
  const [decisionFilter, setDecisionFilter] = useState('all');

  // Load list
  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['public-reports-list'],
    queryFn: async () => {
      const res = await base44.functions.invoke('publicReports', { action: 'list', limit: 50 });
      return res.data;
    },
    staleTime: 30000,
  });

  // Load selected report detail
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['public-report-detail', selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const res = await base44.functions.invoke('publicReports', { action: 'get', report_id: selectedId });
      return res.data;
    },
    enabled: !!selectedId,
  });

  // Handle URL param for direct link
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) setSelectedId(id);
  }, []);

  const reports = listData?.reports || [];

  // Apply filters
  const filtered = useMemo(() => {
    return reports.filter(r => {
      if (search && !r.question.toLowerCase().includes(search.toLowerCase())) return false;
      if (decisionFilter !== 'all' && r.policy?.decision !== decisionFilter) return false;
      if (veracityFilter !== 'all') {
        const avg = r.veracity_summary?.avg_score ?? 0;
        if (veracityFilter === 'high' && avg < 0.8) return false;
        if (veracityFilter === 'medium' && (avg < 0.5 || avg >= 0.8)) return false;
        if (veracityFilter === 'low' && avg >= 0.5) return false;
      }
      return true;
    });
  }, [reports, search, veracityFilter, decisionFilter]);

  const handleSelect = (id) => {
    setSelectedId(id);
    // Update URL without navigation
    const url = new URL(window.location);
    url.searchParams.set('id', id);
    window.history.replaceState({}, '', url);
  };

  const activeReport = detailData?.report || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-white/40 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <h1 className="text-white font-semibold text-sm sm:text-base">Truth Reports</h1>
                </div>
                <p className="text-white/30 text-[10px] sm:text-xs">Public transparency layer — 7-Leaf epistemic verification</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="text-[8px] bg-white/5 text-white/30 border-white/10">TruthReportPublicV1</Badge>
              <Badge className="text-[8px] bg-cyan-500/10 text-cyan-400/60 border-cyan-500/20">SHA-256</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Analytics */}
        <PublicAnalyticsWidget />

        {/* Search */}
        <PublicSearchBar
          search={search}
          onSearchChange={setSearch}
          veracityFilter={veracityFilter}
          onVeracityChange={setVeracityFilter}
          decisionFilter={decisionFilter}
          onDecisionChange={setDecisionFilter}
        />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report List */}
          <div className="lg:col-span-1">
            {listLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="rounded-lg border border-white/5 bg-white/[0.02] p-3 animate-pulse">
                    <div className="h-3 w-3/4 bg-white/10 rounded mb-2" />
                    <div className="h-2 w-1/2 bg-white/5 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <PublicReportList
                reports={filtered}
                selectedId={selectedId}
                onSelect={handleSelect}
              />
            )}
          </div>

          {/* Report Viewer */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
              {detailLoading ? (
                <div className="animate-pulse space-y-4 py-8">
                  <div className="h-4 w-3/4 bg-white/10 rounded" />
                  <div className="h-3 w-full bg-white/5 rounded" />
                  <div className="h-3 w-2/3 bg-white/5 rounded" />
                </div>
              ) : (
                <PublicReportViewer report={activeReport} />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-6 border-t border-white/5">
          <p className="text-white/15 text-[10px]">
            SoulBridge Truth Engine · TruthReportV1 · TruthPolicyV1 · Every report is cryptographically anchored
          </p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <Link to="/" className="text-white/30 hover:text-white text-xs transition-colors">← Back to Village</Link>
            <a href="/whitepaper/technical" className="flex items-center gap-1 text-white/30 hover:text-white text-xs transition-colors">
              Technical Paper <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}