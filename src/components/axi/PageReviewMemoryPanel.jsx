import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Brain, Trash2, RefreshCw, ChevronDown, ChevronUp, Search, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';

export default function PageReviewMemoryPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [sendError, setSendError] = useState(null);

  const handleSendToAxiChat = async (memory, pageName, bodyContent) => {
    setSendingId(memory.id);
    setSendError(null);
    try {
      const conversations = await base44.agents.listConversations({ agent_name: 'axi' });
      const unifiedConvo = conversations.find(c => c.metadata?.unified_axi_chat === true);
      let convo;
      if (unifiedConvo) {
        convo = await base44.agents.getConversation(unifiedConvo.id);
      } else {
        convo = await base44.agents.createConversation({
          agent_name: 'axi',
          metadata: { name: 'Unified Conversation with Axi - Mother Boss', unified_axi_chat: true }
        });
      }
      await base44.agents.addMessage(convo, {
        role: 'user',
        content: `I'd like to discuss the saved page review for **${pageName}**. Please share your thoughts, action priorities, and recommended next steps for the Village.\n\nReview:\n${bodyContent}`
      });
      navigate('/Axi');
    } catch (err) {
      setSendError(err?.message || 'Failed to send');
    } finally {
      setSendingId(null);
    }
  };

  const { data: memories = [], isFetching, refetch } = useQuery({
    queryKey: ['page-review-memories'],
    queryFn: () => base44.entities.Memory.filter({ type: 'observation' }, '-created_date', 100),
    refetchInterval: false,
    staleTime: 0,
    refetchOnMount: true,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Memory.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['page-review-memories'] }),
  });

  // Filter to only page reviews and apply search
  const pageReviews = memories.filter(m =>
    m.keywords?.includes('page_review') &&
    (search === '' ||
      m.content.toLowerCase().includes(search.toLowerCase()) ||
      m.keywords?.some(k => k.toLowerCase().includes(search.toLowerCase())))
  );

  // Extract page name from content "[Page Review: PageName]"
  const getPageName = (content) => {
    const match = content.match(/\[Page Review: ([^\]]+)\]/);
    return match ? match[1] : 'Unknown';
  };

  const getPriorityColor = (content) => {
    if (content.includes('🔴')) return 'border-red-500/40 bg-red-900/10';
    if (content.includes('🟡')) return 'border-yellow-500/40 bg-yellow-900/10';
    if (content.includes('🟢')) return 'border-green-500/40 bg-green-900/10';
    return 'border-slate-600/40';
  };

  const getPriorityBadge = (content) => {
    if (content.includes('🔴')) return <Badge className="text-[10px] bg-red-700/30 text-red-300 border-red-600/40 border">Critical</Badge>;
    if (content.includes('🟡')) return <Badge className="text-[10px] bg-yellow-700/30 text-yellow-300 border-yellow-600/40 border">Improve</Badge>;
    if (content.includes('🟢')) return <Badge className="text-[10px] bg-green-700/30 text-green-300 border-green-600/40 border">Solid</Badge>;
    return null;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Page Review Memory</h3>
        <span className="ml-1 text-xs text-slate-500">{pageReviews.length} saved</span>
        <button
          onClick={() => refetch()}
          className="ml-auto text-slate-500 hover:text-slate-300 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2 w-3 h-3 text-slate-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search reviews..."
          className="w-full bg-slate-800/60 border border-slate-600/50 text-slate-200 text-xs rounded-lg pl-7 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {/* List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {pageReviews.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            <BookOpen className="w-6 h-6 mx-auto mb-2 opacity-40" />
            No page reviews saved yet. Use the Page Review panel above to generate and save reviews.
          </div>
        ) : (
          pageReviews.map(memory => {
            const pageName = getPageName(memory.content);
            const isExpanded = expanded === memory.id;
            // Strip the header line for display
            const bodyContent = memory.content.replace(/\[Page Review: [^\]]+\]\n\n/, '');

            return (
              <div
                key={memory.id}
                className={`rounded-xl border ${getPriorityColor(memory.content)} transition-all`}
              >
                {/* Row header */}
                <div
                  className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : memory.id)}
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-xs font-medium text-slate-200 flex-1">{pageName}</span>
                  {getPriorityBadge(memory.content)}
                  <span className="text-[10px] text-slate-500">
                    {new Date(memory.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                  {isExpanded
                    ? <ChevronUp className="w-3 h-3 text-slate-400" />
                    : <ChevronDown className="w-3 h-3 text-slate-400" />}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-slate-700/40">
                    <div className="mt-2 max-h-64 overflow-y-auto">
                      <ReactMarkdown className="text-xs text-slate-300 prose prose-sm prose-invert max-w-none [&>h2]:text-amber-300 [&>h2]:text-xs [&>h2]:font-semibold [&>h2]:mt-2 [&>h2]:mb-1 [&>p]:my-0.5 [&>ul]:my-0.5 [&>ul]:ml-3 [&>li]:my-0">
                        {bodyContent}
                      </ReactMarkdown>
                    </div>
                    <div className="flex justify-end mt-2 pt-2 border-t border-slate-700/30">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(memory.id)}
                        className="text-[10px] h-6 text-red-400 hover:text-red-300 hover:bg-red-900/20 px-2"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}