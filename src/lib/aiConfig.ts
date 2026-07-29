// Configuración de IA (API key y modelo de Gemini) — editable desde la UI.
// Se guarda en localStorage y se envía en cada llamada; el servidor usa la
// key/modelo enviados o cae al GEMINI_API_KEY de .env.local.

const AI_CONFIG_KEY = "atomscope_ai_config_v1";

export interface AIConfig {
  apiKey: string; // vacío = usar la key configurada en el servidor (.env.local)
  model: string;
}

export const DEFAULT_MODEL = "gemini-3.6-flash";

export const MODEL_OPTIONS = [
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash (rápido, recomendado)" },
  { id: "gemini-pro-latest", label: "Gemini Pro (latest, más capaz)" },
  { id: "gemini-flash-latest", label: "Gemini Flash (latest)" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
];

export function getAIConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { apiKey: parsed.apiKey || "", model: parsed.model || DEFAULT_MODEL };
    }
  } catch {
    // config corrupta → defaults
  }
  return { apiKey: "", model: DEFAULT_MODEL };
}

export function saveAIConfig(config: AIConfig) {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
}

/** fetch a los endpoints /api/ai/* incluyendo siempre la config de IA. */
export async function aiFetch(path: string, payload: Record<string, any>): Promise<any> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, config: getAIConfig() }),
  });
  return res.json();
}
