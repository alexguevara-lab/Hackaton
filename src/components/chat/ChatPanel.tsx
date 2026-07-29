import React, { useEffect, useRef, useState } from "react";
import { X, Send, Sparkles, Bot, User, Wand2 } from "lucide-react";
import { Project, KickoffItem, DiagramGraph } from "../../types";
import { getDocuments } from "../../lib/storage";
import { aiFetch } from "../../lib/aiConfig";

export interface GraphOperation {
  op: "add_node" | "update_node" | "delete_node" | "add_edge" | "delete_edge";
  node?: any;
  edge?: any;
  id?: string;
  data?: any;
}

interface ChatMessage {
  role: "user" | "model";
  text: string;
  appliedOps?: number;
}

interface ChatPanelProps {
  project: Project;
  graph: DiagramGraph;
  kickoffItems: KickoffItem[];
  onApplyOperations: (ops: GraphOperation[]) => void;
  onClose: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  project,
  graph,
  kickoffItems,
  onApplyOperations,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      text: `¡Hola! Soy el asistente IA del proyecto ${project.client_name}. Conozco el flujo actual, el checklist del kick-off y los documentos cargados. Pregúntame lo que necesites o pídeme cambios al flujo (ej: "agrega una rama de reclamos que termine en asesor humano").`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const data = await aiFetch("/api/ai/chat", {
        messages: nextMessages.map((m) => ({ role: m.role, text: m.text })),
        project,
        graph,
        kickoffItems,
        documents: getDocuments(project.id).map((d) => ({
          file_name: d.file_name,
          extracted_text: d.extracted_text,
        })),
      });

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "model", text: `⚠️ Hubo un problema consultando la IA: ${data.error}` },
        ]);
        return;
      }

      const ops: GraphOperation[] = Array.isArray(data.operations) ? data.operations : [];
      if (ops.length > 0) {
        onApplyOperations(ops);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: data.reply || "Listo.",
          appliedOps: ops.length > 0 ? ops.length : undefined,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "⚠️ No pude conectar con el servidor de IA. Intenta de nuevo." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-96 h-full shrink-0 bg-card border-l border-line flex flex-col shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-line bg-surface flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
            Asistente IA del Proyecto
          </span>
          <h3 className="text-sm font-bold text-heading flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>{project.client_name}</span>
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-ink-soft hover:text-heading hover:bg-line transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                msg.role === "user" ? "bg-heading text-white" : "bg-primary-soft text-primary"
              }`}
            >
              {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-4 h-4" />}
            </div>
            <div
              className={`max-w-[80%] rounded-xl p-3 text-xs leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-primary text-white rounded-tr-sm"
                  : "bg-surface border border-line text-ink rounded-tl-sm"
              }`}
            >
              {msg.text}
              {msg.appliedOps !== undefined && (
                <div className="mt-2 px-2 py-1 rounded-lg bg-success-soft text-success text-[10px] font-bold flex items-center gap-1">
                  <Wand2 className="w-3 h-3" />
                  <span>
                    {msg.appliedOps} cambio{msg.appliedOps !== 1 ? "s" : ""} aplicado
                    {msg.appliedOps !== 1 ? "s" : ""} al flujo
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-surface border border-line rounded-xl rounded-tl-sm p-3 text-xs text-ink-soft flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-spin" />
              <span>Pensando con el contexto del proyecto...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-line bg-surface flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta o pide cambios al flujo..."
          disabled={isLoading}
          className="flex-1 bg-card border border-line rounded-xl px-3 py-2 text-ink text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-3 py-2 bg-primary hover:bg-primary-hover disabled:bg-line disabled:text-ink-soft text-white font-bold rounded-xl transition-all shadow-sm active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
