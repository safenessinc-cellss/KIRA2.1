/**
 * Centralized Gemini Client Helper
 * Handles robust verification of GEMINI_API_KEY and provides clear user-friendly feedback.
 */

export interface GeminiPayload {
  model?: string;
  contents: any;
  config?: any;
}

export interface GeminiConfigResponse {
  configured: boolean;
}

/**
 * Checks if the Gemini API Key is configured on the server.
 */
export async function checkGeminiConfig(): Promise<boolean> {
  try {
    const res = await fetch('/api/gemini/config');
    if (!res.ok) return false;
    const data: GeminiConfigResponse = await res.json();
    return !!data.configured;
  } catch (error) {
    console.error('[Gemini Central] Error checking configuration:', error);
    return false;
  }
}

/**
 * Centrally calls the Gemini API Proxy with robust key checking and clear feedback.
 */
export async function generateGemini(payload: GeminiPayload): Promise<string> {
  // 1. Pre-call validation
  const isConfigured = await checkGeminiConfig();
  if (!isConfigured) {
    const errorMsg = 'Configuración faltante: La Clave de API de Gemini (GEMINI_API_KEY) no está configurada en la plataforma. Por favor, añádela en Settings > Secrets para activar las funciones de IA.';
    console.error('[Gemini Central] Validation failed:', errorMsg);
    throw new Error(errorMsg);
  }

  // 2. Execute call
  try {
    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.status === 412) {
      const text = await response.text().catch(() => "");
      let message = 'La clave de API de Gemini no está configurada en el servidor.';
      try {
        const data = JSON.parse(text);
        message = data.message || message;
      } catch (e) {}
      throw new Error(message);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      let errorMsg = `Error del servidor de IA (Status ${response.status})`;
      try {
        const data = JSON.parse(text);
        errorMsg = data.error || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    const text = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error("La respuesta del servidor no es un JSON válido. Por favor, asegúrate de que el backend se haya desplegado correctamente en Vercel.");
    }

    if (data.error) {
      if (data.error === 'GEMINI_API_KEY_MISSING') {
        throw new Error('Configuración faltante: La Clave de API de Gemini no está disponible. Agrégala en Settings > Secrets.');
      }
      throw new Error(data.error);
    }

    return data.text || '';
  } catch (error: any) {
    console.error('[Gemini Central] Call failed:', error);
    throw error;
  }
}
