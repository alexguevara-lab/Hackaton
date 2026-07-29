import React, { useState } from "react";
import { X, KeyRound, Cpu, Check, Eye, EyeOff, Sparkles } from "lucide-react";
import { getAIConfig, saveAIConfig, MODEL_OPTIONS, DEFAULT_MODEL } from "../../lib/aiConfig";

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const initial = getAIConfig();
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [model, setModel] = useState(initial.model || DEFAULT_MODEL);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveAIConfig({ apiKey: apiKey.trim(), model });
    setSaved(true);
    setTimeout(() => onClose(), 700);
  };

  return (
    <div className="fixed inset-0 bg-heading/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-line rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-soft text-primary rounded-xl border border-primary/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-heading">Configuración de IA (Gemini)</h3>
              <p className="text-[11px] text-ink-soft">API key y modelo usados en todo el proyecto</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-soft hover:text-heading hover:bg-line transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* API Key */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-heading flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-primary" />
            API Key de Gemini
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Pega aquí la API key de Gemini..."
              className="w-full bg-surface border border-line rounded-lg pl-3 pr-10 py-2 text-ink text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2 top-2 text-ink-soft hover:text-heading"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-ink-soft">
            Si la dejas vacía se usa la key configurada en el servidor (<code className="font-mono">.env.local</code>).
            Se guarda solo en este navegador.
          </p>
        </div>

        {/* Modelo */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-heading flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-primary" />
            Modelo de Gemini
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-ink text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {MODEL_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-ink-soft">
            Aplica al análisis de documentos, auditoría, chat IA, ficha técnica y resumen de acuerdos.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface hover:bg-line text-ink font-bold rounded-xl text-xs transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            {saved ? <Check className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
            <span>{saved ? "¡Guardado!" : "Guardar configuración"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
