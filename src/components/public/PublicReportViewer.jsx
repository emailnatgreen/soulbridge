import React from 'react';
import PublicPolicyBanner from './PublicPolicyBanner';
import PublicClaimCard from './PublicClaimCard';
import PublicRiskList from './PublicRiskList';
import PublicHashFooter from './PublicHashFooter';
import { FileText } from 'lucide-react';

export default function PublicReportViewer({ report }) {
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="w-10 h-10 text-white/10 mb-3" />
        <p className="text-white/30 text-sm">Select a report to view its full verification.</p>
        <p className="text-white/15 text-xs mt-1">Each report is cryptographically anchored via SHA-256.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Question */}
      <div>
        <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Question</p>
        <p className="text-white text-base font-medium leading-relaxed">{report.question}</p>
      </div>

      {/* Policy Banner */}
      <PublicPolicyBanner policy={report.policy} veracitySummary={report.veracity_summary} />

      {/* Verified Synthesis */}
      {report.synthesis && (
        <div>
          <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1.5">Verified Synthesis</p>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <p className="text-white/70 text-sm leading-relaxed">{report.synthesis}</p>
          </div>
        </div>
      )}

      {/* Claims */}
      {report.claims && report.claims.length > 0 && (
        <div>
          <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1.5">
            Claims Verified ({report.claims.length})
          </p>
          <div className="space-y-2">
            {report.claims.map(claim => (
              <PublicClaimCard key={claim.id} claim={claim} />
            ))}
          </div>
        </div>
      )}

      {/* Reasoning */}
      {report.reasoning && (
        <div>
          <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1.5">Chain of Thought</p>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <p className="text-white/50 text-xs leading-relaxed">{report.reasoning}</p>
          </div>
        </div>
      )}

      {/* Risks */}
      <div>
        <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1.5">Risk Assessment</p>
        <PublicRiskList risks={report.risks} />
      </div>

      {/* Hash Footer */}
      <PublicHashFooter
        hash={report.hash}
        hashAlgo={report.hash_algo}
        schema={report.schema}
        processingMs={report.processing_ms}
      />
    </div>
  );
}