import React from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ShieldCheck, Award, Sparkles, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DidVerificationCertificate({ wallet, verification }) {
  const certificateId = `did-certificate-${wallet.id}`;
  const verifiedAt = verification?.verified_at ? new Date(verification.verified_at).toLocaleString() : new Date().toLocaleString();
  const did = `did:xrpl:1:${wallet.classic_address}`;
  const accountExists = verification?.account_exists;
  const didActive = verification?.did_active;
  const balance = verification?.balance;
  const ledgerIndex = verification?.ledger_index;
  const didTxHash = verification?.did_tx_hash || wallet.published_txid;

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
            <p className="text-white font-medium capitalize">{wallet.network || 'mainnet'}</p>
          </div>
          <div className="rounded-xl bg-black/20 border border-white/10 p-3 md:col-span-2">
            <p className="text-white/40 text-xs mb-1">Verified DID</p>
            <p className="text-sky-300 font-mono text-xs break-all">{did}</p>
          </div>

          {/* On-chain proof details */}
          <div className="rounded-xl bg-black/20 border border-white/10 p-3">
            <p className="text-white/40 text-xs mb-1">XRPL Account</p>
            <p className={`font-medium flex items-center gap-2 ${accountExists ? 'text-green-300' : 'text-red-400'}`}>
              <ShieldCheck className="w-4 h-4" /> {accountExists ? 'Active on ledger' : 'Not found on ledger'}
            </p>
          </div>
          <div className="rounded-xl bg-black/20 border border-white/10 p-3">
            <p className="text-white/40 text-xs mb-1">DID Document</p>
            <p className={`font-medium flex items-center gap-2 ${didActive ? 'text-green-300' : 'text-amber-400'}`}>
              <ShieldCheck className="w-4 h-4" /> {didActive ? 'Published on-chain' : 'Not published'}
            </p>
          </div>
          {balance !== undefined && balance !== null && (
            <div className="rounded-xl bg-black/20 border border-white/10 p-3">
              <p className="text-white/40 text-xs mb-1">On-Chain Balance</p>
              <p className="text-white font-medium">{balance} XRP</p>
            </div>
          )}
          {ledgerIndex && (
            <div className="rounded-xl bg-black/20 border border-white/10 p-3">
              <p className="text-white/40 text-xs mb-1">Ledger Index</p>
              <p className="text-white font-mono text-xs">{ledgerIndex}</p>
            </div>
          )}
          {didTxHash && (
            <div className="rounded-xl bg-black/20 border border-white/10 p-3 md:col-span-2">
              <p className="text-white/40 text-xs mb-1">DID Publication TX</p>
              <a href={`https://${wallet.network === 'testnet' ? 'testnet.' : ''}xrpscan.com/tx/${didTxHash}`}
                target="_blank" rel="noopener noreferrer"
                className="text-sky-300 font-mono text-xs break-all hover:underline">{didTxHash}</a>
            </div>
          )}
          <div className="rounded-xl bg-black/20 border border-white/10 p-3">
            <p className="text-white/40 text-xs mb-1">Verified At</p>
            <p className="text-white font-medium text-xs">{verifiedAt}</p>
          </div>
        </div>

        <div className={`mt-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
          didActive 
            ? 'border-green-400/20 bg-green-500/5 text-green-200' 
            : 'border-amber-400/20 bg-amber-500/5 text-amber-200'
        }`}>
          <Sparkles className="w-4 h-4" />
          {didActive 
            ? 'This certificate confirms the DID was published and verified against the live XRPL ledger.'
            : 'Account exists but DID document has not been published on-chain yet.'}
        </div>
      </div>
    </div>
  );
}