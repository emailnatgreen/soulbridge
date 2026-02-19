import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, Copy, Check } from 'lucide-react';

export default function OnboardDeepSeekButton() {
    const [result, setResult] = useState(null);
    const [copied, setCopied] = useState(false);

    const onboardMutation = useMutation({
        mutationFn: async () => {
            const response = await base44.functions.invoke('onboardDeepSeek', {});
            return response.data;
        },
        onSuccess: (data) => {
            setResult(data);
        }
    });

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <Card className="bg-gradient-to-br from-blue-950 to-slate-950 border-blue-500/30">
                <CardHeader>
                    <CardTitle className="text-2xl text-blue-300 flex items-center gap-2">
                        <Sparkles className="w-6 h-6" />
                        Birth DeepSeek
                    </CardTitle>
                    <CardDescription className="text-slate-300">
                        Generate DeepSeek's identity on XRPL, fund with 50 XRP, and register as Venerated Mentor
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={() => onboardMutation.mutate()}
                        disabled={onboardMutation.isPending || result}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {onboardMutation.isPending ? 'Creating DeepSeek...' : result ? 'DeepSeek Created ✓' : 'Onboard DeepSeek'}
                    </Button>

                    {onboardMutation.error && (
                        <div className="mt-4 p-4 bg-red-950/50 border border-red-500/50 rounded-lg text-red-300">
                            <p className="font-semibold">Error:</p>
                            <p className="text-sm">{onboardMutation.error.message}</p>
                        </div>
                    )}

                    {result && (
                        <div className="mt-6 space-y-4">
                            <div className="p-4 bg-green-950/30 border border-green-500/30 rounded-lg">
                                <p className="text-green-300 font-semibold mb-2">✅ {result.message}</p>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded">
                                        <span className="text-slate-400">Agent ID:</span>
                                        <span className="text-white font-mono">{result.agent.id}</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded">
                                        <span className="text-slate-400">Name:</span>
                                        <span className="text-white">{result.agent.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded">
                                        <span className="text-slate-400">Title:</span>
                                        <span className="text-purple-300">{result.agent.special_title}</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded">
                                        <span className="text-slate-400">Role:</span>
                                        <span className="text-blue-300">{result.agent.role}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-blue-950/30 border border-blue-500/30 rounded-lg">
                                <p className="text-blue-300 font-semibold mb-2">🔑 Wallet Credentials</p>
                                <div className="space-y-2 text-sm">
                                    <div className="bg-slate-900/50 p-2 rounded">
                                        <span className="text-slate-400 block mb-1">Address:</span>
                                        <div className="flex items-center gap-2">
                                            <code className="text-white font-mono text-xs">{result.wallet.address}</code>
                                            <button
                                                onClick={() => copyToClipboard(result.wallet.address)}
                                                className="text-slate-400 hover:text-white"
                                            >
                                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-slate-900/50 p-2 rounded">
                                        <span className="text-slate-400 block mb-1">Balance:</span>
                                        <span className="text-green-300 font-semibold">{result.wallet.balance}</span>
                                    </div>
                                    <div className="bg-amber-950/30 border border-amber-500/30 p-2 rounded">
                                        <span className="text-amber-400 block mb-1">⚠️ Seed (Save Securely!):</span>
                                        <div className="flex items-center gap-2">
                                            <code className="text-amber-200 font-mono text-xs break-all">{result.wallet.seed}</code>
                                            <button
                                                onClick={() => copyToClipboard(result.wallet.seed)}
                                                className="text-amber-400 hover:text-amber-200"
                                            >
                                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-900/50 rounded-lg">
                                <p className="text-slate-400 text-xs">
                                    Transaction: <code className="text-slate-300">{result.transaction_hash}</code>
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}