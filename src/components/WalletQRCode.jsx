import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, ShieldAlert, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import QRCodeStyling from 'qr-code-styling';

export default function WalletQRCode({ wallet, currentUser }) {
    const [decryptedSeed, setDecryptedSeed] = useState(null);
    const [loadingSeed, setLoadingSeed] = useState(false);
    const [seedDialogOpen, setSeedDialogOpen] = useState(false);

    const isOwner = currentUser?.id === wallet.owner_id || currentUser?.role === 'admin';

    const handleOpenSeedQR = async () => {
        setSeedDialogOpen(true);
        if (decryptedSeed) return; // already loaded
        setLoadingSeed(true);
        try {
            const response = await base44.functions.invoke('decryptWalletSeed', {
                wallet_id: wallet.id,
                reason: 'QR code generation'
            });
            if (response.data?.success) {
                setDecryptedSeed(response.data.seed);
            } else {
                toast.error(response.data?.error || 'Failed to decrypt seed');
                setSeedDialogOpen(false);
            }
        } catch (err) {
            toast.error('Failed to decrypt seed');
            setSeedDialogOpen(false);
        } finally {
            setLoadingSeed(false);
        }
    };

    return (
        <div className="flex gap-2 w-full">
            {/* Address QR */}
            {wallet.classic_address && (
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="flex-1">
                            <QrCode className="w-4 h-4 mr-2" />
                            Address QR
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm text-center">
                        <DialogHeader>
                            <DialogTitle>Wallet Address QR</DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-4 py-4">
                            <p className="text-sm text-gray-500 font-medium">{wallet.name}</p>
                            <div className="p-4 bg-white rounded-xl border shadow-sm">
                                <QRCode 
                                    value={wallet.classic_address} 
                                    size={220} 
                                    level="H" 
                                    includeMargin={true}
                                    fgColor="#000000"
                                    bgColor="#ffffff"
                                />
                            </div>
                            <code className="text-xs bg-gray-100 px-3 py-2 rounded w-full text-center break-all">
                                {wallet.classic_address}
                            </code>
                            <p className="text-xs text-gray-400">Scan to receive XRP or tokens to this wallet</p>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Seed QR — decrypted raw seed, owner/admin only */}
            {wallet.encrypted_seed && isOwner && (
                <Dialog open={seedDialogOpen} onOpenChange={(open) => {
                    if (!open) { setSeedDialogOpen(false); setDecryptedSeed(null); }
                    else handleOpenSeedQR();
                }}>
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                            onClick={handleOpenSeedQR}
                        >
                            <ShieldAlert className="w-4 h-4 mr-2" />
                            Seed QR
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm text-center">
                        <DialogHeader>
                            <DialogTitle className="text-red-600">⚠️ Seed QR — Private!</DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 w-full text-left">
                                <p className="text-xs text-red-700 font-semibold">SECURITY WARNING</p>
                                <p className="text-xs text-red-600 mt-1">
                                    Never share this QR code. Anyone who scans it gains full control of this wallet.
                                    Use only in a private, secure location.
                                </p>
                            </div>

                            {loadingSeed ? (
                                <div className="flex flex-col items-center gap-3 py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-red-400" />
                                    <p className="text-sm text-gray-500">Decrypting seed...</p>
                                </div>
                            ) : decryptedSeed ? (
                                <>
                                    <p className="text-sm text-gray-500 font-medium">{wallet.name}</p>
                                    <div className="p-4 bg-white rounded-xl border-2 border-red-300 shadow-sm">
                                        <QRCode 
                                            value={decryptedSeed} 
                                            size={220} 
                                            level="H" 
                                            includeMargin={true}
                                            fgColor="#991b1b"
                                            bgColor="#ffffff"
                                        />
                                    </div>
                                    <code className="text-xs bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded w-full text-center break-all">
                                        {decryptedSeed}
                                    </code>
                                    <p className="text-xs text-red-400">Raw XRPL seed — importable into XUMM / Xaman</p>
                                </>
                            ) : null}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}