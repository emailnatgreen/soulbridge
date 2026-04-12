import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Copy, QrCode, Shield, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

function buildVerificationURL(credential) {
  const data = {
    credential_id: credential.id,
    issuer: credential.issuer_did,
    subject: credential.subject_did,
    type: credential.credential_type,
    issued: credential.issuance_date,
    name: credential.credential_name,
  };
  return `${window.location.origin}/verify?data=${btoa(JSON.stringify(data))}`;
}

function buildXummSignURL(credential) {
  // XUMM deep link: opens XUMM app for signing / identity verification
  // Uses xumm://payload format with credential metadata as memo
  const memo = JSON.stringify({
    credential_id: credential.id,
    issuer: credential.issuer_did,
    subject: credential.subject_did,
    type: credential.credential_type,
    name: credential.credential_name,
  });
  // XUMM sign-in / verify request deep link
  const xummPayload = {
    txjson: {
      TransactionType: 'AccountSet',
      Memos: [
        {
          Memo: {
            MemoData: Array.from(new TextEncoder().encode(memo)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase(),
            MemoType: Array.from(new TextEncoder().encode('DID_CREDENTIAL_VERIFY')).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase(),
          },
        },
      ],
    },
  };
  // Standard XUMM deep link — when scanned, opens XUMM app to sign/verify
  const payloadB64 = btoa(JSON.stringify(xummPayload));
  return `https://xumm.app/sign/${payloadB64}`;
}

function makeGoogleQRUrl(text, size = 300) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&format=png&margin=10&ecc=M`;
}

async function downloadQR(url, filename) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
    toast.success(`Downloaded ${filename}`);
  } catch {
    // Fallback: open in new tab for manual save
    window.open(url, '_blank');
    toast.success('QR code opened — right-click to save');
  }
}

export default function CredentialQRCode({ credential }) {
  const [copied, setCopied] = useState(null);

  const verificationURL = buildVerificationURL(credential);
  const xummURL = buildXummSignURL(credential);

  const verificationQR = makeGoogleQRUrl(verificationURL);
  const xummQR = makeGoogleQRUrl(xummURL);

  const copyLink = (url, label) => {
    navigator.clipboard.writeText(url);
    setCopied(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Verification QR */}
      <Card className="border-2 border-indigo-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-indigo-700">
            <QrCode className="w-5 h-5" />
            Verification QR Code
          </CardTitle>
          <p className="text-xs text-gray-500">Scan to verify this credential in any DID-compatible app or browser</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-center bg-white p-3 rounded-lg border">
            <img
              src={verificationQR}
              alt="Verification QR Code"
              width={260}
              height={260}
              className="rounded"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => downloadQR(verificationQR, `verify-qr-${credential.id}.png`)}
            >
              <Download className="w-4 h-4 mr-1" />
              Download PNG
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => copyLink(verificationURL, 'Verification link')}
            >
              <Copy className="w-4 h-4 mr-1" />
              {copied === 'Verification link' ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>
          <p className="text-xs text-gray-400 break-all bg-gray-50 p-2 rounded">{verificationURL.substring(0, 80)}...</p>
        </CardContent>
      </Card>

      {/* XUMM Signing QR */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-purple-700">
            <Shield className="w-5 h-5" />
            XUMM Signing QR Code
          </CardTitle>
          <p className="text-xs text-gray-500">Scan with XUMM app to sign and verify this credential on XRPL</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-center bg-white p-3 rounded-lg border">
            <img
              src={xummQR}
              alt="XUMM Signing QR Code"
              width={260}
              height={260}
              className="rounded"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"
              onClick={() => downloadQR(xummQR, `xumm-sign-qr-${credential.id}.png`)}
            >
              <Download className="w-4 h-4 mr-1" />
              Download PNG
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"
              onClick={() => copyLink(xummURL, 'XUMM link')}
            >
              <Copy className="w-4 h-4 mr-1" />
              {copied === 'XUMM link' ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>
          <div className="flex items-start gap-2 bg-purple-50 p-3 rounded text-xs text-purple-700">
            <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>Open XUMM → Scan → Sign to cryptographically attest this credential on the XRP Ledger</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}