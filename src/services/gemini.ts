// All Gemini requests go through the authenticated server proxy.
// Never place a Gemini API key in a VITE_* variable or browser bundle.
import { generateGemini } from '../lib/gemini';

type GenerationOptions = {
  model?: string;
  generationConfig?: Record<string, unknown>;
};

export const genAI = {
  getGenerativeModel: ({ model = 'gemini-2.5-flash', generationConfig = {} }: GenerationOptions = {}) => ({
    generateContent: async (prompt: string) => {
      const text = await generateGemini({
        model,
        contents: prompt,
        config: generationConfig,
      });
      return { response: { text: () => text } };
    },
  }),
};

export const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048,
  },
});

export async function generarConGemini(prompt: string): Promise<string> {
  return generateGemini({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  });
}
