import React, { useState } from "react";
import { Sparkles, CheckCircle2, Plus, Bot, Paperclip } from "lucide-react";
import { Project, KickoffItem, KickoffCategory, CustomNodeType } from "../../types";
import { saveKickoffItem } from "../../lib/storage";

interface KickoffPanelProps {
  project: Project;
  kickoffItems: KickoffItem[];
  onUpdateKickoffItems: (items: KickoffItem[]) => void;
  onInsertNodeFromKickoff: (type: CustomNodeType, label: string, dataProps?: any) => void;
}

export const KickoffPanel: React.FC<KickoffPanelProps> = ({
  project,
  kickoffItems,
  onUpdateKickoffItems,
  onInsertNodeFromKickoff,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<KickoffCategory | "Todas">("Todas");

  const categories: KickoffCategory[] = [
    "Generales",
    "Rutas e Intenciones",
    "Captura de Datos",
    "Cierres",
    "Integraciones",
    "Asignación Humana",
  ];

  const totalCount = kickoffItems.length;
  const answeredCount = kickoffItems.filter((k) => k.status === "answered").length;
  const progressPct = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  const filteredItems = kickoffItems.filter(
    (k) => selectedCategory === "Todas" || k.category === selectedCategory
  );

  const handleUpdateItemAnswer = (id: string, answer: string, status: "answered" | "pending" | "n_a") => {
    const updated = kickoffItems.map((k) => (k.id === id ? { ...k, answer, status } : k));
    onUpdateKickoffItems(updated);
    const target = updated.find((k) => k.id === id);
    if (target) saveKickoffItem(target);
  };

  return (
    <div className="h-full flex flex-col bg-card border-l border-line text-xs text-ink shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-line bg-surface">
        <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
          Guía Kick-off en Vivo
        </span>
        <h3 className="text-sm font-bold text-heading flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Checklist de acuerdos ({answeredCount}/{totalCount})</span>
        </h3>
        <p className="text-[10px] text-ink-soft mt-1 flex items-center gap-1">
          <Paperclip className="w-3 h-3" />
          <span>¿Faltan preguntas? Carga documentos en el módulo Documentos y analízalos con IA.</span>
        </p>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-2 bg-surface/50 border-b border-line flex items-center justify-between gap-3">
        <div className="flex-1 bg-line h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              progressPct === 100 ? "bg-success" : "bg-primary"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="font-bold text-ink text-[11px] shrink-0">{progressPct}% completado</span>
      </div>

      {/* Category Filter Pills */}
      <div className="p-2 border-b border-line flex items-center gap-1 overflow-x-auto bg-surface">
        <button
          onClick={() => setSelectedCategory("Todas")}
          className={`px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap transition-all ${
            selectedCategory === "Todas" ? "bg-primary text-white shadow-xs" : "text-ink-soft hover:bg-primary-soft hover:text-primary"
          }`}
        >
          Todas
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat ? "bg-primary text-white shadow-xs" : "text-ink-soft hover:bg-primary-soft hover:text-primary"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Questions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`p-3.5 rounded-xl border transition-all ${
              item.status === "answered"
                ? "bg-success-soft border-success/30"
                : "bg-card border-line hover:border-primary/40 shadow-xs"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="px-1.5 py-0.5 rounded bg-surface text-[9px] font-bold text-ink-soft uppercase">
                {item.category}
              </span>
              <div className="flex items-center gap-1">
                {item.source === "ai" && (
                  <span className="px-1.5 py-0.5 rounded bg-primary-soft text-primary border border-primary/30 text-[9px] font-bold flex items-center gap-0.5">
                    <Bot className="w-2.5 h-2.5" /> IA
                  </span>
                )}
                <button
                  onClick={() =>
                    handleUpdateItemAnswer(
                      item.id,
                      item.answer || "",
                      item.status === "answered" ? "pending" : "answered"
                    )
                  }
                  className={`p-1 rounded text-[10px] font-bold flex items-center gap-1 transition-colors ${
                    item.status === "answered"
                      ? "text-success bg-success-soft"
                      : "text-ink-soft hover:text-heading"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{item.status === "answered" ? "Resuelta" : "Pendiente"}</span>
                </button>
              </div>
            </div>

            <p className="font-bold text-heading mb-2 text-xs">{item.question}</p>

            {/* Answer Field */}
            <div className="space-y-2">
              <textarea
                rows={2}
                value={item.answer || ""}
                onChange={(e) => handleUpdateItemAnswer(item.id, e.target.value, "answered")}
                placeholder="Escribe el acuerdo o respuesta definida con el cliente..."
                className="w-full bg-card border border-line rounded-lg p-2 text-ink text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />

              {/* Insert Matching Canvas Node */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-ink-soft font-medium">
                  {item.answer ? "✓ Respuesta guardada" : "Escribe para completar"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    let nodeType: CustomNodeType = "message";
                    if (item.category === "Integraciones") nodeType = "integration";
                    else if (item.category === "Captura de Datos") nodeType = "capture";
                    else if (item.category === "Cierres") nodeType = "closing";
                    else if (item.category === "Asignación Humana") nodeType = "human";
                    else if (item.category === "Rutas e Intenciones") nodeType = "orchestrator";

                    onInsertNodeFromKickoff(nodeType, item.question.slice(0, 25), {
                      description: item.answer || item.question,
                    });
                  }}
                  className="px-2.5 py-1 bg-primary-soft hover:bg-primary hover:text-white text-primary font-bold rounded text-[10px] flex items-center gap-1 transition-colors border border-primary/30"
                >
                  <Plus className="w-3 h-3" />
                  <span>Insertar Nodo</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <p className="text-center text-ink-soft py-6 italic text-xs">
            No hay preguntas en esta categoría. Analiza documentos con IA para generarlas.
          </p>
        )}
      </div>
    </div>
  );
};
