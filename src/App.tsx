import React, { useState, useEffect, useRef } from 'react';
import { GTMPlaybook, IMCMaterial, Language } from './types';
import { generateGTMPlaybook, generateGTMPlaybookStream, refineStrategySection } from './services/geminiService';
import { PlaybookDisplay } from './components/PlaybookDisplay';
import { IMCMaterials } from './components/IMCMaterials';
import { Chatbot } from './components/Chatbot';
import { translations } from './translations';
import { Layout, BookOpen, MessageSquare, Loader2, Sparkles, Globe, Mic, MicOff, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast, { Toaster } from 'react-hot-toast';

function App() {
  const [prompt, setPrompt] = useState(() => localStorage.getItem('gtm_prompt') || '');
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('gtm_lang') as Language) || 'English');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [playbook, setPlaybook] = useState<GTMPlaybook | null>(() => {
    const saved = localStorage.getItem('gtm_playbook');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState<'playbook' | 'imc' | 'chat'>(() => (localStorage.getItem('gtm_tab') as any) || 'playbook');
  const [isListening, setIsListening] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showRetry, setShowRetry] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataTimeRef = useRef<number>(0);
  const recognitionRef = useRef<any>(null);
  const basePromptRef = useRef('');

  const t = translations[language];

  useEffect(() => {
    localStorage.setItem('gtm_prompt', prompt);
  }, [prompt]);

  useEffect(() => {
    localStorage.setItem('gtm_lang', language);
  }, [language]);

  useEffect(() => {
    if (playbook) {
      localStorage.setItem('gtm_playbook', JSON.stringify(playbook));
    } else {
      localStorage.removeItem('gtm_playbook');
    }
  }, [playbook]);

  useEffect(() => {
    localStorage.setItem('gtm_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (isGenerating) {
      lastDataTimeRef.current = Date.now();
      setShowRetry(false);
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => {
          const newTime = prev + 1;
          if (Date.now() - lastDataTimeRef.current > 30000) {
            setShowRetry(true);
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsedTime(0);
      setShowRetry(false);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGenerating]);

  useEffect(() => {
    if (playbook?.strategyMarkdown || playbook?.imcMaterials?.length) {
      lastDataTimeRef.current = Date.now();
      setShowRetry(false);
    }
  }, [playbook?.strategyMarkdown, playbook?.imcMaterials?.length]);

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

  const handleRefineSection = async (sectionTitle: string, instruction: string) => {
    if (!playbook) return;
    setIsRefining(true);
    try {
      const newContent = await refineStrategySection(
        playbook.strategyMarkdown,
        sectionTitle,
        instruction,
        language
      );
      
      // Replace the old section content with the new one
      // This is a simple replacement logic, assuming sectionTitle is unique and exists
      const escapedTitle = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const sectionRegex = new RegExp(`(##\\s+${escapedTitle}[\\s\\S]*?)(?=##\\s+|$)`, 'g');
      
      const updatedMarkdown = playbook.strategyMarkdown.replace(sectionRegex, (match, p1) => {
        return `## ${sectionTitle}\n\n${newContent}\n\n`;
      });

      setPlaybook({
        ...playbook,
        strategyMarkdown: updatedMarkdown
      });
      toast.success('Section refined successfully!');
    } catch (error) {
      console.error('Error refining section:', error);
      toast.error('Failed to refine section.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleStartOver = () => {
    console.log('Start Over clicked');
    setShowConfirmReset(true);
  };

  const confirmReset = () => {
    console.log('Confirming reset');
    setIsGenerating(false);
    setIsRefining(false);
    setPlaybook(null);
    setPrompt('');
    localStorage.removeItem('gtm_playbook');
    localStorage.removeItem('gtm_prompt');
    localStorage.removeItem('gtm_tab');
    localStorage.removeItem('gtm_chat_history');
    setShowConfirmReset(false);
    setActiveTab('playbook');
    toast.success(language === 'English' ? 'Reset successful' : '已重置');
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans text-slate-800">
      <Toaster position="top-center" />
      {/* Decorative Background Blobs - Subtler */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-display font-bold tracking-tight text-slate-900 uppercase italic">{t.appTitle}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
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
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-900" />
                
                <div className="text-center mb-10">
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-3 uppercase tracking-tight italic">{t.heroTitle}</h2>
                  <p className="text-slate-500 text-base max-w-2xl mx-auto leading-relaxed">{t.heroSubtitle}</p>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-[0.2em]">{t.inputLabel}</label>
                    <div className="relative">
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={t.inputPlaceholder}
                        className="w-full h-48 px-5 py-4 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 resize-none text-slate-800 text-base shadow-inner transition-all bg-slate-50/50 pb-14"
                      />
                      <button
                        onClick={toggleListening}
                        className={`absolute bottom-3 right-3 p-2.5 rounded-md flex items-center justify-center transition-all ${
                          isListening 
                            ? 'bg-red-500 text-white animate-pulse' 
                            : 'bg-white text-slate-400 hover:text-slate-900 border border-slate-200'
                        }`}
                        title={isListening ? t.stopDictation : t.startDictation}
                      >
                        {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="w-full py-4 px-8 bg-slate-900 text-white rounded-lg font-bold text-lg hover:bg-slate-800 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t.btnGenerating}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
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
              <div className="w-full lg:w-64 shrink-0">
                <nav className="space-y-1 sticky top-24">
                  <button
                    onClick={() => setActiveTab('playbook')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 ${
                      activeTab === 'playbook' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <BookOpen className="w-5 h-5" />
                    <span className="uppercase tracking-wider">{t.tabPlaybook}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('imc')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 ${
                      activeTab === 'imc' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <Layout className="w-5 h-5" />
                    <span className="uppercase tracking-wider">{t.tabIMC}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 ${
                      activeTab === 'chat' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span className="uppercase tracking-wider">{t.tabChat}</span>
                  </button>
                  
                  <div className="pt-6 mt-6 border-t border-slate-200">
                    <button
                      onClick={handleStartOver}
                      className="w-full px-4 py-3 text-xs font-bold text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-all duration-200 uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {t.btnStartOver}
                    </button>
                    <div className="mt-4 px-4 py-2 bg-slate-50 rounded border border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      {t.autoSaved}
                    </div>
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
                      className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 lg:p-12 relative"
                    >
                      {isGenerating && playbook.strategyMarkdown.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-8">
                          <div className="relative">
                            <div className="w-12 h-12 border-2 border-slate-100 rounded-lg"></div>
                            <div className="w-12 h-12 border-2 border-slate-900 rounded-lg border-t-transparent animate-spin absolute top-0 left-0"></div>
                          </div>
                          <div className="text-center space-y-3">
                            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest italic">{t.btnGenerating}</h3>
                            <p className="text-slate-400 text-sm font-medium animate-pulse uppercase tracking-tight">{t.statusStrategy}</p>
                            <p className="text-slate-400 text-xs font-mono">Time Elapsed: {elapsedTime}s</p>
                            
                            {showRetry && (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="pt-6"
                              >
                                <button 
                                  onClick={handleGenerate}
                                  className="px-6 py-2 bg-slate-100 text-slate-900 text-xs font-bold rounded border border-slate-200 hover:bg-slate-200 transition-all uppercase tracking-widest"
                                >
                                  {t.btnRetry}
                                </button>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          <PlaybookDisplay 
                            markdown={playbook.strategyMarkdown} 
                            language={language}
                            onRefineSection={handleRefineSection}
                            isRefining={isRefining}
                          />
                          {isGenerating && (
                            <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
                              <div className="flex items-center gap-3">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="animate-pulse">
                                  {playbook.imcMaterials.length > 0 
                                    ? t.statusIMC 
                                    : t.statusStrategy}
                                </span>
                              </div>
                              <span className="font-mono">{elapsedTime}s</span>
                            </div>
                          )}
                        </>
                      )}
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
                      {isGenerating && playbook.imcMaterials.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10 lg:p-14 flex flex-col items-center justify-center py-20 space-y-6">
                          <div className="relative">
                            <div className="w-12 h-12 border-2 border-slate-100 rounded-lg"></div>
                            <div className="w-12 h-12 border-2 border-slate-900 rounded-lg border-t-transparent animate-spin absolute top-0 left-0"></div>
                          </div>
                          <div className="text-center space-y-3">
                            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest italic">{t.tabIMC}</h3>
                            <p className="text-slate-400 text-sm font-medium animate-pulse uppercase tracking-tight">{t.statusIMC}</p>
                            <p className="text-slate-400 text-xs font-mono">Time Elapsed: {elapsedTime}s</p>
                            
                            {showRetry && (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="pt-6"
                              >
                                <button 
                                  onClick={handleGenerate}
                                  className="px-6 py-2 bg-slate-100 text-slate-900 text-xs font-bold rounded border border-slate-200 hover:bg-slate-200 transition-all uppercase tracking-widest"
                                >
                                  {t.btnRetry}
                                </button>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          <IMCMaterials 
                            materials={playbook.imcMaterials} 
                            language={language}
                            onUpdateMaterial={handleUpdateMaterial}
                          />
                          {isGenerating && (
                            <div className="p-6 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-[0.2em] shadow-sm">
                              <div className="flex items-center gap-3">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="animate-pulse">{t.statusMoreIMC}</span>
                              </div>
                              <span className="font-mono">{elapsedTime}s</span>
                            </div>
                          )}
                        </div>
                      )}
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
                      <Chatbot language={language} playbook={playbook} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmReset && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmReset(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-xl shadow-2xl border border-slate-200 p-8 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight italic">{t.confirmResetTitle}</h3>
              </div>
              <p className="text-slate-500 mb-8 leading-relaxed">{t.confirmResetMessage}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmReset(false)}
                  className="flex-1 py-3 px-4 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all uppercase tracking-widest"
                >
                  {t.btnCancel}
                </button>
                <button
                  onClick={confirmReset}
                  className="flex-1 py-3 px-4 rounded-lg bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 uppercase tracking-widest"
                >
                  {t.btnConfirm}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
