import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

/**
 * GuidedTour — Reusable interactive onboarding tour component.
 *
 * Usage:
 *   import GuidedTour from '@/components/onboarding/GuidedTour';
 *
 *   const steps = [
 *     { title: 'Welcome!', content: 'This is the dashboard.', target: '#my-element' },
 *     { title: 'Next Step', content: 'Click here to create.', target: '.create-btn' },
 *     { title: 'All Done', content: 'You are ready!', target: null },
 *   ];
 *
 *   <GuidedTour steps={steps} tourKey="my-page-tour" />
 *
 * Props:
 *   steps      - Array of { title, content, target (CSS selector or null) }
 *   tourKey    - Unique key for localStorage persistence (tour won't re-show after completion)
 *   autoStart  - Boolean, default true (shows tour automatically for first-time visitors)
 *   onComplete - Optional callback when tour is finished
 */

function getElementRect(selector) {
  if (!selector) return null;
  try {
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
    };
  } catch {
    return null;
  }
}

function TooltipBox({ step, stepIndex, totalSteps, onNext, onPrev, onSkip }) {
  const [pos, setPos] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
  const isCentered = !step.target;

  useEffect(() => {
    if (isCentered) {
      setPos({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      return;
    }
    const rect = getElementRect(step.target);
    if (!rect) {
      setPos({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      return;
    }
    // Position below the element, centered
    const tooltipWidth = 320;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
    const top = rect.top + rect.height + 12;
    setPos({ top: `${top}px`, left: `${left}px`, transform: 'none' });
  }, [step, isCentered]);

  return (
    <div
      className="fixed z-[9999] w-80 bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl p-5"
      style={pos}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-amber-300 font-semibold text-sm">{step.title}</span>
        </div>
        <button onClick={onSkip} className="text-slate-500 hover:text-slate-300 transition-colors ml-2">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <p className="text-slate-300 text-sm leading-relaxed mb-4">{step.content}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{stepIndex + 1} / {totalSteps}</span>
        <div className="flex gap-2">
          {stepIndex > 0 && (
            <Button size="sm" variant="outline"
              className="h-7 px-2.5 text-xs border-slate-600 text-slate-300 hover:text-white"
              onClick={onPrev}>
              <ChevronLeft className="w-3 h-3 mr-0.5" />Back
            </Button>
          )}
          <Button size="sm"
            className="h-7 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white border-0"
            onClick={onNext}>
            {stepIndex === totalSteps - 1 ? 'Finish' : 'Next'}
            {stepIndex < totalSteps - 1 && <ChevronRight className="w-3 h-3 ml-0.5" />}
          </Button>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1 justify-center mt-3">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === stepIndex ? 'bg-amber-400' : 'bg-slate-600'}`} />
        ))}
      </div>
    </div>
  );
}

function SpotlightOverlay({ target }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!target) { setRect(null); return; }
    const update = () => setRect(getElementRect(target));
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update);
    };
  }, [target]);

  if (!rect) {
    return <div className="fixed inset-0 z-[9998] bg-black/60" />;
  }

  const pad = 8;
  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={rect.left - pad}
              y={rect.top - pad}
              width={rect.width + pad * 2}
              height={rect.height + pad * 2}
              rx="8"
              fill="black"
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#spotlight-mask)" />
        <rect
          x={rect.left - pad}
          y={rect.top - pad}
          width={rect.width + pad * 2}
          height={rect.height + pad * 2}
          rx="8"
          fill="none"
          stroke="rgba(251,191,36,0.6)"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

export default function GuidedTour({ steps = [], tourKey, autoStart = true, onComplete }) {
  const storageKey = `guided-tour-done-${tourKey}`;
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!autoStart || !tourKey || !steps.length) return;
    const done = localStorage.getItem(storageKey);
    if (!done) setActive(true);
  }, [autoStart, tourKey, steps.length, storageKey]);

  const finish = useCallback(() => {
    setActive(false);
    if (tourKey) localStorage.setItem(storageKey, 'true');
    onComplete?.();
  }, [tourKey, storageKey, onComplete]);

  const handleNext = () => {
    if (stepIndex < steps.length - 1) setStepIndex(s => s + 1);
    else finish();
  };

  const handlePrev = () => setStepIndex(s => Math.max(0, s - 1));

  if (!active || !steps.length) return null;

  const step = steps[stepIndex];

  return createPortal(
    <>
      <SpotlightOverlay target={step.target} />
      <TooltipBox
        step={step}
        stepIndex={stepIndex}
        totalSteps={steps.length}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={finish}
      />
    </>,
    document.body
  );
}

/** Helper to manually re-trigger a tour (e.g. from a Help button) */
export function resetTour(tourKey) {
  localStorage.removeItem(`guided-tour-done-${tourKey}`);
  window.location.reload();
}