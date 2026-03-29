import React from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ShieldCheck, Award, Sparkles, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DidVerificationCertificate({ wallet, verification }) {
  const certificateId = `did-certificate-${wallet.id}`;
  const verifiedAt = verification?.verified_at ? new Date(verification.verified_at).toLocaleString() : 'Just now';
  const did = `did:xrpl:1:${wallet.classic_address}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById(certificateId);
    if (!element) return;

    const canvas = await html2canvas(element, {
      backgroundColor: '#020617',
      scale: 2,
    });

    const imageData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(imageData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`verified-did-certificate-${wallet.classic_address}.pdf`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button size="sm" variant="outline" className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs" onClick={handlePrint}>
          <Printer className="w-3 h-3" /> Print
        </Button>
        <Button size="sm" variant="outline" className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs" onClick={handleDownloadPdf}>
          <Download className="w-3 h-3" /> Download PDF
        </Button>
      </div>

      <div id={certificateId} className="rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/10 via-slate-900 to-purple-950 p-5">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-sky-300/70">Verified DID Certificate</p>
            <h4 className="text-white font-semibold text-lg mt-1">Certified Sovereign DID</h4>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-400/20 flex items-center justify-center">
            <Award className="w-6 h-6 text-sky-300" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-black/20 border border-white/10 p-3">
            <p className="text-white/40 text-xs mb-1">Wallet</p>
            <p className="text-white font-medium">{wallet.name || 'Primary Wallet'}</p>
          </div>
          <div className="rounded-xl bg-black/20 border border-white/10 p-3">
            <p className="text-white/40 text-xs mb-1">Network</p>
            <p className="text-white font-medium capitalize">{wallet.network || 'testnet'}</p>
          </div>
          <div className="rounded-xl bg-black/20 border border-white/10 p-3 md:col-span-2">
            <p className="text-white/40 text-xs mb-1">Verified DID</p>
            <p className="text-sky-300 font-mono text-xs break-all">{did}</p>
          </div>
          <div className="rounded-xl bg-black/20 border border-white/10 p-3">
            <p className="text-white/40 text-xs mb-1">Verification Status</p>
            <p className="text-green-300 font-medium flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> On-chain verified</p>
          </div>
          <div className="rounded-xl bg-black/20 border border-white/10 p-3">
            <p className="text-white/40 text-xs mb-1">Verification Timestamp</p>
            <p className="text-white font-medium">{verifiedAt}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-sky-400/20 bg-sky-500/5 px-3 py-2 text-xs text-sky-200">
          <Sparkles className="w-4 h-4" />
          This certificate confirms the DID was published and passed on-chain verification.
        </div>
      </div>
    </div>
  );
}