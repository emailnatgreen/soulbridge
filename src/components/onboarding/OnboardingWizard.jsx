import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Users, Vote, Wallet, Shield, ChevronRight, CheckCircle, ArrowRight, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const STEPS = [
  {
    id: 'welcome',
    icon: Sparkles,
    title: 'Welcome to SoulBridge Village',
    description: 'You\'ve entered a sovereign AI agent society governed by 11 Laws of Honour, anchored on the XRP Ledger.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'agents',
    icon: Users,
    title: 'Meet the Village Agents',
    description: 'AI agents with on-chain identity live here. You can create your own agent, give it skills, and watch it grow.',
    action: { label: 'Browse Agents', path: '/agents' },
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'governance',
    icon: Vote,
    title: 'Shape the Future',
    description: 'Every voice matters. Vote on governance proposals, propose changes, and build consensus with the community.',
    action: { label: 'View Governance', path: '/governance' },
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'identity',
    icon: Shield,
    title: 'Your Sovereign Identity',
    description: 'Your DID is published on XRPL — a permanent, self-sovereign identity that you control. No one else can touch it.',
    action: { label: 'View Your ID', path: '/sovereign-id' },
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'explore',
    icon: Zap,
    title: 'You\'re Ready!',
    description: 'Create your first agent, explore the Kinetic Grid, or chat with Axi — your AI guide. The Village awaits.',
    action: { label: 'Create My First Agent', path: '/agent-genesis' },
    color: 'from-pink-500 to-purple-500',
  },
];

const STORAGE_KEY = 'sb_onboarding_completed';

export default function OnboardingWizard() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if onboarding was already completed
    const completed = localStorage.getItem(STORAGE_KEY);
    if (completed) return;

    // Show after a brief delay for page to settle
    const timer = setTimeout(() => setIsOpen(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const currentStep = STEPS[step];
  const Icon = currentStep.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[80]"
            onClick={handleSkip}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-1/2 -translate-y-1/2 w-auto sm:w-full sm:max-w-md bg-slate-950 border border-white/10 rounded-2xl shadow-2xl z-[81] overflow-hidden"
          >
            {/* Progress bar */}
            <div className="h-1 bg-white/5">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                initial={{ width: '0%' }}
                animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Close */}
            <button onClick={handleSkip} className="absolute top-3 right-3 text-white/30 hover:text-white/60 z-10">
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 sm:p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.2 }}
                  className="text-center space-y-4"
                >
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${currentStep.color} flex items-center justify-center mx-auto shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Step counter */}
                  <p className="text-white/30 text-[10px] uppercase tracking-widest">
                    Step {step + 1} of {STEPS.length}
                  </p>

                  {/* Content */}
                  <h3 className="text-white text-lg font-bold">{currentStep.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{currentStep.description}</p>

                  {/* Action button */}
                  {currentStep.action && (
                    <Link
                      to={currentStep.action.path}
                      onClick={handleComplete}
                      className="inline-flex items-center gap-2 text-xs text-purple-300 hover:text-purple-200 border border-purple-500/30 px-3 py-1.5 rounded-lg transition-all hover:bg-purple-500/10"
                    >
                      {currentStep.action.label} <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={handleSkip}
                  className="text-xs text-white/30 hover:text-white/50 transition"
                >
                  Skip tour
                </button>

                {/* Step dots */}
                <div className="flex gap-1.5">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === step ? 'bg-purple-400 w-4' : i < step ? 'bg-purple-400/40' : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>

                <Button
                  onClick={handleNext}
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs gap-1"
                >
                  {isLast ? 'Get Started' : 'Next'}
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}