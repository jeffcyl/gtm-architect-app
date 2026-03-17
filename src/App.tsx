import React, { useState, useEffect, useRef } from 'react';
import { GTMPlaybook, IMCMaterial, Language } from './types';
import { generateGTMPlaybook, generateGTMPlaybookStream } from './services/geminiService';
import { PlaybookDisplay } from './components/PlaybookDisplay';
import { IMCMaterials } from './components/IMCMaterials';
import { Chatbot } from './components/Chatbot';
import { translations } from './translations';
import { Layout, BookOpen, MessageSquare, Loader2, Sparkles, Globe, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast, { Toaster } from 'react-hot-toast';

function App() {
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState<Language>('English');
  const [isGenerating, setIsGenerating] = useState(false);
  const [playbook, setPlaybook] = useState<GTMPlaybook | null>(null);
  const [activeTab, setActiveTab] = useState<'playbook' | 'imc' | 'chat'>('playbook');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const basePromptRef = useRef('');

  const t = translations[language];

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        let sessionTranscript = '';
        
        // Iterate through all results in the current session
        for (let i = 0; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          
          // Check for a common bug in some mobile browsers where subsequent 
          // result segments repeat the previous ones (cumulative segments).
          // If the current segment already starts with the previous session text,
          // we treat it as a replacement rather than an addition.
          if (i > 0 && sessionTranscript.trim() && transcript.toLowerCase().trim().startsWith(sessionTranscript.toLowerCase().trim())) {
            sessionTranscript = transcript;
          } else {
            // Otherwise, append it (standard behavior)
            sessionTranscript += transcript;
          }
        }
        
        const separator = basePromptRef.current && !basePromptRef.current.endsWith(' ') && !basePromptRef.current.endsWith('\n') ? ' ' : '';
        setPrompt(basePromptRef.current + separator + sessionTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error(t.errorMicDenied, { duration: 5000 });
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [t.errorMicDenied]);

  const toggleListening = () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.error('Error stopping recognition', e);
      }
      setIsListening(false);
    } else {
      try {
        if (recognitionRef.current) {
          basePromptRef.current = prompt;
          recognitionRef.current.lang = language === 'English' ? 'en-US' : 'zh-TW';
          recognitionRef.current.start();
          setIsListening(true);
        } else {
          toast.error(t.errorSpeechNotSupported);
        }
      } catch (e: any) {
        if (e.name === 'InvalidStateError') {
          // Already started, just update state
          setIsListening(true);
        } else {
          console.error('Error starting recognition', e);
          setIsListening(false);
        }
      }
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        // Ignore
      }
      setIsListening(false);
    }
    setIsGenerating(true);
    setPlaybook({ strategyMarkdown: '', imcMaterials: [] });
    setActiveTab('playbook');
    
    try {
      const stream = generateGTMPlaybookStream(prompt, language);
      for await (const partialPlaybook of stream) {
        setPlaybook((prev) => ({
          strategyMarkdown: partialPlaybook.strategyMarkdown || prev?.strategyMarkdown || '',
          imcMaterials: partialPlaybook.imcMaterials || prev?.imcMaterials || []
        }));
      }
      toast.success(t.successGenerate || 'Playbook generated successfully!');
    } catch (error) {
      console.error('Error generating playbook:', error);
      toast.error(t.errorGenerate);
      setPlaybook(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateMaterial = (id: string, updates: Partial<IMCMaterial>) => {
    if (!playbook) return;
    setPlaybook({
      ...playbook,
      imcMaterials: playbook.imcMaterials.map(m => m.id === id ? { ...m, ...updates } : m)
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans text-slate-800">
      <Toaster position="top-center" />
      {/* Decorative Background Blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-rose-200/40 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-orange-200/30 blur-[120px]" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-teal-100/40 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-rose-100/50 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-400 to-orange-400 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20 rotate-3 hover:rotate-6 transition-transform duration-300">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight text-slate-900">{t.appTitle}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-white/80 px-4 py-2 rounded-full border border-rose-100 shadow-sm hover:shadow-md transition-shadow">
              <Globe className="w-4 h-4 text-rose-400" />
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-transparent border-none focus:ring-0 cursor-pointer text-slate-700 p-0 outline-none"
              >
                <option value="English">{translations['English'].langEn}</option>
                <option value="Traditional Chinese">{translations['Traditional Chinese'].langZh}</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <AnimatePresence mode="wait">
          {!playbook ? (
            // Initial Generation Form
            <motion.div 
              key="form"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl mx-auto mt-12"
            >
              <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-rose-100 p-12 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-400 via-orange-400 to-rose-400" />
                
                <div className="text-center mb-10">
                  <h2 className="text-4xl md:text-5xl font-display font-bold text-slate-900 mb-4 leading-tight">{t.heroTitle}</h2>
                  <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">{t.heroSubtitle}</p>
                </div>
                
                <div className="space-y-8">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">{t.inputLabel}</label>
                    <div className="relative">
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={t.inputPlaceholder}
                        className="w-full h-56 px-6 py-5 rounded-3xl border border-rose-100 focus:outline-none focus:ring-4 focus:ring-rose-400/20 focus:border-rose-400 resize-none text-slate-800 text-lg shadow-sm transition-all bg-white/90 pb-16"
                      />
                      <button
                        onClick={toggleListening}
                        className={`absolute bottom-4 right-4 p-3 rounded-full flex items-center justify-center transition-all shadow-sm ${
                          isListening 
                            ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/30' 
                            : 'bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-slate-200'
                        }`}
                        title={isListening ? t.stopDictation : t.startDictation}
                      >
                        {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="w-full py-5 px-8 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-full font-bold text-xl hover:shadow-xl hover:shadow-rose-500/25 hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-3"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-7 h-7 animate-spin" />
                        {t.btnGenerating}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-7 h-7" />
                        {t.btnGenerate}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            // Dashboard Layout
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col lg:flex-row gap-10"
            >
              {/* Sidebar */}
              <div className="w-full lg:w-72 shrink-0">
                <nav className="space-y-3 sticky top-28">
                  <button
                    onClick={() => setActiveTab('playbook')}
                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-base font-bold transition-all duration-300 ${
                      activeTab === 'playbook' ? 'bg-gradient-to-r from-rose-50 to-orange-50 text-rose-600 shadow-sm border border-rose-100' : 'text-slate-500 hover:bg-white/60 hover:text-slate-800 border border-transparent'
                    }`}
                  >
                    <BookOpen className={`w-6 h-6 ${activeTab === 'playbook' ? 'text-rose-500' : ''}`} />
                    {t.tabPlaybook}
                  </button>
                  <button
                    onClick={() => setActiveTab('imc')}
                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-base font-bold transition-all duration-300 ${
                      activeTab === 'imc' ? 'bg-gradient-to-r from-rose-50 to-orange-50 text-rose-600 shadow-sm border border-rose-100' : 'text-slate-500 hover:bg-white/60 hover:text-slate-800 border border-transparent'
                    }`}
                  >
                    <Layout className={`w-6 h-6 ${activeTab === 'imc' ? 'text-rose-500' : ''}`} />
                    {t.tabIMC}
                  </button>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-base font-bold transition-all duration-300 ${
                      activeTab === 'chat' ? 'bg-gradient-to-r from-rose-50 to-orange-50 text-rose-600 shadow-sm border border-rose-100' : 'text-slate-500 hover:bg-white/60 hover:text-slate-800 border border-transparent'
                    }`}
                  >
                    <MessageSquare className={`w-6 h-6 ${activeTab === 'chat' ? 'text-rose-500' : ''}`} />
                    {t.tabChat}
                  </button>
                  
                  <div className="pt-8 mt-8 border-t border-rose-100/50">
                    <button
                      onClick={() => setPlaybook(null)}
                      className="w-full px-6 py-4 text-base font-bold text-slate-400 hover:text-rose-600 hover:bg-white/60 rounded-2xl transition-all duration-300"
                    >
                      {t.btnStartOver}
                    </button>
                  </div>
                </nav>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                  {activeTab === 'playbook' && (
                    <motion.div 
                      key="playbook"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-rose-100 p-10 lg:p-14"
                    >
                      <PlaybookDisplay markdown={playbook.strategyMarkdown} />
                    </motion.div>
                  )}
                  {activeTab === 'imc' && (
                    <motion.div 
                      key="imc"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <IMCMaterials 
                        materials={playbook.imcMaterials} 
                        language={language}
                        onUpdateMaterial={handleUpdateMaterial}
                      />
                    </motion.div>
                  )}
                  {activeTab === 'chat' && (
                    <motion.div 
                      key="chat"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Chatbot language={language} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
