import React, { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Printer, Check, Sparkles, Send, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Language } from '../types';
import { translations } from '../translations';

interface Props {
  markdown: string;
  language: Language;
  onRefineSection: (sectionTitle: string, instruction: string) => Promise<void>;
  isRefining: boolean;
}

export const PlaybookDisplay = ({ markdown, language, onRefineSection, isRefining }: Props) => {
  const [copied, setCopied] = useState(false);
  const [refiningSection, setRefiningSection] = useState<string | null>(null);
  const [refineInstruction, setRefineInstruction] = useState('');
  const t = translations[language];

  const sanitizedMarkdown = (markdown || '')
    .replace(/\\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n');

  // Split markdown by ## headers
  const sections = sanitizedMarkdown.split(/(?=##\s+)/g);

  const handleCopy = () => {
    navigator.clipboard.writeText(sanitizedMarkdown);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRefineSubmit = async (sectionTitle: string) => {
    if (!refineInstruction.trim()) return;
    try {
      await onRefineSection(sectionTitle, refineInstruction);
      setRefiningSection(null);
      setRefineInstruction('');
    } catch (error) {
      console.error('Error refining section:', error);
    }
  };

  return (
    <div className="relative">
      <div className="absolute -top-4 right-0 flex items-center gap-2 no-print">
        <button 
          onClick={handleCopy}
          className="p-2 bg-white border border-slate-200 rounded-md text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all shadow-sm"
          title="Copy to Clipboard"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </button>
        <button 
          onClick={handlePrint}
          className="p-2 bg-white border border-slate-200 rounded-md text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all shadow-sm"
          title="Print Strategy"
        >
          <Printer className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-12">
        {sections.map((section, idx) => {
          const titleMatch = section.match(/^##\s+(.*)/);
          const title = titleMatch ? titleMatch[1] : `Section ${idx}`;
          const isBeingRefined = refiningSection === title;

          return (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
              className="group relative"
            >
              <div className="prose prose-slate prose-headings:font-display prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 prose-strong:text-slate-900 max-w-none print:prose-p:text-black print:prose-headings:text-black">
                <Markdown remarkPlugins={[remarkGfm]}>{section}</Markdown>
              </div>

              {/* Refinement UI */}
              <div className="mt-4 no-print">
                <AnimatePresence mode="wait">
                  {isBeingRefined ? (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Sparkles className="w-3 h-3" />
                          {t.refineSection}: {title}
                        </span>
                        <button 
                          onClick={() => setRefiningSection(null)}
                          className="text-slate-400 hover:text-slate-900"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          autoFocus
                          type="text"
                          value={refineInstruction}
                          onChange={(e) => setRefineInstruction(e.target.value)}
                          placeholder={t.refinePlaceholder}
                          onKeyDown={(e) => e.key === 'Enter' && handleRefineSubmit(title)}
                          className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900"
                        />
                        <button 
                          onClick={() => handleRefineSubmit(title)}
                          disabled={isRefining || !refineInstruction.trim()}
                          className="bg-slate-900 text-white p-2 rounded-md hover:bg-slate-800 disabled:opacity-50 transition-all"
                        >
                          {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <button 
                      onClick={() => setRefiningSection(title)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200"
                    >
                      <Sparkles className="w-3 h-3" />
                      {t.refineSection}
                    </button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

