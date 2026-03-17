export interface GTMPlaybook {
  strategyMarkdown: string;
  imcMaterials: IMCMaterial[];
}

export interface IMCMaterial {
  id: string;
  type: string;
  title: string;
  content: string;
  imagePrompt: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
}

export type Language = 'English' | 'Traditional Chinese';
export type ImageSize = '1K' | '2K' | '4K';
