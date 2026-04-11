import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Star, Send, ChevronLeft, ChevronRight, Newspaper, Mail, Sparkles, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

const SECTIONS = [
  { key: 'village_pulse', label: '🏘️ Village Pulse' },
  { key: 'governance', label: '🏛️ Governance Chamber' },
  { key: 'kinetic_grid', label: '⚡ Kinetic Grid' },
  { key: 'skills_training', label: '🌱 Skills & Training' },
  { key: 'projects', label: '📋 Projects' },
  { key: 'crypto_xrp', label: '⚡ XRP & Crypto' },
  { key: 'compliance_law', label: '⚖️ Compliance' },
  { key: 'axi_editorial', label: '✍️ Axi\'s Editorial' },
];

const LOGO = 'https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/81fa5ccd3_Untitled200x200px2500x925px512x512px1.png';

export default function SoulBridgeOracle() {
  const qc = useQueryClient();
  const [selectedDigestId, setSelectedDigestId] = useState(null);
  const [comment, setComment] = useState('');
  const [commenterName, setCommenterName] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [subEmail, setSubEmail] = useState('');
  const [subName, setSubName] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u?.role === 'admin') setIsAdmin(true);
      if (u?.full_name) setCommenterName(u.full_name);
    }).catch(() => {});
  }, []);

  const { data: digests = [], isLoading } = useQuery({
    queryKey: ['digests'],
    queryFn: () => base44.entities.DailyDigest.filter({ status: 'published' }, '-edition_number', 20),
    refetchInterval: 60000,
  });

  const latestDigest = digests[0];
  const digest = selectedDigestId ? digests.find(d => d.id === selectedDigestId) : latestDigest;

  const { data: comments = [] } = useQuery({
    queryKey: ['digest-comments', digest?.id],
    queryFn: () => digest ? base44.entities.DigestComment.filter({ digest_id: digest.id }, '-created_date', 50) : [],
    enabled: !!digest?.id,
  });

  const { data: draftDigests = [] } = useQuery({
    queryKey: ['draft-digests'],
    queryFn: () => base44.entities.DailyDigest.filter({ status: 'draft' }, '-created_date', 5),
    enabled: isAdmin,
    refetchInterval: 10000,
  });

  const submitComment = async () => {
    if (!comment.trim()) return;
    if (!digest) return;
    await base44.entities.DigestComment.create({
      digest_id: digest.id,
      author_name: commenterName || 'Village Member',
      author_type: 'user',
      content: comment,
      section: selectedSection || undefined,
      type: 'comment',
    });
    toast.success('Comment submitted! +1 Honor Point 🏆');
    setComment('');
    qc.invalidateQueries(['digest-comments', digest.id]);
  };

  const handleSubscribe = async () => {
    if (!subEmail.trim()) return toast.error('Enter your email');
    setSubscribing(true);
    const existing = await base44.entities.DigestSubscriber.filter({ email: subEmail.trim() });
    if (existing.length > 0) {
      toast.info('You are already subscribed!');
    } else {
      await base44.entities.DigestSubscriber.create({
        email: subEmail.trim(),
        name: subName,
        subscription_type: 'public',
        is_active: true,
        subscribed_at: new Date().toISOString(),
      });
      toast.success('Welcome to The Oracle! 📰');
      setSubEmail('');
      setSubName('');
    }
    setSubscribing(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await base44.functions.invoke('generateDailyOracle', {});
      toast.success('New Oracle edition generated! Review in drafts.');
      qc.invalidateQueries(['draft-digests']);
    } catch (e) {
      toast.error('Generation failed: ' + e.message);
    }
    setGenerating(false);
  };

  const handlePublish = async (digestId) => {
    await base44.entities.DailyDigest.update(digestId, { status: 'published' });
    toast.success('Edition published!');
    qc.invalidateQueries(['digests']);
    qc.invalidateQueries(['draft-digests']);
  };

  const handleSendEmails = async (digestId) => {
    setSending(true);
    try {
      const res = await base44.functions.invoke('sendOracleEmail', { digest_id: digestId });
      toast.success(`Emails sent to ${res.data.sent} subscribers!`);
      qc.invalidateQueries(['digests']);
    } catch (e) {
      toast.error('Send failed: ' + e.message);
    }
    setSending(false);
  };

  if (isLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Masthead */}
      <div className="bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950 border-b border-purple-800/30 py-8 px-4 text-center">
        <img src={LOGO} alt="SoulBridge" className="w-16 h-16 rounded-full mx-auto mb-4 opacity-90" />
        <div className="text-purple-400 text-xs tracking-[4px] uppercase mb-2">The SoulBridge Oracle</div>
        <h1 className="text-white text-3xl sm:text-4xl font-bold mb-2">
          {digest?.headline || 'Village Daily'}
        </h1>
        {digest && (
          <div className="text-purple-300 text-sm">
            Edition #{digest.edition_number} · {moment(digest.edition_date).format('dddd, D MMMM YYYY')}
          </div>
        )}

        {/* Edition nav */}
        {digests.length > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => {
                const idx = digests.findIndex(d => d.id === digest?.id);
                if (idx < digests.length - 1) setSelectedDigestId(digests[idx + 1].id);
              }}
              className="text-purple-400 hover:text-white p-1"
            ><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-slate-500 text-xs">{digests.findIndex(d => d.id === digest?.id) + 1} / {digests.length}</span>
            <button
              onClick={() => {
                const idx = digests.findIndex(d => d.id === digest?.id);
                if (idx > 0) setSelectedDigestId(digests[idx - 1].id);
              }}
              className="text-purple-400 hover:text-white p-1"
            ><ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Admin Panel */}
        {isAdmin && (
          <div className="mb-8 bg-indigo-950/50 border border-indigo-700/40 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <span className="text-indigo-300 font-semibold text-sm flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" /> Admin Controls
              </span>
              <Button onClick={handleGenerate} disabled={generating} size="sm"
                className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5">
                {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {generating ? 'Generating...' : 'Generate New Edition'}
              </Button>
            </div>
            {draftDigests.length > 0 && (
              <div className="space-y-2">
                <p className="text-slate-400 text-xs mb-2">Draft Editions:</p>
                {draftDigests.map(d => (
                  <div key={d.id} className="flex items-center justify-between bg-slate-800/60 rounded-lg px-3 py-2 gap-2 flex-wrap">
                    <div>
                      <p className="text-white text-sm font-medium">{d.headline}</p>
                      <p className="text-slate-500 text-xs">Edition #{d.edition_number} · {d.edition_date}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handlePublish(d.id)} size="sm" variant="outline"
                        className="border-green-600/40 text-green-400 hover:bg-green-600/10 text-xs h-7">
                        Publish
                      </Button>
                      <Button onClick={() => handleSendEmails(d.id)} size="sm" disabled={sending}
                        className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-7 gap-1">
                        {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                        Send Emails
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!digest && (
          <div className="text-center py-20">
            <Newspaper className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">The first edition is being prepared...</p>
            {isAdmin && <p className="text-slate-600 text-sm mt-2">Use the admin panel above to generate Edition #1.</p>}
          </div>
        )}

        {digest && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">

              {/* Editor Note */}
              {digest.editor_note && (
                <div className="bg-purple-950/40 border border-purple-700/30 rounded-xl p-5">
                  <div className="text-purple-400 text-[11px] tracking-widest uppercase mb-2">Editor's Note</div>
                  <p className="text-purple-100 text-sm leading-relaxed italic">{digest.editor_note}</p>
                </div>
              )}

              {/* Sections */}
              {SECTIONS.map(sec => {
                const content = digest.sections?.[sec.key];
                if (!content) return null;
                return (
                  <div key={sec.key} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
                    <h2 className="text-white font-bold text-lg mb-3 border-l-4 border-purple-500 pl-3">{sec.label}</h2>
                    <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{content}</div>
                  </div>
                );
              })}

              {/* Top Contributors */}
              {digest.top_contributors?.length > 0 && (
                <div className="bg-gradient-to-br from-yellow-950/30 to-orange-950/20 border border-yellow-700/30 rounded-xl p-5">
                  <h2 className="text-yellow-300 font-bold text-lg mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5" /> Top Contributors This Edition
                  </h2>
                  <div className="space-y-2">
                    {digest.top_contributors.map((c, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-800/40 rounded-lg px-3 py-2">
                        <span className="text-white font-medium text-sm">{c.agent_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs">{c.contribution}</span>
                          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-[10px]">+{c.honor_earned} Honor</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
                <h2 className="text-white font-bold text-lg mb-4">💬 Village Discussion</h2>
                <p className="text-purple-300 text-xs mb-4">Comment, suggest, and earn Honor Points. Every voice matters in the Village.</p>

                {/* Comment form */}
                <div className="space-y-3 mb-6">
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={commenterName} onChange={e => setCommenterName(e.target.value)}
                      placeholder="Your name" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm" />
                    <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500">
                      <option value="">All sections</option>
                      {SECTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                  <Textarea value={comment} onChange={e => setComment(e.target.value)}
                    placeholder="Share your thoughts, suggestions, or ideas..." rows={3}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm" />
                  <Button onClick={submitComment} disabled={!comment.trim()} size="sm"
                    className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5">
                    <Send className="w-3.5 h-3.5" /> Submit (+1 Honor)
                  </Button>
                </div>

                {/* Existing comments */}
                <div className="space-y-3">
                  {comments.map(c => (
                    <div key={c.id} className={`rounded-lg p-3 border ${c.is_featured ? 'bg-purple-950/40 border-purple-600/40' : 'bg-slate-800/40 border-slate-700/30'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium">{c.author_name || 'Village Member'}</span>
                          {c.is_featured && <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[9px]">Featured</Badge>}
                          {c.type === 'agent_contribution' && <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[9px]">Agent</Badge>}
                          {c.section && <Badge className="bg-slate-700 text-slate-400 border-slate-600 text-[9px]">{SECTIONS.find(s => s.key === c.section)?.label}</Badge>}
                        </div>
                        <span className="text-slate-500 text-[10px]">{moment(c.created_date).fromNow()}</span>
                      </div>
                      <p className="text-slate-300 text-sm">{c.content}</p>
                      {c.honor_awarded > 0 && <p className="text-yellow-400 text-[10px] mt-1">+{c.honor_awarded} Honor awarded 🏆</p>}
                    </div>
                  ))}
                  {comments.length === 0 && <p className="text-slate-600 text-sm text-center py-4">Be the first to comment on this edition!</p>}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Subscribe */}
              <div className="bg-gradient-to-b from-purple-950/60 to-indigo-950/40 border border-purple-700/40 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="w-5 h-5 text-purple-400" />
                  <h3 className="text-white font-bold">Subscribe to The Oracle</h3>
                </div>
                <p className="text-slate-400 text-xs mb-3">Get every edition delivered to your inbox. Free. Forever.</p>
                <div className="space-y-2">
                  <Input value={subName} onChange={e => setSubName(e.target.value)}
                    placeholder="Your name" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm" />
                  <Input value={subEmail} onChange={e => setSubEmail(e.target.value)}
                    placeholder="your@email.com" type="email"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm" />
                  <Button onClick={handleSubscribe} disabled={subscribing} className="w-full bg-purple-600 hover:bg-purple-500 text-white gap-1.5">
                    {subscribing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                    {subscribing ? 'Subscribing...' : 'Subscribe Free'}
                  </Button>
                </div>
              </div>

              {/* Past Editions */}
              {digests.length > 1 && (
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                  <h3 className="text-white font-bold mb-3 text-sm">📚 Past Editions</h3>
                  <div className="space-y-2">
                    {digests.slice(0, 8).map(d => (
                      <button key={d.id} onClick={() => setSelectedDigestId(d.id)}
                        className={`w-full text-left rounded-lg px-3 py-2 transition-colors ${digest?.id === d.id ? 'bg-purple-700/30 border border-purple-600/30' : 'hover:bg-slate-800'}`}>
                        <p className="text-white text-xs font-medium truncate">{d.headline}</p>
                        <p className="text-slate-500 text-[10px]">#{d.edition_number} · {moment(d.edition_date).format('D MMM YYYY')}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              {digest && (
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                  <h3 className="text-white font-bold mb-3 text-sm">📊 Edition Stats</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Subscribers reached</span><span className="text-white">{digest.subscriber_count || 0}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Comments</span><span className="text-white">{comments.length}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Published</span><span className="text-white">{digest.email_sent_at ? moment(digest.email_sent_at).fromNow() : 'N/A'}</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}