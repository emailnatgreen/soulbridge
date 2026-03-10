import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Coins, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function WalletTrustlines({ wallet }) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(false);

    const fetchTrustlines = async () => {
        if (!wallet?.classic_address) return;
        setLoading(true);
        setError(null);
        try {
            const res = await base44.functions.invoke('getWalletTrustlines', {
                wallet_id: wallet.id,
                address: wallet.classic_address,
                network: wallet.network
            });
            setData(res.data);
            setExpanded(true);
        } catch (e) {
            setError(e?.response?.data?.error || e.message || 'Failed to fetch trustlines');
        } finally {
            setLoading(false);
        }
    };

    const toggle = () => {
        if (!data) {
            fetchTrustlines();
        } else {
            setExpanded(prev => !prev);
        }
    };

    if (!wallet?.classic_address) return null;

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <Button
                variant="ghost"
                className="w-full flex items-center justify-between px-3 py-2 h-auto text-left rounded-none"
                onClick={toggle}
                disabled={loading}
            >
                <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium text-gray-700">Token Trustlines</span>
                    {data && (
                        <Badge variant="secondary" className="text-xs">
                            {data.trustline_count}
                        </Badge>
                    )}
                </div>
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : expanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
            </Button>

            {expanded && data && (
                <div className="px-3 pb-3 pt-1 space-y-2 bg-gray-50">
                    {data.not_activated && (
                        <p className="text-xs text-amber-700 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Wallet not activated on XRPL
                        </p>
                    )}

                    {data.trustlines?.length === 0 && (
                        <p className="text-xs text-gray-500 italic">No trustlines established yet.</p>
                    )}

                    {data.trustlines?.map((tl, i) => (
                        <div key={i} className="bg-white border border-gray-100 rounded-md p-2 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-purple-700 text-sm">
                                    {tl.currency_display}
                                </span>
                                <span className={`font-bold ${tl.balance > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                    {tl.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                                </span>
                            </div>
                            <div className="text-gray-400 truncate">
                                Issuer: <span className="font-mono text-gray-600">{tl.issuer}</span>
                            </div>
                            <div className="flex gap-3 text-gray-500">
                                <span>Limit: <span className="text-gray-700">{tl.limit.toLocaleString()}</span></span>
                                {tl.freeze && <Badge variant="destructive" className="text-xs py-0">Frozen</Badge>}
                                {tl.no_ripple && <Badge variant="outline" className="text-xs py-0">No Ripple</Badge>}
                            </div>
                        </div>
                    ))}

                    {error && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {error}
                        </p>
                    )}
                </div>
            )}

            {error && !expanded && (
                <div className="px-3 pb-2 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {error}
                </div>
            )}
        </div>
    );
}