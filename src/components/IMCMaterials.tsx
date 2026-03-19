import React from 'react';
import { IMCMaterial, Language } from '../types';
import { generateImage } from '../services/geminiService';
import { Loader2, Image as ImageIcon, Download, Sparkles, Mail, Copy, Check } from 'lucide-react';
import { translations } from '../translations';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

interface Props {
  materials: IMCMaterial[];
  language: Language;
  onUpdateMaterial: (id: string, updates: Partial<IMCMaterial>) => void;
}

export const IMCMaterials = ({ materials, language, onUpdateMaterial }: Props) => {
  const t = translations[language];
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };
  const handleGenerateImage = async (material: IMCMaterial) => {
    onUpdateMaterial(material.id, { isGeneratingImage: true });
    try {
      const imageUrl = await generateImage(material.imagePrompt);
      onUpdateMaterial(material.id, { imageUrl, isGeneratingImage: false });
      toast.success('Image generated successfully!');
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error(t.errorVisual);
      onUpdateMaterial(material.id, { isGeneratingImage: false });
    }
  };

  return (
    <div className="space-y-6">
      {materials.map((material, index) => (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          key={material.id || index} 
          className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
        >
          <div className="p-8 border-b border-slate-100 relative">
            <button 
              onClick={() => handleCopy(material.id, (material.content || '').replace(/\\n/g, '\n'))}
              className="absolute top-6 right-8 p-2 bg-slate-50 border border-slate-200 rounded-md text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all shadow-sm no-print"
              title="Copy Content"
            >
              {copiedId === material.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pr-12">
              <span className="inline-flex w-fit px-3 py-1 bg-slate-900 text-white text-[10px] font-black rounded uppercase tracking-[0.2em]">
                {material.type}
              </span>
              <h3 className="text-xl font-display font-bold text-slate-900 italic">{material.title}</h3>
            </div>
            <div className="whitespace-pre-wrap text-slate-600 text-base leading-relaxed font-medium">
              {(material.content || '').replace(/\\n/g, '\n').replace(/\\n/g, '\n')}
            </div>
          </div>
          
          <div className="p-8 bg-slate-50/50">
            <div className="mb-6">
              <h4 className="text-[10px] font-black text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-[0.2em]">
                <Sparkles className="w-3.5 h-3.5" /> {t.suggestedVisual}
              </h4>
              <p className="text-sm text-slate-500 italic leading-relaxed bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                "{material.imagePrompt}"
              </p>
            </div>
            
            {material.imageUrl ? (
              <div className="space-y-6">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative rounded-lg overflow-hidden border border-slate-200 shadow-md bg-white group"
                >
                  <img src={material.imageUrl} alt={material.title} className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <a 
                    href={material.imageUrl} 
                    download={`visual-${material.id}.png`}
                    className="absolute bottom-4 right-4 p-2.5 bg-white rounded shadow-lg hover:bg-slate-900 hover:text-white transition-all duration-200 text-slate-900"
                    title={t.downloadImage}
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </motion.div>
                
                <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                  <div className="text-center sm:text-left">
                    <h5 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t.contactForHQ}</h5>
                    <p className="text-xs text-slate-500 mt-1">Get professional, high-resolution assets tailored for your brand.</p>
                  </div>
                  <a 
                    href="mailto:artist.lai@gmail.com?subject=High-Quality Production Request - GTM Architect"
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-all shadow-sm whitespace-nowrap uppercase tracking-widest"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {t.contactUs}
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => handleGenerateImage(material)}
                  disabled={material.isGeneratingImage}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-widest"
                >
                  {material.isGeneratingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t.btnGeneratingVisual}
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4" />
                      {t.btnGenerateVisual}
                    </>
                  )}
                </button>
                
                <a 
                  href="mailto:artist.lai@gmail.com?subject=High-Quality Production Request - GTM Architect"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-900 border border-slate-200 rounded hover:bg-slate-50 transition-all font-bold text-xs uppercase tracking-widest"
                >
                  <Mail className="w-4 h-4" />
                  {t.contactUs}
                </a>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};
