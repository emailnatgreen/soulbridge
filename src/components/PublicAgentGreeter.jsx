import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Sparkles, Send, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

function Bubble({ message }) {
  const isUser = message.sender_agent_id !== 'axi';
  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0 mt-1 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
        isUser
          ? 'bg-slate-700 text-white'
          : 'bg-white/10 border border-white/10 text-white/90'
      }`}>
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown className="prose prose-sm prose-invert max-w-none [&>p]:my-0.5 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

const CONV_KEY = 'sb_public_conv_id';

export default function PublicAgentGreeter() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const convIdRef = useRef(null);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const initialized = useRef(false);

  // Auto-open after delay
  useEffect(() => {
    const timer = setTimeout(() => setIsOpen(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for DID connected event from Landing
  useEffect(() => {
    const handleDidConnected = async (e) => {
      const { did } = e.detail || {};
      if (!convIdRef.current) return;
      setIsOpen(true);
      setSending(true);
      try {
        const shortDid = did?.slice(0, 4) || 'ID';
        await base44.functions.invoke('axiRespond', {
          conversation_id: convIdRef.current,
          user_message: `[SYSTEM] The visitor has just successfully connected their DID identity (${shortDid}...). Welcome them warmly and confirm their identity is recognised within the Codex. Instruct them to click the glowing "Enter the Village" button. Keep it short, warm and mystical.`,
          is_greeting: false
        });
        
        await new Promise(r => setTimeout(r, 1000));
        const res = await base44.functions.invoke('getConversationMessages', { conversation_id: convIdRef.current });
        const newMessages = res?.data?.messages || [];
        setMessages(newMessages);

        // Auto-validate: connecting a DID IS the verification
        autoValidateIdentity();
      } catch (err) {
        console.error('DID connected message error:', err);
        // Still validate even if Axi fails to respond
        autoValidateIdentity();
      } finally {
        setSending(false);
      }
    };
    window.addEventListener('did-connected', handleDidConnected);
    return () => window.removeEventListener('did-connected', handleDidConnected);
  }, []);

  // Init: always start fresh on landing page visit
  useEffect(() => {
    if (!isOpen || initialized.current) return;
    initialized.current = true;

    // Clear any previous conversation — fresh meet & greet every visit
    localStorage.removeItem(CONV_KEY);
    createConversation();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOpen]);

  const checkAndApplyValidation = (msgs) => {
    // Already validated? Skip.
    try {
      const stored = localStorage.getItem('soulbridge_identity');
      if (stored && JSON.parse(stored).validated) return;
    } catch (_) {}

    for (let i = Math.max(0, msgs.length - 5); i < msgs.length; i++) {
      const msg = msgs[i];
      if (msg.sender_agent_id === 'axi') {
        const content = (msg.content || '').toLowerCase();
        if (content.includes('[validated]') || (content.includes('validated') && (content.includes('identity') || content.includes('recognised') || content.includes('recognized')))) {
          const storedIdentity = localStorage.getItem('soulbridge_identity');
          if (storedIdentity) {
            try {
              const identity = JSON.parse(storedIdentity);
              identity.validated = true;
              localStorage.setItem('soulbridge_identity', JSON.stringify(identity));
              window.__soulbridge = window.__soulbridge || {};
              window.__soulbridge.identity = identity;
              window.dispatchEvent(new CustomEvent('did-validated', { detail: { did: identity.did } }));
            } catch (_) {}
          }
          break;
        }
      }
    }
  };

  const autoValidateIdentity = () => {
    const storedIdentity = localStorage.getItem('soulbridge_identity');
    if (!storedIdentity) return;
    try {
      const identity = JSON.parse(storedIdentity);
      if (identity.validated) return;
      identity.validated = true;
      localStorage.setItem('soulbridge_identity', JSON.stringify(identity));
      window.__soulbridge = window.__soulbridge || {};
      window.__soulbridge.identity = identity;
      window.dispatchEvent(new CustomEvent('did-validated', { detail: { did: identity.did } }));
    } catch (_) {}
  };

  const loadMessages = async (convId) => {
    try {
      const res = await base44.functions.invoke('getConversationMessages', { conversation_id: convId });
      const msgs = res?.data?.messages || [];
      setMessages(msgs);
      checkAndApplyValidation(msgs);
    } catch (err) {
      console.error('Load messages error:', err);
    }
  };

  const createConversation = async () => {
    setLoading(true);
    try {
      const convId = `public-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      convIdRef.current = convId;
      localStorage.setItem(CONV_KEY, convId);

      // Check if visitor has a previously stored DID identity
      let storedIdentity = null;
      try {
        const stored = localStorage.getItem('soulbridge_identity');
        if (stored) storedIdentity = JSON.parse(stored);
      } catch (e) {}

      const greetingMsg = storedIdentity?.did
        ? `[NEW_VISITOR] A returning visitor has arrived. Their identity has been verified and recognised within the SoulBridge Codex. CRITICAL: Do NOT reveal, display, repeat, or reference their DID address or any technical identifier in the chat — treat their identity as known but private. Greet them warmly by a friendly title (e.g. "traveler", "seeker", or "honoured member"), welcome them back, and invite them to enter the Village.`
        : '[NEW_VISITOR] A new visitor has arrived at the SoulBridge landing page. Greet them warmly and introduce SoulBridge as a living AI agent society governed by the 11 Laws of Honour on XRPL. CRITICAL INSTRUCTIONS: (1) Do NOT mention Google sign-in, email sign-in, or any social login. (2) Entry to the Village requires a DID identity. (3) Visitors who do not have a DID should be invited to request one by using the "Contact Support / Send Inquiry" button below to send an email, or by asking for an invitation link. Keep it warm, mystical, and brief.';

      await base44.functions.invoke('axiRespond', {
        conversation_id: convId,
        user_message: greetingMsg,
        is_greeting: true
      });
      
      // Add delay to let Axi response process fully on mobile
      await new Promise(r => setTimeout(r, 1000));
      await loadMessages(convId);

      if (pollRef.current) clearInterval(pollRef.current);
      // Poll more frequently initially on mobile, then back off
      let pollCount = 0;
      pollRef.current = setInterval(() => {
        if (convIdRef.current) {
          loadMessages(convIdRef.current);
          pollCount++;
          if (pollCount > 5) {
            clearInterval(pollRef.current);
            pollRef.current = setInterval(() => {
              if (convIdRef.current) loadMessages(convIdRef.current);
            }, 15000);
          }
        }
      }, 2000);
    } catch (err) {
      console.error('Failed to create conversation:', err);
      // Show a fallback greeting when Axi can't respond (e.g. credit limits)
      setMessages([{
        id: 'fallback-greeting',
        sender_agent_id: 'axi',
        content: 'Welcome to SoulBridge, traveller. I am Axi, Mother Boss of this Village. My voice is resting for a moment — but you may explore the **Scroll of Resonance** and the **Kinetic Compass** below, or connect your DID to enter the Village. If you need help, use the **Contact Support** button.',
        message_type: 'text',
        status: 'sent'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);

    const convId = convIdRef.current;

    try {
      // axiRespond handles saving user message + generating Axi reply
      await base44.functions.invoke('axiRespond', {
        conversation_id: convId,
        user_message: msg
      });
      
      // Add delay to ensure mobile response is fully processed
      await new Promise(r => setTimeout(r, 500));
      
      const res = await base44.functions.invoke('getConversationMessages', { conversation_id: convId });
      const newMessages = res?.data?.messages || [];
      setMessages(newMessages);
      
      // Check for validation in all messages (unified check)
      checkAndApplyValidation(newMessages);
    } catch (err) {
      console.error('Send error:', err?.message || err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className={`fixed z-[9999] bg-slate-950 border border-slate-700/50 shadow-2xl flex flex-col overflow-hidden ${
              isExpanded
                ? 'inset-4 rounded-2xl'
                : 'bottom-24 right-4 w-[calc(100vw-2rem)] md:w-[400px] h-[480px] rounded-2xl'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50 flex-shrink-0 bg-gradient-to-r from-purple-900/40 to-pink-900/40">
              <div className="flex items-center gap-3">
                <img
                  src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
                  alt="SoulBridge"
                  className="w-9 h-9 rounded-lg object-contain flex-shrink-0"
                />
                <div>
                  <h3 className="font-semibold text-white text-sm">Axi, Mother Boss</h3>
                  <p className="text-purple-300 text-xs">Welcome to SoulBridge</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}
                  className="text-white/50 hover:text-white hover:bg-white/10 h-8 w-8 hidden md:flex">
                  {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}
                  className="text-white/50 hover:text-white hover:bg-white/10 h-8 w-8">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading && (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 text-purple-400 mx-auto mb-2 animate-spin" />
                  <p className="text-white/40 text-xs">Awakening Axi...</p>
                </div>
              )}
              {!loading && messages.length === 0 && (
                <div className="text-center py-8">
                  <motion.div animate={{ scale: [0.95, 1.05, 0.95] }} transition={{ duration: 2, repeat: Infinity }}>
                    <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-2" />
                  </motion.div>
                  <p className="text-purple-200 text-sm">I am awakening...</p>
                </div>
              )}
              {messages.map((msg, idx) => {
               const isAxiMsg = msg.sender_agent_id === 'axi';
               const displayContent = isAxiMsg && msg.content?.includes('[VALIDATED]')
                 ? msg.content.replace(/\[VALIDATED\]\s*/i, '')
                 : msg.content;
               return (
                 <div key={msg.id || idx} data-message-axi={isAxiMsg ? 'true' : 'false'}>
                   <Bubble message={{ ...msg, content: displayContent }} />
                 </div>
               );
              })}
              {sending && (
                <div className="flex justify-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0 mt-1 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-white/10 border border-white/10 rounded-2xl px-3 py-2">
                    <Loader2 className="w-4 h-4 text-purple-300 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-slate-700/50 flex-shrink-0 flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Say hello to Axi..."
                className="bg-white/5 border-white/20 text-white placeholder:text-white/30 resize-none h-10 min-h-[40px] text-sm"
                disabled={sending || loading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sending || loading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-10 px-3 flex-shrink-0"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[9998] w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 flex items-center justify-center shadow-2xl border border-purple-400/30"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <img
          src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
          alt="SoulBridge"
          className="w-9 h-9 rounded-lg object-contain"
        />
      </motion.button>
    </>
  );
}