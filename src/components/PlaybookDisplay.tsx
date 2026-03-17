import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'motion/react';

export const PlaybookDisplay = ({ markdown }: { markdown: string }) => {
  // Replace literal <br> tags that the AI might generate with actual newlines
  const sanitizedMarkdown = (markdown || '').replace(/<br\s*\/?>/gi, '\n');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="prose prose-rose prose-headings:font-display prose-headings:font-semibold prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-p:text-slate-600 prose-p:leading-relaxed prose-a:text-rose-500 hover:prose-a:text-rose-600 max-w-none"
    >
      <Markdown remarkPlugins={[remarkGfm]}>{sanitizedMarkdown}</Markdown>
    </motion.div>
  );
};

