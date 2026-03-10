import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, TrendingUp, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

const CURRENCIES = [
  { code: 'USD', symbol: '$', flag: '🇺🇸' },
  { code: 'GBP', symbol: '£', flag: '🇬🇧' },
  { code: 'EUR', symbol: '€', flag: '🇪🇺' },
];

async function fetchXRPRates() {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd,gbp,eur'
  );
  if (!res.ok) throw new Error('Failed to fetch rates');
  const data = await res.json();
  return data.ripple;
}

export default function CurrencyConverter({ walletBalance = 0 }) {
  const [amount, setAmount] = useState(String(walletBalance || ''));

  const { data: rates, isLoading, error } = useQuery({
    queryKey: ['xrp-rates'],
    queryFn: fetchXRPRates,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const xrpAmount = parseFloat(amount) || 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-semibold text-gray-700">Currency Converter</span>
        </div>
        {isLoading && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
        {rates && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Live rates
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Input
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="pr-14 text-sm"
            placeholder="0.00"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-purple-600">
            XRP
          </span>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500">Unable to load live rates.</p>
      )}

      {rates && (
        <div className="grid grid-cols-3 gap-2">
          {CURRENCIES.map(({ code, symbol, flag }) => (
            <div
              key={code}
              className="bg-white rounded-lg border border-gray-200 p-2.5 text-center"
            >
              <p className="text-xs text-gray-400 mb-0.5">{flag} {code}</p>
              <p className="text-sm font-bold text-gray-800">
                {symbol}{(xrpAmount * rates[code.toLowerCase()]).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                1 XRP = {symbol}{rates[code.toLowerCase()].toFixed(4)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}