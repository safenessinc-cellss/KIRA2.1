// Gemini calls must go through the authenticated server proxy.
// Never place a Gemini API key in VITE_* variables or browser bundles.
import { auth } from '../firebase';

type GeminiResult = { response: { text: () => string } };

async function generateContent(prompt: string): Promise<GeminiResult> {
  const user = auth.currentUser;
  if (!user) throw new Error('Debes iniciar sesión para utilizar el servicio de IA.');
  const idToken = await user.getIdToken();
  const response = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 2048 },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : 'No fue posible completar la solicitud de IA.');
  }
  const text = typeof payload.text === 'string' ? payload.text : '';
  return { response: { text: () => text } };
}

// Compatibility facade for existing callers using model.generateContent().
export const model = { generateContent };
export const genAI = { getGenerativeModel: () => model };

export async function generarConGemini(prompt: string): Promise<string> {
  const result = await generateContent(prompt);
  return result.response.text();
}
