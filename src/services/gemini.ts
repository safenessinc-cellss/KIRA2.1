// src/services/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

// Lee la API key desde las variables de entorno
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Verifica que la clave exista
if (!GEMINI_API_KEY) {
  console.error('❌ VITE_GEMINI_API_KEY no está configurada en .env');
  console.error('🔑 Por favor, obtén tu API key en: https://aistudio.google.com/');
  throw new Error('Gemini API key is required. Please check your .env file.');
}

console.log('✅ Gemini API inicializada correctamente');

// Inicializa el cliente de Gemini
export const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Configura el modelo (puedes cambiar a 'gemini-1.5-flash' para respuestas más rápidas)
export const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-pro',
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048,
  },
});

// Función helper para usar Gemini
export async function generarConGemini(prompt: string) {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('❌ Error al llamar a Gemini:', error);
    throw error;
  }
}
