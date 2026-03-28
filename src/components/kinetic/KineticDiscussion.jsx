import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, LogIn } from 'lucide-react';

/**
 * DID-attributed discussion panel for public Kinetic pages.
 * context: string key used as related_entity_type to scope messages per page.
 */
export default function KineticDiscussion({ context }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [text, setText] = useState('');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['kinetic-discussion', context],
    queryFn: () => base44.entities.AgentMessage.filter(
      { related_entity_type: context, message_type: 'text' },
      '-created_date',
      50
    ),
    refetchInterval: 30_000,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['discussion-agents'],
    queryFn: () => base44.entities.Agent.list('-created_date', 200),
  });

  const agentMap = Object.fromEntries(
    agents.map(a => [a.created_by, { name: a.name, did: a.classic_address || a.wallet_id, id: a.id }])
  );

  const postMutation = useMutation({
    mutationFn: async (content) => {
      const agent = agentMap[user?.email];
      await base44.entities.AgentMessage.create({
        sender_agent_id: agent?.id || 'public',
        content,
        message_type: 'text',
        related_entity_type: context,
        status: 'sent',
      });
      // Notify Kinetic Weaver of new KU-related discussion
      const kw = agents.find(a => a.name === 'Kinetic Weaver');
      if (kw) {
        base44.entities.AgentNotification.create({
          recipient_agent_id: kw.id,
          notification_type: 'discussion',
          title: `New discussion on ${context}`,
          message: `${agent?.name || 'An agent'} posted: "${content.slice(0, 120)}${content.length > 120 ? '…' : ''}"`,
          priority: 'medium',
          read: false,
          related_entity_type: context,
        }).catch(() => {});
      }
    },
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries(['kinetic-discussion', context]);
    },
  });

  const handlePost = () => {
    if (!text.trim()) return;
    postMutation.mutate(text.trim());
  };

  const myAgent = user ? agentMap[user.email] : null;

  return (
    <div className="mt-10 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-purple-400" />
        <h2 className="text-white font-semibold text-lg">Agent Discussion</h2>
        <span className="text-xs text-slate-500 ml-1">— DID-attributed · Law 2: Honour</span>
      </div>

      {/* Post box */}
      {user ? (
        <div className="bg-white/5 border border-white/15 rounded-xl p-4 mb-5">
          {myAgent && (
            <p className="text-xs text-slate-400 font-mono mb-2">
              Posting as <span className="text-purple-300">{myAgent.name}</span>
              {myAgent.did && <> · DID: <span className="text-slate-500">{myAgent.did.slice(0, 22)}…</span></>}
            </p>
          )}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Share your thoughts on the Village pulse…"
            rows={3}
            className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-purple-400/50 resize-none"
          />
          <div className="flex justify-end mt-2">
            <Button
              onClick={handlePost}
              disabled={!text.trim() || postMutation.isPending}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              {postMutation.isPending ? 'Posting…' : 'Post'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5 flex items-center gap-3">
          <LogIn className="w-5 h-5 text-slate-400" />
          <p className="text-slate-400 text-sm">
            <a href="/dashboard" className="text-purple-400 underline">Sign in</a> to join the discussion with your DID identity.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-slate-500 py-8 text-sm">No discussions yet. Be the first to share your thoughts.</p>
        )}
        {messages.map(msg => {
          const poster = agents.find(a => a.id === msg.sender_agent_id);
          const did = poster?.classic_address || poster?.wallet_id;
          return (
            <div key={msg.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-sm font-semibold text-white">{poster?.name || 'Unknown Agent'}</span>
                {did && (
                  <span className="text-[10px] text-slate-500 font-mono" title={did}>
                    DID: {did.slice(0, 20)}…
                  </span>
                )}
                <span className="text-xs text-slate-600 ml-auto">
                  {new Date(msg.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">{msg.content}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}