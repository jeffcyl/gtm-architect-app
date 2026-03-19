import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Send, Sparkles, User, Loader2 } from 'lucide-react';
import { Language, GTMPlaybook } from '../types';
import { translations } from '../translations';
import { motion } from 'motion/react';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

interface Props {
  language: Language;
  playbook: GTMPlaybook | null;
}

export const Chatbot = ({ language, playbook }: Props) => {
  const t = translations[language];
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('gtm_chat_history');
    return saved ? JSON.parse(saved) : [{ id: '1', role: 'model', text: t.chatInitial }];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persist messages to localStorage
  useEffect(() => {
    localStorage.setItem('gtm_chat_history', JSON.stringify(messages));
  }, [messages]);

  // Initialize chat session
  useEffect(() => {
    chatRef.current = null; // Reset session when context or language changes
  }, [language, playbook?.strategyMarkdown]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('API Key is missing. Please set GEMINI_API_KEY in Settings > Secrets.');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      if (!chatRef.current) {
        const strategyContext = playbook?.strategyMarkdown 
          ? `\n\nCURRENT GTM STRATEGY CONTEXT:\n${playbook.strategyMarkdown}`
          : '';

        chatRef.current = ai.chats.create({
          model: 'gemini-3-flash-preview',
          config: {
            systemInstruction: `You are a world-class Chief Marketing Officer (CMO) and GTM expert helping a user refine their strategy and IMC materials. 
            Be concise, strategic, highly actionable, and use professional marketing frameworks (like 4Ps, STP, OKRs). 
            Respond in ${language}.${strategyContext}`,
          },
          // Restore history to the chat session so it has "memory" of previous turns
          history: messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
          }))
        });
      }

      const response = await chatRef.current.sendMessage({ message: userMsg });
      const text = response.text;
      
      if (!text) {
        throw new Error('Empty response from AI.');
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text }]);
    } catch (error: any) {
      console.error('Chat error:', error);
      let errorMsg = 'Sorry, I encountered an error. Please try again.';
      if (error.message?.includes('API Key')) {
        errorMsg = error.message;
      } else if (error.message?.includes('quota')) {
        errorMsg = 'API quota exceeded. Please try again later.';
      }
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([{ id: Date.now().toString(), role: 'model', text: t.chatInitial }]);
    chatRef.current = null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col h-[650px] bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-rose-100 overflow-hidden"
    >
      <div className="p-4 border-b border-rose-50 flex justify-between items-center bg-white/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-rose-500" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.tabChat}</span>
        </div>
        <button 
          onClick={clearHistory}
          className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest"
        >
          {language === 'English' ? 'Clear History' : '清除紀錄'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
        {messages.map((msg, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx === messages.length - 1 ? 0.1 : 0 }}
            key={msg.id} 
            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-gradient-to-br from-rose-400 to-orange-400 text-white' : 'bg-white border border-rose-100 text-rose-500'}`}>
              {msg.role === 'user' ? <User className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div className={`max-w-[80%] rounded-3xl p-5 ${msg.role === 'user' ? 'bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-md shadow-rose-500/20 rounded-tr-sm' : 'bg-white text-slate-700 border border-rose-50 shadow-sm rounded-tl-sm'}`}>
              <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{msg.text}</div>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4"
          >
             <div className="w-10 h-10 rounded-full bg-white border border-rose-100 text-rose-500 flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="bg-white border border-rose-50 shadow-sm rounded-3xl rounded-tl-sm p-5 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-rose-400" />
              <span className="text-[15px] text-slate-500 font-medium">{t.chatThinking}</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-6 bg-white/50 border-t border-rose-50 backdrop-blur-md">
        <div className="flex gap-3 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t.chatPlaceholder}
            className="flex-1 pl-6 pr-16 py-4 rounded-full border border-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-400/50 bg-white shadow-sm text-[15px] transition-all"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-gradient-to-r from-rose-500 to-orange-400 text-white rounded-full hover:shadow-md hover:shadow-rose-500/25 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
