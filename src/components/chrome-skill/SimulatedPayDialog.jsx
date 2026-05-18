import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, CreditCard, ShieldCheck, X } from 'lucide-react';

const STEPS = ['confirm', 'processing', 'complete'];

export default function SimulatedPayDialog({ amount, currency, skillTitle, onPaymentComplete, onCancel }) {
  const [step, setStep] = useState('confirm'); // confirm | processing | complete

  const handleConfirmPay = () => {
    setStep('processing');
    // Simulate a 1.5s payment processing delay
    setTimeout(() => {
      const stubToken = `GPAY_SIM_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      setStep('complete');
      // Give UI a moment to show success, then callback
      setTimeout(() => {
        onPaymentComplete({
          token: stubToken,
          method: 'google_pay_simulated',
          amount,
          currency,
          timestamp: new Date().toISOString(),
        });
      }, 1200);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
              <span className="text-sm font-bold text-slate-900">G</span>
            </div>
            <span className="text-sm font-semibold text-white">Google Pay</span>
          </div>
          {step === 'confirm' && (
            <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Simulated badge */}
        <div className="mx-5 mb-4 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5">
          <p className="text-[10px] text-amber-400 font-medium text-center">SIMULATED — No real charge will occur</p>
        </div>

        {/* Body */}
        <div className="px-5 pb-6">
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-1">Purchasing skill creation</p>
                <p className="text-lg font-bold text-white">{skillTitle}</p>
              </div>

              <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Skill Creation Fee</span>
                  <span className="text-white font-medium">{currency} {amount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Network</span>
                  <span className="text-slate-300">SoulBridge Village</span>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-slate-800/40 px-3 py-2">
                <CreditCard className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-400">•••• •••• •••• 4242</span>
                <span className="text-[10px] text-slate-600 ml-auto">Simulated</span>
              </div>

              <Button
                onClick={handleConfirmPay}
                className="w-full h-11 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm"
              >
                Pay {currency} {amount}
              </Button>
            </div>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center py-8 space-y-4">
              <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
              <p className="text-sm text-slate-300">Processing payment…</p>
              <p className="text-[10px] text-slate-600">Generating stub token</p>
            </div>
          )}

          {step === 'complete' && (
            <div className="flex flex-col items-center py-8 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-emerald-300">Payment Confirmed</p>
              <p className="text-[10px] text-slate-500">Stub token generated — creating skill…</p>
            </div>
          )}
        </div>

        {/* Footer trust badge */}
        <div className="border-t border-slate-800 px-5 py-3 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-[10px] text-slate-600">Secured by SoulBridge Protocol</span>
        </div>
      </div>
    </div>
  );
}