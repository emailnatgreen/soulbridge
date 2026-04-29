import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, BookOpen, ShoppingCart, Heart, Briefcase, GraduationCap, Shield, FileSearch, ChevronDown, ChevronUp, Plus } from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: BookOpen },
  { id: 'research', label: 'Research', icon: FileSearch },
  { id: 'shopping', label: 'Shopping', icon: ShoppingCart },
  { id: 'health', label: 'Health & Wellness', icon: Heart },
  { id: 'productivity', label: 'Productivity', icon: Briefcase },
  { id: 'learning', label: 'Learning', icon: GraduationCap },
  { id: 'compliance', label: 'Compliance', icon: Shield },
];

const TEMPLATES = [
  {
    id: 'recipe-macros',
    category: 'health',
    emoji: '🥗',
    skill_name: 'Calculate Recipe Macros',
    trigger_command: '/Macros',
    multi_tab: false,
    instructions: `Step 1: Read the recipe or ingredient list on the current page.
Step 2: For each ingredient, estimate the quantity in grams or standard units.
Step 3: Calculate the total protein, carbohydrates, fats, and calories for the full recipe.
Step 4: Present the results in a clear table with per-serving and total values.
Step 5: If any ingredient is ambiguous, ask the user for clarification.
Do NOT make up nutritional values — use standard USDA estimates.`,
    description: 'Instantly calculate protein, carbs, fats & calories for any recipe page.',
  },
  {
    id: 'spec-compare',
    category: 'shopping',
    emoji: '📊',
    skill_name: 'Compare Product Specs',
    trigger_command: '/Compare',
    multi_tab: true,
    instructions: `Step 1: Read the product specifications from the current page and all selected tabs.
Step 2: Identify the key attributes for comparison (price, dimensions, features, ratings).
Step 3: Generate a side-by-side comparison table with the most important specs.
Step 4: Highlight the best value option and any significant differences.
Step 5: If a tab doesn't contain a comparable product, skip it and note why.
Do NOT make up specs — only use data visible on the pages.`,
    description: 'Generate side-by-side spec comparisons across multiple open product tabs.',
  },
  {
    id: 'doc-scanner',
    category: 'productivity',
    emoji: '📄',
    skill_name: 'Scan Document for Key Info',
    trigger_command: '/Scan',
    multi_tab: false,
    instructions: `Step 1: Read the full content of the current page or document.
Step 2: Extract the most important information: key dates, action items, decisions, and deadlines.
Step 3: Summarise the document in 3-5 bullet points.
Step 4: List any action items with their deadlines.
Step 5: If the document references other documents, note them.
Present results in a structured format with clear headings.`,
    description: 'Scan lengthy documents and extract key information, action items & deadlines.',
  },
  {
    id: 'ingredient-check',
    category: 'health',
    emoji: '🧴',
    skill_name: 'Analyse Product Ingredients',
    trigger_command: '/Ingredients',
    multi_tab: false,
    instructions: `Step 1: Find and read the ingredients list on the current page.
Step 2: Categorise each ingredient as: beneficial, neutral, or potentially concerning.
Step 3: Flag any common allergens (nuts, gluten, dairy, soy).
Step 4: Provide a brief explanation for any concerning ingredients.
Step 5: Give an overall assessment of the product's ingredient quality.
Do NOT provide medical advice — note that users should consult professionals for health decisions.`,
    description: 'Break down product ingredients with safety flags and allergen warnings.',
  },
  {
    id: 'gift-finder',
    category: 'shopping',
    emoji: '🎁',
    skill_name: 'Find the Perfect Gift',
    trigger_command: '/Gift',
    multi_tab: true,
    instructions: `Step 1: Ask the user for: recipient's interests, age range, and budget.
Step 2: Review the products across the current page and any selected tabs.
Step 3: Score each product on relevance to the recipient's interests and value for money.
Step 4: Recommend the top 3 options with brief reasoning.
Step 5: Suggest any complementary items that would pair well.
Be creative with recommendations but stay within the stated budget.`,
    description: 'Cross-reference products across tabs to find the ideal gift within budget.',
  },
  {
    id: 'article-summary',
    category: 'research',
    emoji: '📰',
    skill_name: 'Summarise Article',
    trigger_command: '/Summary',
    multi_tab: false,
    instructions: `Step 1: Read the full article or page content.
Step 2: Identify the main thesis, key arguments, and supporting evidence.
Step 3: Write a concise summary in 3-5 paragraphs covering the core points.
Step 4: List any claims that could benefit from fact-checking.
Step 5: Suggest 2-3 related topics the user might want to explore.
Maintain objectivity — present the author's arguments without injecting opinion.`,
    description: 'Get a structured summary of any article with key claims and follow-up topics.',
  },
  {
    id: 'compliance-check',
    category: 'compliance',
    emoji: '✅',
    skill_name: 'Compliance Page Audit',
    trigger_command: '/Audit',
    multi_tab: false,
    instructions: `Step 1: Read the current page content thoroughly.
Step 2: Check for common compliance issues: missing privacy policy links, cookie consent, accessibility problems, GDPR notices.
Step 3: Identify any regulatory disclaimers that should be present but are missing.
Step 4: Rate the page's compliance level: Good, Needs Improvement, or Critical Issues.
Step 5: Provide specific, actionable recommendations for each issue found.
Focus on visible compliance markers — this is not a legal audit, note that limitation.`,
    description: 'Audit any webpage for common compliance issues and regulatory markers.',
  },
  {
    id: 'study-guide',
    category: 'learning',
    emoji: '📚',
    skill_name: 'Create Study Guide',
    trigger_command: '/Study',
    multi_tab: true,
    instructions: `Step 1: Read the educational content from the current page and any selected tabs.
Step 2: Extract the core concepts, definitions, and key facts.
Step 3: Organise them into a structured study guide with headings and subheadings.
Step 4: Create 5-10 quiz questions (mix of multiple choice and short answer) based on the content.
Step 5: Provide a suggested study plan with estimated time for each section.
Use clear, student-friendly language and highlight the most exam-relevant material.`,
    description: 'Transform any educational page into a structured study guide with quiz questions.',
  },
  {
    id: 'price-tracker',
    category: 'shopping',
    emoji: '💰',
    skill_name: 'Price Analysis',
    trigger_command: '/Price',
    multi_tab: true,
    instructions: `Step 1: Read the product price and details from the current page and all selected tabs.
Step 2: Identify the product name, current price, any discounts, and shipping costs.
Step 3: Create a comparison table showing total cost (price + shipping) for each source.
Step 4: Highlight the cheapest option and calculate potential savings.
Step 5: Note any caveats (different conditions, seller ratings, delivery times).
Only use prices visible on the pages — do NOT search for additional prices.`,
    description: 'Compare prices across multiple retailer tabs and find the best deal.',
  },
  {
    id: 'xrpl-explorer',
    category: 'research',
    emoji: '⛓️',
    skill_name: 'XRPL Transaction Analyser',
    trigger_command: '/XRPL',
    multi_tab: false,
    instructions: `Step 1: Read the transaction or account data from the current XRP Ledger explorer page.
Step 2: Identify the transaction type, amounts, sender, receiver, and timestamp.
Step 3: Explain the transaction in plain language, noting any memos or flags.
Step 4: If viewing an account, summarise the balance, recent activity, and trust lines.
Step 5: Flag any unusual patterns (large transfers, many trust lines, governance activity).
Use XRP Ledger terminology accurately and note that this is informational, not financial advice.`,
    description: 'Analyse XRPL explorer pages and explain transactions in plain language.',
  },
];

