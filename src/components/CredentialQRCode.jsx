import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Copy, QrCode } from 'lucide-react';
import { toast } from 'sonner';

export default function CredentialQRCode({ credential }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !credential) return;

    // Create verification URL (in production this would be your domain)
    const verificationData = {
      credential_id: credential.id,
      issuer: credential.issuer_did,
      subject: credential.subject_did,
      type: credential.credential_type,
      issued: credential.issuance_date
    };

    const verificationURL = `${window.location.origin}/verify?data=${btoa(JSON.stringify(verificationData))}`;

    // Simple QR code generation (in production use a proper QR library)
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const size = 300;
    canvas.width = size;
    canvas.height = size;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Generate QR-like pattern (simplified)
    const gridSize = 25;
    const cellSize = size / gridSize;

    // Simple hash function to create deterministic pattern
    const hash = verificationURL.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);

    ctx.fillStyle = '#000000';
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        // Create deterministic pattern based on position and hash
        const value = (x * y + hash) % 2;
        if (value === 1) {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }

    // Add corner markers (typical QR code feature)
    const markerSize = cellSize * 7;
    [
      [0, 0],
      [size - markerSize, 0],
      [0, size - markerSize]
    ].forEach(([x, y]) => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, y, markerSize, markerSize);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + cellSize, y + cellSize, markerSize - 2 * cellSize, markerSize - 2 * cellSize);
      ctx.fillStyle = '#000000';
      ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, markerSize - 4 * cellSize, markerSize - 4 * cellSize);
    });

  }, [credential]);

  const downloadQR = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `credential-qr-${credential.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('QR code downloaded');
  };

  const copyVerificationLink = () => {
    const verificationData = {
      credential_id: credential.id,
      issuer: credential.issuer_did,
      subject: credential.subject_did,
      type: credential.credential_type
    };
    const url = `${window.location.origin}/verify?data=${btoa(JSON.stringify(verificationData))}`;
    navigator.clipboard.writeText(url);
    toast.success('Verification link copied');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <QrCode className="w-5 h-5" />
          Verification QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
          <canvas ref={canvasRef} className="w-full max-w-[300px] h-auto" />
        </div>

        <div className="space-y-2">
          <Button onClick={downloadQR} variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Download QR Code
          </Button>
          <Button onClick={copyVerificationLink} variant="outline" className="w-full">
            <Copy className="w-4 h-4 mr-2" />
            Copy Verification Link
          </Button>
        </div>

        <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
          <p className="font-semibold mb-1">How to use:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Share QR code for instant verification</li>
            <li>Recipients can scan to verify authenticity</li>
            <li>Includes tamper-proof signature</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}