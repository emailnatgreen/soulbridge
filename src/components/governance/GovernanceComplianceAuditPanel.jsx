import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Shield, Loader2, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function GovernanceComplianceAuditPanel() {
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastAuditTime, setLastAuditTime] = useState(null);

  const runAudit = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('auditGovernanceCompliance', {});
      setAuditData(response.data);
      setLastAuditTime(new Date());
      toast.success(`Audit complete: ${response.data.compliance_issues_found} issues found`);
    } catch (error) {
      toast.error('Audit failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            Governance Compliance Audit
          </CardTitle>
          <Button
            onClick={runAudit}
            disabled={loading}
            size="sm"
            className="bg-green-600/20 hover:bg-green-600/30 border border-green-400/30 text-green-300 hover:text-green-200"
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Shield className="w-3 h-3 mr-2" />
                Run Audit
              </>
            )}
          </Button>
        </div>
        {lastAuditTime && (
          <p className="text-xs text-white/50 mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last audit: {lastAuditTime.toLocaleString()}
          </p>
        )}
      </CardHeader>

      {auditData ? (
        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 text-center">
              <p className="text-blue-200 text-sm font-semibold">{auditData.proposals_audited}</p>
              <p className="text-blue-200/60 text-xs">Proposals Audited</p>
            </div>
            <div className={`rounded-lg p-3 text-center border ${auditData.compliance_issues_found > 0 ? 'bg-red-500/10 border-red-400/30' : 'bg-green-500/10 border-green-400/30'}`}>
              <p className={auditData.compliance_issues_found > 0 ? 'text-red-200 text-sm font-semibold' : 'text-green-200 text-sm font-semibold'}>
                {auditData.compliance_issues_found}
              </p>
              <p className={auditData.compliance_issues_found > 0 ? 'text-red-200/60 text-xs' : 'text-green-200/60 text-xs'}>Issues Found</p>
            </div>
          </div>

          {/* Compliance Issues */}
          {auditData.compliance_issues && auditData.compliance_issues.length > 0 ? (
            <div className="space-y-3">
              <p className="text-white/60 text-xs font-medium uppercase tracking-wider">Compliance Issues</p>
              {auditData.compliance_issues.map((issue, idx) => (
                <div key={idx} className={`rounded-lg p-3 border ${issue.severity === 'high' ? 'bg-red-500/10 border-red-400/30' : 'bg-yellow-500/10 border-yellow-400/30'}`}>
                  <div className="flex items-start gap-2 mb-2">
                    {issue.severity === 'high' ? (
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${issue.severity === 'high' ? 'text-red-200' : 'text-yellow-200'}`}>
                        {issue.proposal_title}
                      </p>
                      <Badge className={`mt-1 text-xs ${issue.severity === 'high' ? 'bg-red-500/20 text-red-200 border-red-400/30' : 'bg-yellow-500/20 text-yellow-200 border-yellow-400/30'}`}>
                        {issue.severity.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <ul className={`space-y-1 text-xs ${issue.severity === 'high' ? 'text-red-200/80' : 'text-yellow-200/80'}`}>
                    {issue.issues.map((msg, i) => (
                      <li key={i}>• {msg}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-green-200 text-sm font-semibold">All Proposals Compliant</p>
              <p className="text-green-200/60 text-xs mt-1">No constitutional violations detected</p>
            </div>
          )}

          {/* Compliance Scores */}
          {auditData.audit_results && auditData.audit_results.length > 0 && (
            <div className="space-y-2">
              <p className="text-white/60 text-xs font-medium uppercase tracking-wider">Compliance Scores</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {auditData.audit_results.map((result, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg p-2 border border-white/10">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{result.title}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <div className="text-right">
                        <p className={`text-sm font-bold ${result.compliance_score >= 7 ? 'text-green-400' : result.compliance_score >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {result.compliance_score}/10
                        </p>
                      </div>
                      {result.has_issues && (
                        <AlertTriangle className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      ) : (
        <CardContent className="py-6 text-center">
          <Shield className="w-8 h-8 text-green-400/50 mx-auto mb-2" />
          <p className="text-white/60 text-sm">Click "Run Audit" to check all active proposals for compliance</p>
          <p className="text-white/40 text-xs mt-2">Daily audit runs automatically at 06:00 UTC</p>
        </CardContent>
      )}
    </Card>
  );
}