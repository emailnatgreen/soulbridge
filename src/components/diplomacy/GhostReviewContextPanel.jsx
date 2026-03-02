import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, User, Package, ChevronDown, ChevronRight, Info } from 'lucide-react';

function Section({ icon: Icon, label, color, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className={`text-xs font-semibold ${color}`}>{label}</span>
        {open
          ? <ChevronDown className="w-3 h-3 text-gray-400 ml-auto" />
          : <ChevronRight className="w-3 h-3 text-gray-400 ml-auto" />
        }
      </button>
      {open && <div className="px-3 py-2 space-y-2">{children}</div>}
    </div>
  );
}

export default function GhostReviewContextPanel({ contextPack }) {
  if (!contextPack) {
    return (
      <div className="text-center py-6 text-gray-400">
        <Info className="w-6 h-6 mx-auto mb-2 opacity-40" />
        <p className="text-xs">No context pack for this drill.</p>
      </div>
    );
  }

  const { kb_articles = [], customer_history, product_notes } = contextPack;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-xs">
          📋 Internal Resources — Confidential
        </Badge>
      </div>

      {/* Knowledge Base Articles */}
      {kb_articles.length > 0 && (
        <Section icon={BookOpen} label="Knowledge Base Articles" color="text-indigo-600">
          {kb_articles.map((article, i) => (
            <KBArticle key={i} article={article} />
          ))}
        </Section>
      )}

      {/* Customer History */}
      {customer_history && (
        <Section icon={User} label="Customer History" color="text-purple-600">
          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{customer_history}</p>
        </Section>
      )}

      {/* Product / Policy Notes */}
      {product_notes && (
        <Section icon={Package} label="Product & Policy Notes" color="text-teal-600">
          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{product_notes}</p>
        </Section>
      )}
    </div>
  );
}

function KBArticle({ article }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-indigo-100 rounded-md overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 bg-indigo-50/60 hover:bg-indigo-50 text-left"
      >
        <span className="text-xs font-medium text-indigo-800">{article.title}</span>
        {expanded
          ? <ChevronDown className="w-3 h-3 text-indigo-400 shrink-0" />
          : <ChevronRight className="w-3 h-3 text-indigo-400 shrink-0" />
        }
      </button>
      {expanded && (
        <p className="px-2.5 py-2 text-xs text-gray-700 leading-relaxed">{article.content}</p>
      )}
    </div>
  );
}