import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Send, Sparkles, User, Loader2 } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';
import { motion } from 'motion/react';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

interface Props {
  language: Language;
}

export const Chatbot = ({ language }: Props) => {
  const t = translations[language];
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat and set initial message when language changes
  useEffect(() => {
    setMessages([{ id: '1', role: 'model', text: t.chatInitial }]);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    chatRef.current = ai.chats.create({
      model: 'gemini-3.1-pro-preview',
      config: {
        systemInstruction: `You are a world-class Chief Marketing Officer (CMO) and GTM expert helping a user refine their strategy and IMC materials. Be concise, strategic, highly actionable, and use professional marketing frameworks (like 4Ps, STP, OKRs). Respond in ${language}.`,
      }
    });
  }, [language, t.chatInitial]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatRef.current) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const response = await chatRef.current.sendMessage({ message: userMsg });
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: response.text }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col h-[650px] bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-rose-100 overflow-hidden"
    >
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
