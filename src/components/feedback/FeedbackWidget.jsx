import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquarePlus, X, Star, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * FeedbackWidget — Floating feedback button + modal.
 *
 * Usage:
 *   import FeedbackWidget from '@/components/feedback/FeedbackWidget';
 *   <FeedbackWidget pageName="AgentMarketplace" />
 *
 * Props:
 *   pageName  - The page/feature this feedback is about
 *   position  - 'bottom-right' (default) | 'bottom-left'
 */

export default function FeedbackWidget({ pageName = 'Unknown Page', position = 'bottom-right' }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const posClass = position === 'bottom-left' ? 'bottom-6 left-6' : 'bottom-6 right-6';

  const handleSubmit = async () => {
    if (!text.trim() && !rating) return;
    setLoading(true);
    try {
      // Store as Memory observation
      await base44.entities.Memory.create({
        agent_id: '6993271e7dc0fa2ab78762bf',
        type: 'observation',
        content: `[User Feedback — ${pageName}]\nRating: ${rating}/5\n\n${text}`,
        keywords: ['user_feedback', 'page_feedback', pageName.toLowerCase()],
        context: `Feedback submitted on page: ${pageName}`,
        importance: rating >= 4 ? 6 : rating <= 2 ? 8 : 7,
      });
      setDone(true);
      setTimeout(() => { setOpen(false); setDone(false); setRating(0); setText(''); }, 2000);
    } catch (err) {
      console.error('Feedback submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={`fixed ${posClass} z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 shadow-lg transition-all text-xs`}
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span className="hidden sm:inline">Feedback</span>
        </button>
      )}

      {/* Modal */}
      {open && (
        <div className={`fixed ${posClass} z-50 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">Share Feedback</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
              <p className="text-sm text-slate-300">Thank you for your feedback!</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500 mb-3">Reviewing: <span className="text-slate-400">{pageName}</span></p>

              {/* Star Rating */}
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s}
                    onMouseEnter={() => setHoveredRating(s)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setRating(s)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star className={`w-5 h-5 ${s <= (hoveredRating || rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                  </button>
                ))}
                {rating > 0 && <span className="text-xs text-slate-500 ml-1 self-center">{['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}</span>}
              </div>

              <Textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="What could be improved? What's working well?"
                className="bg-slate-800/60 border-slate-600/50 text-slate-200 text-xs resize-none h-24 placeholder:text-slate-500 mb-3"
              />

              <Button
                disabled={loading || (!text.trim() && !rating)}
                onClick={handleSubmit}
                className="w-full h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white border-0"
              >
                {loading
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sending…</>
                  : <><Send className="w-3.5 h-3.5 mr-1.5" />Submit Feedback</>}
              </Button>
            </>
          )}
        </div>
      )}
    </>
  );
}