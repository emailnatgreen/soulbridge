import React, { useState } from 'react';
import { HelpCircle, Search, Book, Lightbulb, MessageSquare, ExternalLink, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const HELP_CATEGORIES = [
  {
    id: 'dashboard',
    title: 'Dashboard Guide',
    icon: Book,
    articles: [
      { title: 'Dashboard Overview', desc: 'Understanding the Axi Command Centre layout and widgets' },
      { title: 'Customizing Your View', desc: 'Show/hide and rearrange dashboard widgets' },
      { title: 'Real-Time Alerts', desc: 'Interpreting and responding to system notifications' }
    ]
  },
  {
    id: 'governance',
    title: 'Governance',
    icon: Lightbulb,
    articles: [
      { title: 'Creating Proposals', desc: 'Step-by-step guide to drafting governance proposals' },
      { title: 'Voting System', desc: 'How voting power works and delegation rules' },
      { title: 'Proposal Analysis', desc: 'Understanding risk metrics and approval thresholds' }
    ]
  },
  {
    id: 'agents',
    title: 'Agent Management',
    icon: ExternalLink,
    articles: [
      { title: 'Onboarding Agents', desc: 'Creating and activating new village agents' },
      { title: 'Performance Reviews', desc: 'Conducting and interpreting agent evaluations' },
      { title: 'Role Assignment', desc: 'Understanding agent roles and permissions' }
    ]
  },
  {
    id: 'projects',
    title: 'Projects & Tasks',
    icon: Book,
    articles: [
      { title: 'Project Creation', desc: 'Launching new community projects' },
      { title: 'Task Assignment', desc: 'Distributing and tracking project tasks' },
      { title: 'Budget Management', desc: 'Allocating and monitoring project budgets' }
    ]
  }
];

export default function IntegratedHelpCenter() {
  const [expandedCategory, setExpandedCategory] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = HELP_CATEGORIES.map(cat => ({
    ...cat,
    articles: cat.articles.filter(
      a => a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           a.desc.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.articles.length > 0 || !searchQuery);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Search help articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-8 text-xs bg-slate-700/50 border-slate-600/60"
        />
      </div>

      {/* Categories */}
      <div className="space-y-2">
        {filteredCategories.map(category => {
          const Icon = category.icon;
          const isExpanded = expandedCategory === category.id;

          return (
            <div key={category.id} className="border border-slate-700/40 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                className="w-full flex items-center justify-between p-3 bg-slate-800/40 hover:bg-slate-800/60 transition"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-white">{category.title}</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              {isExpanded && (
                <div className="bg-slate-900/20 p-3 space-y-2 border-t border-slate-700/40">
                  {category.articles.map((article, idx) => (
                    <button
                      key={idx}
                      className="w-full text-left p-2 rounded hover:bg-slate-700/30 transition group"
                    >
                      <p className="text-xs font-medium text-indigo-300 group-hover:text-indigo-200">
                        {article.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{article.desc}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Support */}
      <div className="bg-indigo-900/20 border border-indigo-700/40 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-indigo-300 mb-2">Need Live Support?</h4>
        <Button size="sm" className="w-full text-xs bg-indigo-600 hover:bg-indigo-700">
          <MessageSquare className="w-3 h-3 mr-1" />
          Contact Axi
        </Button>
      </div>
    </div>
  );
}