import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, AlertTriangle, Scale, Shield, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const LAW_ICONS = {
  1: '👁️', 2: '⚖️', 3: '📚', 4: '🙏', 5: '⚡',
  6: '❤️', 7: '🕊️', 8: '🗳️', 9: '💎', 10: '🌱', 11: '🌍'
};

const LAW_COLORS = {
  1: 'purple', 2: 'blue', 3: 'indigo', 4: 'pink', 5: 'orange',
  6: 'red', 7: 'cyan', 8: 'green', 9: 'yellow', 10: 'emerald', 11: 'teal'
};

export default function ConstitutionalCompliancePanel({ title, description, proposalType, affectedEntities = [] }) {
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzeCompliance = async () => {
    if (!title || !description) {
      toast.error('Title and description required for compliance check');
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('validateProposalConstitutionalCompliance', {
        title,
        description,
        proposal_type: proposalType,
        affected_entities: affectedEntities
      });
      setCompliance(response.data.compliance_assessment);
    } catch (error) {
      toast.error('Compliance check failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'FULLY_ALIGNED': return 'bg-green-500/10 border-green-400/30 text-green-200';
      case 'MOSTLY_ALIGNED': return 'bg-blue-500/10 border-blue-400/30 text-blue-200';
      case 'PARTIALLY_ALIGNED': return 'bg-yellow-500/10 border-yellow-400/30 text-yellow-200';
      case 'MISALIGNED': return 'bg-orange-500/10 border-orange-400/30 text-orange-200';
      case 'CRITICAL_DEVIATION': return 'bg-red-500/10 border-red-400/30 text-red-200';
      default: return 'bg-gray-500/10 border-gray-400/30 text-gray-200';
    }
  };

  const getAlignmentIcon = (status) => {
    switch (status) {
      case 'FULLY_ALIGNED':
      case 'MOSTLY_ALIGNED':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'PARTIALLY_ALIGNED':
        return <AlertTriangle className="w-4 h-4" />;
      case 'MISALIGNED':
      case 'CRITICAL_DEVIATION':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-400" />
            Constitutional Compliance
          </CardTitle>
          <button
            onClick={analyzeCompliance}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-400/30 text-purple-300 hover:text-purple-200 text-xs font-medium transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                Check Alignment
              </>
            )}
          </button>
        </div>
      </CardHeader>

      {compliance ? (
        <CardContent className="space-y-4">
          {/* Overall Status */}
          <div className={`rounded-lg p-4 border flex items-start gap-3 ${getStatusColor(compliance.constitutional_status)}`}>
            {getAlignmentIcon(compliance.constitutional_status)}
            <div className="flex-1">
              <p className="font-semibold text-sm mb-1">
                {compliance.constitutional_status.replace(/_/g, ' ')}
              </p>
              <p className="text-xs opacity-90">{compliance.summary}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{compliance.overall_alignment_score}/10</p>
              <p className="text-xs opacity-75">Overall Score</p>
            </div>
          </div>

          {/* Critical Warnings */}
          {compliance.critical_warnings && compliance.critical_warnings.length > 0 && (
            <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-3 space-y-2">
              <p className="text-red-300 font-semibold text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Critical Warnings
              </p>
              <ul className="space-y-1">
                {compliance.critical_warnings.map((warning, idx) => (
                  <li key={idx} className="text-red-200/80 text-xs">• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Law-by-Law Analysis */}
          <div className="space-y-2">
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider">Law Analysis</p>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {compliance.law_analysis && compliance.law_analysis.map((law, idx) => {
                const color = LAW_COLORS[law.law_number];
                const icon = LAW_ICONS[law.law_number];
                
                return (
                  <div
                    key={idx}
                    className={`bg-white/5 border rounded-lg p-2.5 space-y-1 border-${color}-400/20 hover:border-${color}-400/40 transition`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{icon}</span>
                        <div>
                          <p className="text-white text-xs font-semibold">Law {law.law_number}</p>
                          <p className="text-white/60 text-xs">{law.law_name}</p>
                        </div>
                      </div>
                      <Badge className={`text-xs whitespace-nowrap bg-${color}-500/20 text-${color}-200 border-${color}-400/30`}>
                        {law.alignment_score}/10
                      </Badge>
                    </div>
                    <p className="text-white/70 text-xs leading-tight">{law.reasoning}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommendations */}
          {compliance.recommendations && compliance.recommendations.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 space-y-2">
              <p className="text-blue-300 font-semibold text-sm flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Recommendations
              </p>
              <ul className="space-y-1">
                {compliance.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-blue-200/80 text-xs">• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      ) : (
        <CardContent className="py-6 text-center">
          <Shield className="w-8 h-8 text-purple-400/50 mx-auto mb-2" />
          <p className="text-white/60 text-sm">Click "Check Alignment" to validate proposal against the 11 Laws</p>
        </CardContent>
      )}
    </Card>
  );
}