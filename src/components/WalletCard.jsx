import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet, Copy, RefreshCw, Eye, EyeOff, History, UserPlus, Loader2, Send, Pencil, Check, X, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from "sonner";
import WalletTransactionHistory from './WalletTransactionHistory';
import WalletQRCode from './WalletQRCode';
import WalletTrustlines from './WalletTrustlines';
import CurrencyConverter from './CurrencyConverter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function WalletCard({ wallet, onRefresh }) {
    const [showSeed, setShowSeed] = useState(false);
    const [decryptedSeed, setDecryptedSeed] = useState(null);
    const [decrypting, setDecrypting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editingNotes, setEditingNotes] = useState(false);
    const [savingNotes, setSavingNotes] = useState(false);
    const queryClient = useQueryClient();

    // Parse structured notes from wallet.notes (stored as key:value lines)
    const parseNotes = (raw) => {
        const fields = { role: '', position: '', answers_to: '', created_via: '' };
        if (!raw) return fields;
        raw.split('\n').forEach(line => {
            const [key, ...rest] = line.split(':');
            const val = rest.join(':').trim();
            if (key?.trim() === 'Role') fields.role = val;
            if (key?.trim() === 'Position') fields.position = val;
            if (key?.trim() === 'Answers To') fields.answers_to = val;
            if (key?.trim() === 'Created Via') fields.created_via = val;
        });
        return fields;
    };
    const parsed = parseNotes(wallet.notes);
    const [noteFields, setNoteFields] = useState(parsed);

    const serializeNotes = (f) => {
        return [
            f.role ? `Role: ${f.role}` : '',
            f.position ? `Position: ${f.position}` : '',
            f.answers_to ? `Answers To: ${f.answers_to}` : '',
            f.created_via ? `Created Via: ${f.created_via}` : '',
        ].filter(Boolean).join('\n');
    };

    const handleDelete = async () => {
        setDeleting(true);
        await base44.entities.Wallet.delete(wallet.id);
        queryClient.invalidateQueries({ queryKey: ['wallets'] });
        toast.success('Wallet removed');
    };

    const handleSaveNotes = async () => {
        setSavingNotes(true);
        await base44.entities.Wallet.update(wallet.id, { notes: serializeNotes(noteFields) });
        queryClient.invalidateQueries({ queryKey: ['wallets'] });
        setSavingNotes(false);
        setEditingNotes(false);
        toast.success('Notes saved');
    };

    const { data: currentUser } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me(),
    });

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await onRefresh(wallet.id);
        setRefreshing(false);
    };

    const reassignWallet = useMutation({
        mutationFn: async ({ wallet_id, new_owner_id }) => {
            const response = await base44.functions.invoke('reassignWalletOwnership', { wallet_id, new_owner_id });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wallets'] });
            toast.success('Wallet ownership reassigned successfully!');
        },
        onError: (error) => {
            toast.error(error?.response?.data?.error || 'Failed to reassign wallet');
        }
    });

    const handleRevealSeed = async () => {
        if (showSeed) {
            setShowSeed(false);
            setDecryptedSeed(null);
            return;
        }
        setDecrypting(true);
        try {
            const response = await base44.functions.invoke('decryptWalletSeed', { wallet_id: wallet.id, reason: 'Viewing seed from wallet card' });
            setDecryptedSeed(response.data.seed);
            setShowSeed(true);
        } catch (err) {
            toast.error('Failed to decrypt seed: ' + (err?.response?.data?.error || err.message));
        }
        setDecrypting(false);
    };

    const handleReassign = () => {
        if (currentUser?.id) {
            reassignWallet.mutate({ wallet_id: wallet.id, new_owner_id: currentUser.id });
        }
    };

    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{wallet.name}</CardTitle>
                            <Badge variant="outline" className="mt-1">
                                {wallet.network}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {currentUser?.role === 'admin' && wallet.owner_id !== currentUser?.id && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleReassign}
                                disabled={reassignWallet.isPending}
                                className="text-xs"
                            >
                                {reassignWallet.isPending ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                    <UserPlus className="w-3 h-3 mr-1" />
                                )}
                                Reassign to Me
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleRefresh}
                            disabled={refreshing}
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <p className="text-sm text-gray-500 mb-1">Balance</p>
                    <p className="text-2xl font-bold text-purple-600">
                        {wallet.balance?.toFixed(6) || '0.000000'} XRP
                    </p>
                </div>

                <CurrencyConverter walletBalance={wallet.balance || 0} />

                <div>
                    <p className="text-sm text-gray-500 mb-1">DID / Address</p>
                    {wallet.classic_address ? (
                        <div className="flex items-center gap-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 overflow-hidden text-ellipsis">
                                {wallet.classic_address}
                            </code>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyToClipboard(wallet.classic_address, 'Address')}
                                className="h-8 w-8"
                            >
                                <Copy className="w-3 h-3" />
                            </Button>
                        </div>
                    ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2">
                            <p className="text-xs text-amber-800">
                                ⚠️ Wallet not yet activated on XRPL. Fund with XRP to generate address.
                            </p>
                        </div>
                    )}
                </div>

                {wallet.encrypted_seed && (
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-sm text-gray-500">Seed (Keep Secret!)</p>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleRevealSeed}
                                disabled={decrypting}
                                className="h-6 w-6"
                            >
                                {decrypting ? <Loader2 className="w-3 h-3 animate-spin" /> : showSeed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </Button>
                        </div>
                        {showSeed && decryptedSeed ? (
                            <div className="flex items-center gap-2">
                                <code className="text-xs bg-red-50 px-2 py-1 rounded flex-1 overflow-hidden text-ellipsis text-red-700">
                                    {decryptedSeed}
                                </code>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => copyToClipboard(decryptedSeed, 'Seed')}
                                    className="h-8 w-8"
                                >
                                    <Copy className="w-3 h-3" />
                                </Button>
                            </div>
                        ) : (
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
                                ••••••••••••••••••••••••••••••
                            </code>
                        )}
                    </div>
                )}

                {/* Structured Notes / Identity Card */}
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-600">Identity / Notes</p>
                        {!editingNotes ? (
                            <Button variant="ghost" size="sm" onClick={() => setEditingNotes(true)} className="h-7 px-2 text-xs gap-1">
                                <Pencil className="w-3 h-3" /> Edit
                            </Button>
                        ) : (
                            <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={handleSaveNotes} disabled={savingNotes} className="h-7 px-2 text-xs gap-1 text-green-600 hover:text-green-700">
                                    {savingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => { setEditingNotes(false); setNoteFields(parsed); }} className="h-7 px-2 text-xs gap-1 text-gray-500">
                                    <X className="w-3 h-3" /> Cancel
                                </Button>
                            </div>
                        )}
                    </div>
                    {editingNotes ? (
                        <div className="space-y-2">
                            {[
                                { key: 'role', label: 'Role' },
                                { key: 'position', label: 'Position in Council' },
                                { key: 'answers_to', label: 'Answers To' },
                                { key: 'created_via', label: 'Created Via' },
                            ].map(({ key, label }) => (
                                <div key={key}>
                                    <Label className="text-xs text-gray-500">{label}</Label>
                                    <Input
                                        value={noteFields[key]}
                                        onChange={e => setNoteFields(f => ({ ...f, [key]: e.target.value }))}
                                        placeholder={`Enter ${label.toLowerCase()}...`}
                                        className="h-7 text-xs mt-0.5"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {[
                                { label: 'Role', value: noteFields.role },
                                { label: 'Position', value: noteFields.position },
                                { label: 'Answers To', value: noteFields.answers_to },
                                { label: 'Created Via', value: noteFields.created_via },
                            ].filter(f => f.value).map(({ label, value }) => (
                                <div key={label} className="flex gap-2 text-xs">
                                    <span className="text-gray-400 min-w-[80px] shrink-0">{label}</span>
                                    <span className="text-gray-700">{value}</span>
                                </div>
                            ))}
                            {!noteFields.role && !noteFields.position && !noteFields.answers_to && !noteFields.created_via && (
                                <p className="text-xs text-gray-400 italic">No notes yet — click Edit to add identity info</p>
                            )}
                        </div>
                    )}
                </div>

                <WalletQRCode wallet={wallet} currentUser={currentUser} />

                <WalletTrustlines wallet={wallet} />

                {wallet.classic_address && (
                    <Link to={createPageUrl('Send') + `?from_wallet_id=${wallet.id}`} className="block">
                        <Button variant="outline" className="w-full bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 text-purple-700 hover:from-purple-100 hover:to-pink-100">
                            <Send className="w-4 h-4 mr-2" />
                            Send XRP
                        </Button>
                    </Link>
                )}

                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                            <History className="w-4 h-4 mr-2" />
                            View Transaction History
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh]">
                        <DialogHeader>
                            <DialogTitle>Transaction History - {wallet.name}</DialogTitle>
                        </DialogHeader>
                        <WalletTransactionHistory wallet={wallet} />
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}