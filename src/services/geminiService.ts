import { GoogleGenAI, Type } from '@google/genai';
import { jsonrepair } from 'jsonrepair';
import { GTMPlaybook } from '../types';

// Initialize with the default API key for text generation
const getAi = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateGTMPlaybookStream = async function* (
  prompt: string,
  language: string
): AsyncGenerator<Partial<GTMPlaybook>, void, unknown> {
  const ai = getAi();
  const responseStream = await ai.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents: `You are a world-class Chief Marketing Officer (CMO) and GTM Architect. Your task is to generate a high-stakes, professional GTM playbook.
    
    CRITICAL KNOWLEDGE:
    - 新盛力 (SyncPower) is STL (not Shin-Kobe). They are leaders in Battery Backup Units (BBU) for AI Servers.
    
    Prompt: ${prompt}
    Output Language: ${language}
    
    Provide the output in JSON format with the following structure:
    {
      "strategyMarkdown": "# [Project Name] GTM Strategy\\n\\n## 1. Executive Summary\\n[Content...]\\n\\n## 2. Market Analysis\\n- **TAM/SAM/SOM**: [Data...]\\n- **Competitor Landscape**: [Analysis...]\\n\\n## 3. STP Strategy\\n- **Segmentation**: [Details...]\\n- **Targeting**: [Details...]\\n- **Positioning**: [Details...]\\n\\n## 4. Marketing Mix (4Ps/7Ps)\\n[Strategic breakdown...]\\n\\n## 5. Phased Rollout Plan\\n- **Phase 1: Pre-launch**\\n- **Phase 2: Launch**\\n- **Phase 3: Post-launch**\\n\\n## 6. OKRs & KPIs\\n[Measurable goals...]",
      "imcMaterials": [
        {
          "id": "unique-id",
          "type": "Channel Type",
          "title": "Material Title",
          "content": "High-converting copy with hooks and CTAs.",
          "imagePrompt": "Detailed English prompt for AI image generation."
        }
      ]
    }
    
    Ensure the strategy is data-driven, uses professional terminology, and is formatted with clean Markdown. Use double backslashes for newlines in the JSON string (e.g., \\n\\n).`,
    config: {
      tools: [{ googleSearch: {} }],
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
  let lastYieldedJson = '';

  try {
    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        
        // Only try to parse if we have enough new content to potentially have a valid JSON segment
        try {
          const repairedJson = jsonrepair(fullText);
          if (repairedJson !== lastYieldedJson) {
            const parsed = JSON.parse(repairedJson);
            yield parsed as Partial<GTMPlaybook>;
            lastYieldedJson = repairedJson;
          }
        } catch (e) {
          // Incomplete JSON, continue accumulating
        }
      }
    }
  } catch (error: any) {
    console.error('Streaming error:', error);
    // If we have some content, yield it one last time
    if (fullText) {
      try {
        const repairedJson = jsonrepair(fullText);
        yield JSON.parse(repairedJson) as Partial<GTMPlaybook>;
      } catch (e) {
        // Final attempt failed
      }
    }
    throw error;
  }
};

export const generateGTMPlaybook = async (
  prompt: string,
  language: string
): Promise<any> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
      tools: [{ googleSearch: {} }],
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
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt.substring(0, 1000), // Ensure prompt is not too long
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error('No image generated in the response.');
  } catch (error: any) {
    console.error('Error generating image:', error);
    throw new Error(`Failed to generate image: ${error.message || 'Unknown error'}`);
  }
};

export const refineStrategySection = async (
  fullStrategy: string,
  sectionTitle: string,
  instruction: string,
  language: string
): Promise<string> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `You are a world-class CMO. I have a GTM strategy and I need to refine a specific section.
    
    FULL STRATEGY CONTEXT:
    ${fullStrategy}
    
    SECTION TO REFINE:
    ${sectionTitle}
    
    USER INSTRUCTION:
    ${instruction}
    
    OUTPUT LANGUAGE:
    ${language}
    
    TASK:
    Rewrite ONLY the content of the specified section based on the user instruction. 
    Maintain the professional tone and ensure it fits seamlessly back into the full strategy.
    Return ONLY the new content for that section in Markdown format. Do not include the section title itself if it's already provided.`,
    config: {
      tools: [{ googleSearch: {} }],
    }
  });

  return response.text || '';
};

