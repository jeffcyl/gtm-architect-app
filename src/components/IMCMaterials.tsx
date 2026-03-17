import React from 'react';
import { IMCMaterial, Language } from '../types';
import { generateImage } from '../services/geminiService';
import { Loader2, Image as ImageIcon, Download, Sparkles, Mail } from 'lucide-react';
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
    <div className="space-y-8">
      {materials.map((material, index) => (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          key={material.id || index} 
          className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-rose-100/50 overflow-hidden"
        >
          <div className="p-8 border-b border-rose-50/50">
            <div className="flex items-center justify-between mb-6">
              <span className="px-4 py-1.5 bg-rose-50 text-rose-600 text-xs font-bold rounded-full uppercase tracking-widest">
                {material.type}
              </span>
              <h3 className="text-2xl font-display font-semibold text-slate-800">{material.title}</h3>
            </div>
            <div className="whitespace-pre-wrap text-slate-600 text-lg leading-relaxed">
              {material.content}
            </div>
          </div>
          
          <div className="p-8 bg-[#FFFCFA]">
            <div className="mb-6">
              <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-orange-400" /> {t.suggestedVisual}
              </h4>
              <p className="text-base text-slate-500 italic leading-relaxed bg-white p-4 rounded-2xl border border-rose-50">
                "{material.imagePrompt}"
              </p>
            </div>
            
            {material.imageUrl ? (
              <div className="space-y-6">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative rounded-3xl overflow-hidden border border-rose-100 shadow-sm bg-white group"
                >
                  <img src={material.imageUrl} alt={material.title} className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <a 
                    href={material.imageUrl} 
                    download={`visual-${material.id}.png`}
                    className="absolute bottom-6 right-6 p-3 bg-white/95 backdrop-blur-md rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-300 text-rose-600"
                    title={t.downloadImage}
                  >
                    <Download className="w-5 h-5" />
                  </a>
                </motion.div>
                
                <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <h5 className="font-bold text-slate-800">{t.contactForHQ}</h5>
                    <p className="text-sm text-slate-500 mt-1">Get professional, high-resolution assets tailored for your brand.</p>
                  </div>
                  <a 
                    href="mailto:artist.lai@gmail.com?subject=High-Quality Production Request - GTM Architect"
                    className="flex items-center gap-2 px-6 py-3 bg-white text-rose-600 border border-rose-200 rounded-full hover:bg-rose-50 hover:border-rose-300 transition-all font-semibold shadow-sm whitespace-nowrap"
                  >
                    <Mail className="w-4 h-4" />
                    {t.contactUs}
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={() => handleGenerateImage(material)}
                  disabled={material.isGeneratingImage}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-rose-500 to-orange-400 text-white rounded-full hover:shadow-lg hover:shadow-rose-500/25 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-sm font-semibold tracking-wide"
                >
                  {material.isGeneratingImage ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t.btnGeneratingVisual}
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-5 h-5" />
                      {t.btnGenerateVisual}
                    </>
                  )}
                </button>
                
                <div className="hidden sm:block w-px h-8 bg-rose-200" />
                
                <a 
                  href="mailto:artist.lai@gmail.com?subject=High-Quality Production Request - GTM Architect"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-full hover:bg-slate-50 hover:text-slate-900 transition-all font-semibold shadow-sm text-sm"
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
