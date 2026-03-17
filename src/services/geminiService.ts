import { GoogleGenAI, Type } from '@google/genai';
import { jsonrepair } from 'jsonrepair';
import { GTMPlaybook } from '../types';

// Initialize with the default API key for text generation
const getAi = () => new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY
});

export const generateGTMPlaybookStream = async function* (
  prompt: string,
  language: string
): AsyncGenerator<Partial<GTMPlaybook>, void, unknown> {
  const ai = getAi();
  const responseStream = await ai.models.generateContentStream({
    model: 'gemini-3.1-pro-preview',
    contents: `You are a world-class Chief Marketing Officer (CMO) and Go-To-Market (GTM) expert. Your task is to generate a highly professional, data-driven, and actionable GTM playbook and Integrated Marketing Communications (IMC) materials based on the following prompt.
    
    Prompt: ${prompt}
    Output Language: ${language}
    
    Provide the output in JSON format with the following structure:
    {
      "strategyMarkdown": "A detailed GTM strategy in Markdown format. MUST include: 1. Executive Summary & Value Proposition, 2. Market Analysis (TAM/SAM/SOM, Competitor Landscape), 3. STP Strategy (Segmentation, Targeting, Positioning), 4. Marketing Mix (4Ps/7Ps), 5. Phased Rollout Plan (Pre-launch, Launch, Post-launch), 6. OKRs & KPIs (Metrics for success). Use standard Markdown formatting (e.g., **bold**, # headings, bullet points). DO NOT use HTML tags like <br>.",
      "imcMaterials": [
        {
          "id": "unique-id",
          "type": "e.g., Instagram Carousel, Email Newsletter, LinkedIn Thought Leadership, PR Press Release, Performance Ad",
          "title": "Title of the material",
          "content": "The highly-converting, ready-to-use copy/text for the material. Include hooks, body, and strong CTAs.",
          "imagePrompt": "A highly detailed, professional prompt for an AI image generator (like Midjourney) to create the accompanying visual. Include lighting, composition, style, and camera angle. The prompt MUST be in English."
        }
      ]
    }
    
    Ensure the strategy is thorough, innovative, and tailored to the specific product/market. The IMC materials MUST cover at least 4 different channels (e.g., Social, Email, PR, Paid Ads). The imagePrompt MUST be in English regardless of the requested language, as it will be fed to an image model.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          strategyMarkdown: { type: Type.STRING },
          imcMaterials: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING },
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                imagePrompt: { type: Type.STRING },
              },
              required: ['id', 'type', 'title', 'content', 'imagePrompt'],
            },
          },
        },
        required: ['strategyMarkdown', 'imcMaterials'],
      },
    },
  });

  let fullText = '';
  for await (const chunk of responseStream) {
    if (chunk.text) {
      fullText += chunk.text;
      try {
        const repairedJson = jsonrepair(fullText);
        const parsed = JSON.parse(repairedJson);
        yield parsed as Partial<GTMPlaybook>;
      } catch (e) {
        // Ignore parse errors for incomplete chunks that jsonrepair can't fix yet
      }
    }
  }
};

export const generateGTMPlaybook = async (
  prompt: string,
  language: string
): Promise<any> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `You are a world-class Chief Marketing Officer (CMO) and Go-To-Market (GTM) expert. Your task is to generate a highly professional, data-driven, and actionable GTM playbook and Integrated Marketing Communications (IMC) materials based on the following prompt.
    
    Prompt: ${prompt}
    Output Language: ${language}
    
    Provide the output in JSON format with the following structure:
    {
      "strategyMarkdown": "A detailed GTM strategy in Markdown format. MUST include: 1. Executive Summary & Value Proposition, 2. Market Analysis (TAM/SAM/SOM, Competitor Landscape), 3. STP Strategy (Segmentation, Targeting, Positioning), 4. Marketing Mix (4Ps/7Ps), 5. Phased Rollout Plan (Pre-launch, Launch, Post-launch), 6. OKRs & KPIs (Metrics for success). Use standard Markdown formatting (e.g., **bold**, # headings, bullet points). DO NOT use HTML tags like <br>.",
      "imcMaterials": [
        {
          "id": "unique-id",
          "type": "e.g., Instagram Carousel, Email Newsletter, LinkedIn Thought Leadership, PR Press Release, Performance Ad",
          "title": "Title of the material",
          "content": "The highly-converting, ready-to-use copy/text for the material. Include hooks, body, and strong CTAs.",
          "imagePrompt": "A highly detailed, professional prompt for an AI image generator (like Midjourney) to create the accompanying visual. Include lighting, composition, style, and camera angle. The prompt MUST be in English."
        }
      ]
    }
    
    Ensure the strategy is thorough, innovative, and tailored to the specific product/market. The IMC materials MUST cover at least 4 different channels (e.g., Social, Email, PR, Paid Ads). The imagePrompt MUST be in English regardless of the requested language, as it will be fed to an image model.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          strategyMarkdown: { type: Type.STRING },
          imcMaterials: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING },
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                imagePrompt: { type: Type.STRING },
              },
              required: ['id', 'type', 'title', 'content', 'imagePrompt'],
            },
          },
        },
        required: ['strategyMarkdown', 'imcMaterials'],
      },
    },
  });

  return JSON.parse(response.text || '{}');
};

export const generateImage = async (
  prompt: string
): Promise<string> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: prompt,
    config: {
      imageConfig: {
        aspectRatio: '16:9',
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error('No image generated');
};

