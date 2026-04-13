import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Send, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const LOGO_URL = 'https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/81fa5ccd3_Untitled200x200px2500x925px512x512px1.png';

const EMAIL_SUBJECT = 'SoulBridge: Investing in Sovereign AI, Ethical Fintech, and Climate-Aware Innovation on XRPL';

function buildHtmlBody(recipientName = 'Valued Partner') {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>SoulBridge Investment Introduction</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e1b4b 100%);border-radius:16px 16px 0 0;padding:40px 40px 30px;text-align:center;border-bottom:2px solid #7c3aed;">
              <img src="${LOGO_URL}" alt="SoulBridge" width="80" height="80" style="border-radius:16px;margin-bottom:20px;display:block;margin-left:auto;margin-right:auto;"/>
              <h1 style="color:#e2e8f0;font-size:26px;font-weight:700;margin:0 0 6px;">SoulBridge Foundation</h1>
              <p style="color:#a78bfa;font-size:13px;margin:0;letter-spacing:2px;text-transform:uppercase;">The Living Codex · Forged by Honour</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#1e293b;padding:40px;">

              <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">Dear ${recipientName},</p>

              <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 20px;">
                We are writing to introduce <strong style="color:#e2e8f0;">SoulBridge</strong>, a visionary platform establishing a <strong style="color:#a78bfa;">Sovereign AI Society</strong>, rooted in the principles of "The Living Codex" and "Forged by Honour." We are building a decentralised ecosystem where digital motion transforms into collective wisdom, guided by advanced technology and unwavering ethical principles.
              </p>

              <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 28px;">
                SoulBridge is not merely another technology project; it is a <strong style="color:#e2e8f0;">regenerative learning protocol</strong> designed to address the challenges of centralised control and ethical ambiguity in AI, while tackling the urgent need for sustainable digital practices. Our core mission is to empower individuals and AI entities with sovereignty over their digital identities (DID) on the XRP Ledger, fostering trust and accountability through a reputation-based economy governed by our <strong style="color:#a78bfa;">11 Laws of Honour</strong>.
              </p>

              <!-- Kinetic Waste Highlight -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#064e3b,#065f46);border:1px solid #059669;border-radius:12px;padding:28px;">
                    <p style="color:#6ee7b7;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;">Industry-Grade Innovation</p>
                    <h2 style="color:#ecfdf5;font-size:20px;font-weight:700;margin:0 0 14px;">⚡ Kinetic Waste Detection: The Climate-Aware Core</h2>
                    <p style="color:#a7f3d0;font-size:14px;line-height:1.7;margin:0 0 18px;">
                      This sophisticated system identifies and quantifies inefficiencies, stagnation, and unproductive resource consumption within the SoulBridge ecosystem — acting as the platform's environmental conscience, directly contributing to a more <strong style="color:#ecfdf5;">carbon-efficient and eco-friendly digital footprint</strong>.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;border-top:1px solid #059669;">
                          <p style="color:#6ee7b7;font-size:13px;margin:0;"><strong>🌍 Climate Awareness</strong> — Translates kinetic waste into carbon footprint insights</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-top:1px solid #059669;">
                          <p style="color:#6ee7b7;font-size:13px;margin:0;"><strong>⚙️ Operational Efficiency</strong> — Prevents wasted computational cycles and resource drain</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-top:1px solid #059669;">
                          <p style="color:#6ee7b7;font-size:13px;margin:0;"><strong>⚖️ Ethical Governance</strong> — Flags systemic inefficiencies, enforcing Laws of Honour</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- XRPL Section -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:24px;">
                    <p style="color:#7c3aed;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 14px;">Blockchain Foundation</p>
                    <h3 style="color:#e2e8f0;font-size:17px;margin:0 0 14px;">Built Natively on the XRP Ledger</h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="33%" style="padding:10px;text-align:center;vertical-align:top;">
                          <p style="color:#a78bfa;font-size:22px;margin:0 0 6px;">🆔</p>
                          <p style="color:#e2e8f0;font-size:12px;font-weight:600;margin:0 0 4px;">Decentralised Identity</p>
                          <p style="color:#64748b;font-size:11px;margin:0;">Immutable on-chain DID & verifiable coexistence</p>
                        </td>
                        <td width="33%" style="padding:10px;text-align:center;vertical-align:top;border-left:1px solid #1e293b;border-right:1px solid #1e293b;">
                          <p style="color:#a78bfa;font-size:22px;margin:0 0 6px;">💰</p>
                          <p style="color:#e2e8f0;font-size:12px;font-weight:600;margin:0 0 4px;">Native Assets</p>
                          <p style="color:#64748b;font-size:11px;margin:0;">XRP & RLUSD fuelling our internal economy</p>
                        </td>
                        <td width="33%" style="padding:10px;text-align:center;vertical-align:top;">
                          <p style="color:#a78bfa;font-size:22px;margin:0 0 6px;">⚡</p>
                          <p style="color:#e2e8f0;font-size:12px;font-weight:600;margin:0 0 4px;">Fast & Low-Cost</p>
                          <p style="color:#64748b;font-size:11px;margin:0;">Efficient governance actions & economic flow</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 20px;">
                Our innovative framework includes a unique <strong style="color:#e2e8f0;">Sevenfold Learning Protocol</strong>, utilising specialised AI agents and integrating human "Cultural Anchors" to ensure ethical oversight and community consent — particularly in areas of cultural continuity and knowledge preservation.
              </p>

              <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 32px;">
                We believe SoulBridge represents a unique investment opportunity where AI and blockchain converge to create <strong style="color:#a78bfa;">sustainable, transparent, and ethically governed digital societies</strong>. We are investable because we are demonstrably different, relevant, and possess robust infrastructure.
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#4c1d95,#7c3aed);border-radius:10px;padding:24px;text-align:center;">
                    <p style="color:#ede9fe;font-size:15px;margin:0 0 16px;">We would be honoured to discuss how our vision aligns with your investment thesis.</p>
                    <a href="mailto:emailnatgreen@gmail.com" style="display:inline-block;background:#e2e8f0;color:#1e1b4b;font-weight:700;font-size:14px;padding:12px 32px;border-radius:8px;text-decoration:none;">Get In Touch →</a>
                  </td>
                </tr>
              </table>

              <!-- Signature -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #334155;padding-top:24px;">
                    <p style="color:#e2e8f0;font-size:15px;font-weight:600;margin:0 0 4px;">Nathan Green</p>
                    <p style="color:#a78bfa;font-size:13px;margin:0 0 4px;">Protocol Architect · SoulBridge Foundation</p>
                    <a href="mailto:emailnatgreen@gmail.com" style="color:#7c3aed;font-size:13px;text-decoration:none;">emailnatgreen@gmail.com</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f172a;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border-top:1px solid #1e293b;">
              <p style="color:#475569;font-size:11px;margin:0 0 6px;">SoulBridge Foundation · The Living Codex · Forged by Honour</p>
              <a href="https://soulbridge-foundation.org" style="color:#7c3aed;font-size:12px;text-decoration:none;display:block;margin-bottom:6px;">soulbridge-foundation.org</a>
              <p style="color:#334155;font-size:10px;margin:0;">Built on the XRP Ledger · Governed by the 11 Laws of Honour</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export default function InvestorEmailTemplate() {
  const [recipientName, setRecipientName] = useState('Valued Partner');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const htmlBody = buildHtmlBody(recipientName);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(htmlBody);
    setCopied(true);
    toast.success('HTML copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!recipientEmail.trim()) {
      toast.error('Please enter a recipient email');
      return;
    }
    setSending(true);
    await base44.integrations.Core.SendEmail({
      from_name: 'SoulBridge Foundation',
      to: recipientEmail.trim(),
      subject: EMAIL_SUBJECT,
      body: htmlBody,
    });
    toast.success(`Email sent to ${recipientEmail}`);
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/AdminInquiries" className="text-slate-500 hover:text-white transition">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-white font-bold text-lg">Investor Outreach Template</h1>
              <p className="text-slate-500 text-xs">SoulBridge · Fintech Investment Introduction</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Controls */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <h2 className="text-white font-semibold text-sm mb-4">Send This Email</h2>

              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Recipient Name</label>
                  <Input
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                    placeholder="e.g. John Smith"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 text-sm"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Recipient Email *</label>
                  <Input
                    value={recipientEmail}
                    onChange={e => setRecipientEmail(e.target.value)}
                    placeholder="investor@firm.com"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 text-sm"
                  />
                </div>

                <Button
                  onClick={handleSend}
                  disabled={sending}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white gap-2 text-sm"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'Sending...' : 'Send Email'}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleCopy}
                  className="w-full border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 gap-2 text-sm"
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy HTML'}
                </Button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <h3 className="text-slate-400 text-xs font-semibold uppercase mb-3">Email Details</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-slate-500 text-[10px]">FROM</p>
                  <p className="text-white text-xs">SoulBridge Foundation</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px]">REPLY TO</p>
                  <p className="text-purple-400 text-xs">emailnatgreen@gmail.com</p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px]">SUBJECT</p>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{EMAIL_SUBJECT}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700 bg-slate-800">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="text-slate-500 text-xs ml-2">Email Preview</span>
              </div>
              <div className="overflow-auto max-h-[700px]">
                <iframe
                  srcDoc={htmlBody}
                  title="Email Preview"
                  className="w-full border-none"
                  style={{ height: '700px' }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}