export default function SkillTemplatesLibrary({ onUseTemplate }) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const filtered = TEMPLATES.filter(t => {
    if (category !== 'all' && t.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.skill_name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.trigger_command.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <Card className="bg-indigo-500/[0.03] border-indigo-500/20">
      <CardContent className="p-3 space-y-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span className="text-indigo-300 text-xs font-semibold">Skill Templates Library</span>
            <Badge variant="outline" className="text-[8px] border-indigo-500/30 text-indigo-300">
              {TEMPLATES.length} templates
            </Badge>
          </div>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
        </button>
        <p className="text-white/30 text-[9px]">
          Start from a pre-built template aligned with Chrome's Skill categories. Customise the instructions and mint as your own NFT.
        </p>

        {expanded && (
          <div className="space-y-3">
            {/* Search + Category Filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3 h-3 text-white/20 absolute left-2 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search templates..."
                  className="bg-white/5 border-white/10 text-white text-xs h-7 pl-7"
                />
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES.map(c => {
                const CatIcon = c.icon;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] border transition-colors ${
                      category === c.id
                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
                    }`}
                  >
                    <CatIcon className="w-2.5 h-2.5" />
                    {c.label}
                  </button>
                );
              })}
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
              {filtered.map(t => (
                <div
                  key={t.id}
                  className="bg-white/[0.03] border border-white/10 rounded-lg p-2.5 space-y-1.5 hover:border-indigo-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm flex-shrink-0">{t.emoji}</span>
                      <span className="text-white text-[10px] font-semibold truncate">{t.skill_name}</span>
                    </div>
                    <span className="text-emerald-300/60 text-[8px] font-mono flex-shrink-0">{t.trigger_command}</span>
                  </div>
                  <p className="text-white/30 text-[9px] leading-relaxed line-clamp-2">{t.description}</p>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[7px] border-white/10 text-white/30 capitalize">{t.category}</Badge>
                    {t.multi_tab && (
                      <Badge variant="outline" className="text-[7px] border-cyan-500/20 text-cyan-300/60">Multi-tab</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUseTemplate(t)}
                    className="w-full h-6 text-[9px] text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/10 gap-1"
                  >
                    <Plus className="w-2.5 h-2.5" /> Use Template
                  </Button>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-2 text-center py-6">
                  <p className="text-white/20 text-xs">No templates match your search</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}