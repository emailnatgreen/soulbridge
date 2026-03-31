import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

/**
 * A chat modal for public-facing pages that does NOT require authentication.
 * Uses axiRespond + getConversationMessages backend functions (service role)
 * instead of the base44.agents SDK which requires user auth.
 */
export default function PublicAgentChatModal({ agent, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const convIdRef = useRef(null);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const agentColors = {
    'Axi': 'from-violet-600 to-purple-600',
    'Lore Node': 'from-emerald-600 to-teal-600',
    'Kinetic Weaver': 'from-yellow-600 to-orange-600',
    'Truth Weaver': 'from-blue-600 to-cyan-600',
    'Code Node': 'from-orange-600 to-amber-600',
  };
  const gradientClass = agentColors[agent.name] || 'from-purple-600 to-pink-600';

  const loadMessages = useCallback(async (convId) => {
    try {
      const res = await base44.functions.invoke('getConversationMessages', { conversation_id: convId });
      setMessages(res?.data?.messages || []);
    } catch (err) {
      console.error('Load messages error:', err);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const convId = `public-agent-${agent.id}-${Date.now()}`;
      convIdRef.current = convId;

      // Send a greeting prompt via axiRespond
      const greetingPrompt = `[SYSTEM] You are now speaking as ${agent.name} (role: ${agent.role || 'citizen'}). ${agent.purpose || ''}. A visitor has opened a chat with you. Greet them warmly in character. Keep it brief (2-3 sentences).`;

      try {
        await base44.functions.invoke('axiRespond', {
          conversation_id: convId,
          user_message: greetingPrompt,
          is_greeting: true,
        });
        await loadMessages(convId);
      } catch (err) {
        console.error('Init chat error:', err);
      } finally {
        setLoading(false);
      }

      // Poll for new messages
      pollRef.current = setInterval(() => {
        if (convIdRef.current) loadMessages(convIdRef.current);
      }, 8000);
    };

    init();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [agent.id, agent.name, agent.role, agent.purpose, loadMessages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      await base44.functions.invoke('axiRespond', {
        conversation_id: convIdRef.current,
        user_message: text,
      });
      await loadMessages(convIdRef.current);
    } catch (err) {
      console.error('Send error:', err);
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [input, sending, loadMessages]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-slate-950 border border-slate-700/50 rounded-2xl flex flex-col shadow-2xl"
        style={{ height: '80vh', maxHeight: '700px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 rounded-t-2xl bg-gradient-to-r ${gradientClass}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-white text-sm">
              {agent.avatar_url
                ? <img src={agent.avatar_url} className="w-full h-full rounded-full object-cover" alt={agent.name} />
                : agent.name.charAt(0)}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{agent.name}</p>
              <p className="text-white/60 text-xs">{agent.tagline || agent.purpose?.slice(0, 50) + '...'}</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/10">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-white/40 text-sm">
              Start a conversation with {agent.name}...
            </div>
          ) : (
            messages.map((msg, i) => {
              const isVisitor = msg.sender_agent_id === 'visitor';
              return (
                <div key={msg.id || i} className={`flex ${isVisitor ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    isVisitor
                      ? 'bg-white/10 text-white'
                      : 'bg-slate-800 border border-white/5 text-white/90'
                  }`}>
                    {isVisitor ? (
                      <p>{msg.content}</p>
                    ) : (
                      <ReactMarkdown className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-white/5 rounded-2xl px-4 py-2.5">
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-700/50 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agent.name}...`}
            className="flex-1 resize-none bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 min-h-[40px] max-h-[100px]"
            disabled={sending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className={`bg-gradient-to-r ${gradientClass} border-0 text-white disabled:opacity-40 h-10 w-10`}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}