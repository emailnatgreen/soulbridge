import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, ThumbsUp, Reply, Send, Pin, ChevronDown, ChevronUp } from 'lucide-react';

function TimeAgo({ date }) {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return <span>just now</span>;
  if (mins < 60) return <span>{mins}m ago</span>;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return <span>{hrs}h ago</span>;
  const days = Math.floor(hrs / 24);
  return <span>{days}d ago</span>;
}

function PostCard({ post, replies, user, onLike, onReply }) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState(false);
  const hasLiked = (post.liked_by || []).includes(user?.email);
  const replyCount = replies.length;

  const handleReply = () => {
    if (!replyText.trim()) return;
    onReply(post.id, replyText.trim());
    setReplyText('');
    setShowReplyBox(false);
    setShowReplies(true);
  };

  return (
    <div className={`rounded-xl border p-3 sm:p-4 space-y-2 ${post.pinned ? 'bg-amber-500/5 border-amber-500/30' : 'bg-white/5 border-white/10'}`}>
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-xs">
          {post.author_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white text-xs sm:text-sm font-semibold">{post.author_name}</span>
            {post.pinned && <Pin className="w-3 h-3 text-amber-400" />}
            <span className="text-white/30 text-[9px] sm:text-[10px]"><TimeAgo date={post.created_date} /></span>
          </div>
          <p className="text-white/70 text-xs sm:text-sm mt-1 leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 pl-10 sm:pl-11">
        <button
          onClick={() => onLike(post)}
          className={`flex items-center gap-1 text-[10px] sm:text-xs transition ${hasLiked ? 'text-purple-400' : 'text-white/30 hover:text-white/60'}`}
        >
          <ThumbsUp className="w-3 h-3" /> {post.likes || 0}
        </button>
        <button
          onClick={() => setShowReplyBox(r => !r)}
          className="flex items-center gap-1 text-[10px] sm:text-xs text-white/30 hover:text-white/60 transition"
        >
          <Reply className="w-3 h-3" /> Reply
        </button>
        {replyCount > 0 && (
          <button
            onClick={() => setShowReplies(r => !r)}
            className="flex items-center gap-1 text-[10px] sm:text-xs text-blue-400/70 hover:text-blue-300 transition"
          >
            {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>

      {showReplyBox && (
        <div className="pl-10 sm:pl-11 flex gap-2">
          <Textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Write a reply…"
            className="bg-white/5 border-white/10 text-white text-xs min-h-[60px] resize-none flex-1"
          />
          <Button onClick={handleReply} size="icon" className="bg-purple-600 hover:bg-purple-700 h-8 w-8 flex-shrink-0 self-end">
            <Send className="w-3 h-3" />
          </Button>
        </div>
      )}

      {showReplies && replyCount > 0 && (
        <div className="pl-10 sm:pl-11 space-y-2 border-l border-white/10 ml-4">
          {replies.map(r => (
            <div key={r.id} className="bg-white/[0.03] rounded-lg p-2 sm:p-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                  {r.author_name?.[0]?.toUpperCase() || '?'}
                </div>
                <span className="text-white text-[10px] sm:text-xs font-semibold">{r.author_name}</span>
                <span className="text-white/30 text-[8px] sm:text-[10px]"><TimeAgo date={r.created_date} /></span>
              </div>
              <p className="text-white/60 text-[10px] sm:text-xs mt-1 pl-8 whitespace-pre-wrap break-words">{r.content}</p>
              <div className="pl-8 mt-1">
                <button
                  onClick={() => onLike(r)}
                  className={`flex items-center gap-1 text-[9px] sm:text-[10px] transition ${(r.liked_by || []).includes(user?.email) ? 'text-purple-400' : 'text-white/30 hover:text-white/60'}`}
                >
                  <ThumbsUp className="w-2.5 h-2.5" /> {r.likes || 0}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VillageForum() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);

  const identity = (() => {
    try { return JSON.parse(localStorage.getItem('soulbridge_identity') || 'null'); } catch { return null; }
  })();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['forumPosts'],
    queryFn: () => base44.entities.ForumPost.list('-created_date', 100),
    refetchInterval: 15000,
  });

  const topPosts = posts.filter(p => !p.parent_id);
  const repliesMap = {};
  posts.filter(p => p.parent_id).forEach(r => {
    if (!repliesMap[r.parent_id]) repliesMap[r.parent_id] = [];
    repliesMap[r.parent_id].push(r);
  });

  // Sort: pinned first, then by date
  const sorted = [...topPosts].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.created_date) - new Date(a.created_date);
  });

  const handlePost = async () => {
    if (!newPost.trim() || posting) return;
    setPosting(true);
    await base44.entities.ForumPost.create({
      content: newPost.trim(),
      author_name: user?.full_name || 'Anonymous',
      author_did: identity?.did || '',
      likes: 0,
      liked_by: [],
    });
    setNewPost('');
    queryClient.invalidateQueries({ queryKey: ['forumPosts'] });
    setPosting(false);
  };

  const handleReply = async (parentId, text) => {
    await base44.entities.ForumPost.create({
      content: text,
      author_name: user?.full_name || 'Anonymous',
      author_did: identity?.did || '',
      parent_id: parentId,
      likes: 0,
      liked_by: [],
    });
    queryClient.invalidateQueries({ queryKey: ['forumPosts'] });
  };

  const handleLike = async (post) => {
    const likedBy = post.liked_by || [];
    const already = likedBy.includes(user?.email);
    const newLikedBy = already ? likedBy.filter(e => e !== user?.email) : [...likedBy, user?.email];
    await base44.entities.ForumPost.update(post.id, {
      likes: newLikedBy.length,
      liked_by: newLikedBy,
    });
    queryClient.invalidateQueries({ queryKey: ['forumPosts'] });
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-2xl p-3 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-purple-400" />
        <h3 className="font-semibold text-white text-xs sm:text-sm">Village Forum</h3>
        <span className="text-white/30 text-[9px] sm:text-[10px] ml-auto">{topPosts.length} posts</span>
      </div>

      {/* New Post */}
      <div className="flex gap-2">
        <Textarea
          value={newPost}
          onChange={e => setNewPost(e.target.value)}
          placeholder="Share your thoughts with the Village…"
          className="bg-white/5 border-white/10 text-white text-xs sm:text-sm min-h-[70px] resize-none flex-1"
        />
        <Button
          onClick={handlePost}
          disabled={!newPost.trim() || posting}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-auto self-end px-3 py-2"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Posts */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="w-8 h-8 text-white/10 mx-auto mb-2" />
          <p className="text-white/30 text-xs">No posts yet — be the first to share!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(post => (
            <PostCard
              key={post.id}
              post={post}
              replies={repliesMap[post.id] || []}
              user={user}
              onLike={handleLike}
              onReply={handleReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}