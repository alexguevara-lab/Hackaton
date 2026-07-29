import React, { useState, useEffect } from "react";
import { X, AlertTriangle, Plus, Trash2, User, Send } from "lucide-react";
import { CustomCanvasNode, CommentItem } from "../../types";
import { getComments, saveComment } from "../../lib/storage";

interface NodePropertyInspectorProps {
  node: CustomCanvasNode | null;
  diagramId: string;
  onClose: () => void;
  onUpdateNode: (updatedNode: CustomCanvasNode) => void;
  onDeleteNode: (nodeId: string) => void;
}

export const NodePropertyInspector: React.FC<NodePropertyInspectorProps> = ({
  node,
  diagramId,
  onClose,
  onUpdateNode,
  onDeleteNode,
}) => {
  if (!node) return null;

  const [formData, setFormData] = useState<any>({ ...node.data });
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [authorName] = useState("Onboarding (OB)");

  useEffect(() => {
    setFormData({ ...node.data });
    if (diagramId) {
      const allComments = getComments(diagramId);
      setComments(allComments.filter((c) => c.node_id === node.id));
    }
  }, [node, diagramId]);

  const handleChange = (field: string, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onUpdateNode({ ...node, data: updated });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newComment: CommentItem = {
      id: `cmt-${Date.now()}`,
      diagram_id: diagramId,
      node_id: node.id,
      author_name: authorName,
      body: newCommentText.trim(),
      resolved: false,
      created_at: new Date().toISOString(),
    };

    saveComment(newComment);
    setComments([newComment, ...comments]);
    setNewCommentText("");

    const updated = { ...formData, commentsCount: (formData.commentsCount || 0) + 1 };
    setFormData(updated);
    onUpdateNode({ ...node, data: updated });
  };

  const inputClass =
    "w-full bg-card border border-line rounded-lg px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-primary font-medium";

  return (
    <div className="absolute inset-y-0 right-0 w-96 bg-card border-l border-line shadow-2xl z-40 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="px-5 py-4 border-b border-line flex items-center justify-between bg-surface">
        <div>
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
            Propiedades del Nodo
          </span>
          <h3 className="text-sm font-bold text-heading flex items-center gap-2">
            {node.data.label}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-ink-soft hover:text-heading hover:bg-line transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body / Form */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-ink">
        {/* General Details */}
        <div className="space-y-3 bg-surface p-3.5 rounded-xl border border-line">
          <div>
            <label className="block text-[11px] font-bold text-ink-soft mb-1">Nombre del Nodo (Label ≤30ch):</label>
            <input
              type="text"
              value={formData.label || ""}
              onChange={(e) => handleChange("label", e.target.value)}
              className={inputClass}
            />
            {formData.label && formData.label.length > 30 && (
              <p className="text-[10px] text-warning font-semibold mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Excede el límite de 30 caracteres de Atom
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-soft mb-1">Descripción / Notas internas:</label>
            <textarea
              rows={2}
              value={formData.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Instrucciones especiales para el cliente o la Skill..."
              className={inputClass}
            />
          </div>
        </div>

        {/* 1. Message Node */}
        {node.type === "message" && (
          <div className="space-y-3 bg-primary-soft p-3.5 rounded-xl border border-primary/30">
            <span className="font-bold text-primary block text-xs">💬 Configuración de Mensaje</span>
            <div>
              <label className="block text-[11px] font-bold text-ink-soft mb-1">Texto del Mensaje (WhatsApp):</label>
              <textarea
                rows={3}
                value={formData.messageText || ""}
                onChange={(e) => handleChange("messageText", e.target.value)}
                placeholder="¡Hola! Bienvenido a..."
                className={inputClass}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-ink-soft">Botones (≤20ch por label):</label>
                <button
                  type="button"
                  onClick={() => {
                    const btns = formData.buttons || [];
                    handleChange("buttons", [...btns, { id: `b-${Date.now()}`, label: "Nuevo Botón" }]);
                  }}
                  className="text-[10px] text-primary font-bold hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Agregar
                </button>
              </div>
              <div className="space-y-2">
                {(formData.buttons || []).map((btn: any, idx: number) => (
                  <div key={btn.id} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={btn.label}
                      onChange={(e) => {
                        const newBtns = [...formData.buttons];
                        newBtns[idx].label = e.target.value;
                        handleChange("buttons", newBtns);
                      }}
                      className={`flex-1 bg-card border rounded px-2 py-1 text-ink text-xs font-medium ${
                        btn.label.length > 20 ? "border-danger" : "border-line"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newBtns = formData.buttons.filter((_: any, i: number) => i !== idx);
                        handleChange("buttons", newBtns);
                      }}
                      className="p-1 text-ink-soft hover:text-danger"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. Orchestrator Node */}
        {node.type === "orchestrator" && (
          <div className="space-y-3 bg-primary-soft p-3.5 rounded-xl border border-primary/30">
            <span className="font-bold text-primary block text-xs">🧠 Smarton Orquestador</span>
            <div>
              <label className="block text-[11px] font-bold text-ink-soft mb-1">
                Recupero sin respuesta (no_answer_minutes):
              </label>
              <input
                type="number"
                value={formData.noAnswerMinutes || 30}
                onChange={(e) => handleChange("noAnswerMinutes", Number(e.target.value))}
                className={inputClass}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-ink-soft">Intenciones / Ramas:</label>
                <button
                  type="button"
                  onClick={() => {
                    const intents = formData.intents || [];
                    handleChange("intents", [
                      ...intents,
                      { id: `i-${Date.now()}`, name: "Nueva Intención", condition: "", isSalesBranch: false },
                    ]);
                  }}
                  className="text-[10px] text-primary font-bold hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Agregar
                </button>
              </div>
              <div className="space-y-2">
                {(formData.intents || []).map((intent: any, idx: number) => (
                  <div key={intent.id} className="p-2 bg-card rounded border border-line space-y-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nombre de intención"
                        value={intent.name}
                        onChange={(e) => {
                          const newIntents = [...formData.intents];
                          newIntents[idx].name = e.target.value;
                          handleChange("intents", newIntents);
                        }}
                        className="flex-1 bg-surface border border-line rounded px-2 py-1 text-ink font-medium"
                      />
                      <label className="flex items-center gap-1 text-[10px] text-success font-bold">
                        <input
                          type="checkbox"
                          checked={intent.isSalesBranch}
                          onChange={(e) => {
                            const newIntents = [...formData.intents];
                            newIntents[idx].isSalesBranch = e.target.checked;
                            handleChange("intents", newIntents);
                          }}
                        />
                        Venta
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newIntents = formData.intents.filter((_: any, i: number) => i !== idx);
                          handleChange("intents", newIntents);
                        }}
                        className="p-1 text-ink-soft hover:text-danger"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. Capture Node */}
        {node.type === "capture" && (
          <div className="space-y-3 bg-primary-soft p-3.5 rounded-xl border border-primary/30">
            <div className="flex justify-between items-center">
              <span className="font-bold text-primary block text-xs">📝 Campos a Capturar</span>
              <button
                type="button"
                onClick={() => {
                  const fields = formData.fields || [];
                  handleChange("fields", [
                    ...fields,
                    { name: "var_nuevo", type: "var", prompt: "¿Cuál es tu dato?" },
                  ]);
                }}
                className="text-[10px] text-primary font-bold hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Agregar campo
              </button>
            </div>
            <div className="space-y-2">
              {(formData.fields || []).map((f: any, idx: number) => (
                <div key={idx} className="p-2 bg-card rounded border border-line space-y-1.5">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="var_nombre o custom_ciudad"
                      value={f.name}
                      onChange={(e) => {
                        const newFields = [...formData.fields];
                        newFields[idx].name = e.target.value;
                        handleChange("fields", newFields);
                      }}
                      className="flex-1 bg-surface border border-line rounded px-2 py-1 text-ink font-mono text-[11px]"
                    />
                    <select
                      value={f.type}
                      onChange={(e) => {
                        const newFields = [...formData.fields];
                        newFields[idx].type = e.target.value;
                        handleChange("fields", newFields);
                      }}
                      className="bg-surface border border-line rounded px-1 py-1 text-[10px] font-bold"
                    >
                      <option value="var">var_</option>
                      <option value="custom">custom_</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const newFields = formData.fields.filter((_: any, i: number) => i !== idx);
                        handleChange("fields", newFields);
                      }}
                      className="p-1 text-ink-soft hover:text-danger"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Prompt: ¿Cómo se pide este dato?"
                    value={f.prompt}
                    onChange={(e) => {
                      const newFields = [...formData.fields];
                      newFields[idx].prompt = e.target.value;
                      handleChange("fields", newFields);
                    }}
                    className="w-full bg-surface border border-line rounded px-2 py-1 text-ink text-[11px]"
                  />
                  {f.type === "custom" && (
                    <input
                      type="text"
                      placeholder="ID en Atom (vacío = crear nuevo)"
                      value={f.atomExistId || ""}
                      onChange={(e) => {
                        const newFields = [...formData.fields];
                        newFields[idx].atomExistId = e.target.value;
                        handleChange("fields", newFields);
                      }}
                      className="w-full bg-surface border border-line rounded px-2 py-1 text-ink font-mono text-[10px]"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Integration Node */}
        {node.type === "integration" && (
          <div className="space-y-3 bg-warning-soft p-3.5 rounded-xl border border-warning/30">
            <span className="font-bold text-warning block text-xs">🔌 Configuración de Integración HTTP</span>
            <div>
              <label className="block text-[11px] font-bold text-ink-soft mb-1">Sistema Conectado (CRM / Pasarela / BD):</label>
              <input
                type="text"
                value={formData.systemName || ""}
                onChange={(e) => handleChange("systemName", e.target.value)}
                placeholder="ej: HubSpot, Shopify, Stripe, PostgreSQL"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-ink-soft mb-1">URL / Endpoint HTTP:</label>
                <input
                  type="text"
                  value={formData.endpoint || ""}
                  onChange={(e) => handleChange("endpoint", e.target.value)}
                  placeholder="https://api.empresa.com/v1/..."
                  className={`${inputClass} font-mono text-[11px]`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-ink-soft mb-1">Método:</label>
                <select
                  value={formData.httpMethod || "POST"}
                  onChange={(e) => handleChange("httpMethod", e.target.value)}
                  className={inputClass}
                >
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>DELETE</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-ink-soft mb-1">Variable donde se guarda la respuesta:</label>
              <input
                type="text"
                value={formData.saveVariable || ""}
                onChange={(e) => handleChange("saveVariable", e.target.value)}
                placeholder="var_respuesta_api"
                className={`${inputClass} font-mono text-[11px]`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-ink-soft mb-1">
                Mensaje de Fallback (Error Empático — Imperativo Skill §6):
              </label>
              <textarea
                rows={2}
                value={formData.errorFallbackMessage || ""}
                onChange={(e) => handleChange("errorFallbackMessage", e.target.value)}
                placeholder="En este momento no pudimos acceder al sistema. Te derivamos con un asesor..."
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* 5. Human Node */}
        {node.type === "human" && (
          <div className="space-y-3 bg-surface p-3.5 rounded-xl border border-line">
            <span className="font-bold text-heading block text-xs">🧑‍💼 Asignación a Asesor Humano</span>
            <div>
              <label className="block text-[11px] font-bold text-ink-soft mb-1">Grupo / Equipo destino:</label>
              <input
                type="text"
                value={formData.groupName || ""}
                onChange={(e) => handleChange("groupName", e.target.value)}
                placeholder="ej: Mesa de Ventas, Soporte N1"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-ink-soft mb-1">Horario de atención y zona horaria:</label>
              <input
                type="text"
                value={formData.schedule || ""}
                onChange={(e) => handleChange("schedule", e.target.value)}
                placeholder="L - V 8:00 AM - 6:00 PM (GMT-5)"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-ink-soft mb-1">Mensaje de transición:</label>
              <textarea
                rows={2}
                value={formData.transitionMessage || ""}
                onChange={(e) => handleChange("transitionMessage", e.target.value)}
                placeholder="Te comunico con uno de nuestros asesores..."
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* 6. Stage Node */}
        {node.type === "stage" && (
          <div className="space-y-3 bg-success-soft p-3.5 rounded-xl border border-success/30">
            <span className="font-bold text-success block text-xs">🎯 Etapa de Venta (solo rutas comerciales)</span>
            <select
              value={formData.salesStage || "Lead"}
              onChange={(e) => handleChange("salesStage", e.target.value)}
              className={inputClass}
            >
              <option>Awareness</option>
              <option>Lead</option>
              <option>MQL</option>
              <option>SQL</option>
            </select>
            <p className="text-[10px] text-ink-soft">
              Orden fijo del funnel Atom: Awareness → Lead → MQL → SQL. Nunca en ramas de servicio.
            </p>
          </div>
        )}

        {/* 7. Closing / Tipificación Node */}
        {node.type === "closing" && (
          <div className="space-y-3 bg-danger-soft p-3.5 rounded-xl border border-danger/30">
            <span className="font-bold text-danger block text-xs">⏹ Cierre / Tipificación</span>
            <div>
              <label className="block text-[11px] font-bold text-ink-soft mb-1">Nombre Tipificación (≤20ch):</label>
              <input
                type="text"
                value={formData.typificationName || ""}
                onChange={(e) => handleChange("typificationName", e.target.value)}
                placeholder="Venta Cerrada"
                className={inputClass}
              />
              {formData.typificationName && formData.typificationName.length > 20 && (
                <p className="text-[10px] text-danger font-bold mt-1">⚠️ Máximo 20 caracteres en Atom</p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold text-ink-soft mb-1">Descripción de Cierre:</label>
              <textarea
                rows={2}
                value={formData.typificationDesc || ""}
                onChange={(e) => handleChange("typificationDesc", e.target.value)}
                placeholder="Explicación del motivo de cierre para el reporte..."
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-ink-soft mb-1">ID en Atom (vacío = crear nueva):</label>
              <input
                type="text"
                value={formData.atomTipificationId || ""}
                onChange={(e) => handleChange("atomTipificationId", e.target.value)}
                placeholder="eBoZsZJ9WaSunlSOua19"
                className={`${inputClass} font-mono text-[10px]`}
              />
            </div>
          </div>
        )}

        {/* COMMENTS SECTION */}
        <div className="pt-4 border-t border-line space-y-3">
          <span className="font-bold text-heading text-xs flex items-center justify-between">
            <span>💬 Comentarios y Acuerdos</span>
            <span className="text-[10px] text-ink-soft font-semibold">{comments.length} notas</span>
          </span>

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {comments.map((cmt) => (
              <div key={cmt.id} className="p-2.5 rounded-lg bg-surface border border-line text-[11px] space-y-1">
                <div className="flex justify-between items-center text-ink-soft text-[10px]">
                  <span className="font-bold text-primary flex items-center gap-1">
                    <User className="w-3 h-3" /> {cmt.author_name}
                  </span>
                  <span>{new Date(cmt.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="text-ink font-medium">{cmt.body}</p>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-[11px] text-ink-soft italic text-center py-2">
                Sin comentarios aún. Agrega una nota de acuerdo durante la llamada.
              </p>
            )}
          </div>

          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Escribe una observación o acuerdo..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="flex-1 bg-card border border-line rounded-lg px-3 py-1.5 text-ink text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Delete Node */}
        <div className="pt-4 border-t border-line">
          <button
            type="button"
            onClick={() => onDeleteNode(node.id)}
            className="w-full py-2 bg-danger-soft hover:bg-danger hover:text-white text-danger font-bold rounded-lg border border-danger/30 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Eliminar Nodo del Canvas
          </button>
        </div>
      </div>
    </div>
  );
};
