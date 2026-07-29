import React from "react";
import {
  MessageSquare,
  Brain,
  FileCheck2,
  Zap,
  GitFork,
  UserCheck,
  StopCircle,
  Target,
  FileText,
  Layers,
  Monitor,
  Plus,
  FileCode,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Send,
  Cloud,
  Check,
  RotateCcw,
} from "lucide-react";
import { CustomNodeType, DiagramVersion, VersionStatus } from "../../types";

interface CanvasToolbarProps {
  onAddNode: (type: CustomNodeType) => void;
  versions: DiagramVersion[];
  currentVersion: DiagramVersion | undefined;
  onSelectVersion: (version: DiagramVersion) => void;
  onCreateNewVersion: () => void;
  onChangeVersionStatus: (status: VersionStatus) => void;
  saveStatus: "idle" | "saving" | "saved";
  isPresentationMode: boolean;
  onTogglePresentationMode: () => void;
  onRunAudit: () => void;
  onGenerateFicha: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  auditScore?: number;
}

const STATUS_META: Record<VersionStatus, { label: string; cls: string }> = {
  draft: { label: "Borrador", cls: "bg-line text-ink-soft" },
  in_review: { label: "En revisión", cls: "bg-warning-soft text-warning" },
  approved: { label: "Aprobado", cls: "bg-success-soft text-success" },
};

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onAddNode,
  versions,
  currentVersion,
  onSelectVersion,
  onCreateNewVersion,
  onChangeVersionStatus,
  saveStatus,
  isPresentationMode,
  onTogglePresentationMode,
  onRunAudit,
  onGenerateFicha,
  onToggleChat,
  isChatOpen,
  auditScore,
}) => {
  const status: VersionStatus = currentVersion?.status || "draft";
  const statusMeta = STATUS_META[status];
  const nodeButtons: { type: CustomNodeType; label: string; icon: React.ReactNode; color: string }[] = [
    { type: "message", label: "Mensaje", icon: <MessageSquare className="w-4 h-4" />, color: "bg-primary hover:bg-primary-hover text-white" },
    { type: "orchestrator", label: "Smarton", icon: <Brain className="w-4 h-4" />, color: "bg-heading hover:bg-ink text-white" },
    { type: "capture", label: "Captura", icon: <FileCheck2 className="w-4 h-4" />, color: "bg-primary hover:bg-primary-hover text-white" },
    { type: "integration", label: "Integración", icon: <Zap className="w-4 h-4" />, color: "bg-warning hover:bg-primary text-white" },
    { type: "decision", label: "Condición", icon: <GitFork className="w-4 h-4" />, color: "bg-heading hover:bg-ink text-white" },
    { type: "human", label: "Asesor", icon: <UserCheck className="w-4 h-4" />, color: "bg-heading hover:bg-ink text-white" },
    { type: "stage", label: "Etapa Venta", icon: <Target className="w-4 h-4" />, color: "bg-success hover:bg-success/80 text-white" },
    { type: "closing", label: "Cierre", icon: <StopCircle className="w-4 h-4" />, color: "bg-danger hover:bg-danger/80 text-white" },
    { type: "note", label: "Nota", icon: <FileText className="w-4 h-4" />, color: "bg-primary-soft text-primary border border-primary/30 hover:bg-primary hover:text-white" },
  ];

  return (
    <>
      {/* PALETA DE NODOS — VERTICAL, IZQUIERDA */}
      <div className="absolute top-4 left-4 bottom-4 z-10 flex flex-col pointer-events-none">
        <div className="bg-card/95 backdrop-blur-md p-2 rounded-xl border border-line shadow-lg flex flex-col gap-1.5 pointer-events-auto overflow-y-auto">
          <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider px-1 pb-1 border-b border-line">
            Añadir
          </span>
          {nodeButtons.map((btn) => (
            <button
              key={btn.type}
              onClick={() => onAddNode(btn.type)}
              className={`px-2.5 py-2 rounded-lg text-[11px] font-bold flex items-center gap-2 transition-all active:scale-95 shadow-xs ${btn.color}`}
              title={`Agregar nodo ${btn.label}`}
            >
              {btn.icon}
              <span className="hidden lg:inline whitespace-nowrap">{btn.label}</span>
            </button>
          ))}

          {/* Versiones */}
          <div className="mt-1 pt-2 border-t border-line flex flex-col gap-1">
            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider px-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-primary" />
              <span className="hidden lg:inline">Versión</span>
            </span>
            <div className="flex items-center gap-1">
              <select
                value={currentVersion?.id || ""}
                onChange={(e) => {
                  const selected = versions.find((v) => v.id === e.target.value);
                  if (selected) onSelectVersion(selected);
                }}
                className="flex-1 min-w-0 bg-surface border border-line rounded-lg px-1.5 py-1 text-[10px] text-heading font-bold focus:outline-none cursor-pointer"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id} className="bg-card text-heading">
                    v{v.version}
                  </option>
                ))}
              </select>
              <button
                onClick={onCreateNewVersion}
                className="p-1 hover:bg-primary-soft rounded text-primary transition-colors shrink-0"
                title="Crear nueva versión vN"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BARRA SUPERIOR CENTRAL — ESTATUS DE VERSIÓN + AUTOGUARDADO + APROBAR */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 pointer-events-none">
        <div className="bg-card/95 backdrop-blur-md p-1.5 rounded-xl border border-line shadow-lg flex items-center gap-2 pointer-events-auto">
          {/* Estatus de la versión */}
          <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider pl-1">
            {currentVersion ? `v${currentVersion.version}` : "—"}
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusMeta.cls}`}>
            {statusMeta.label}
          </span>

          {/* Indicador de autoguardado */}
          <span
            className={`flex items-center gap-1 text-[10px] font-semibold pr-1 ${
              saveStatus === "saving" ? "text-warning" : saveStatus === "saved" ? "text-success" : "text-ink-soft"
            }`}
            title="Estado del autoguardado"
          >
            {saveStatus === "saving" ? (
              <>
                <Cloud className="w-3.5 h-3.5 animate-pulse" />
                <span className="hidden lg:inline">Guardando…</span>
              </>
            ) : saveStatus === "saved" ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Guardado</span>
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Autoguardado</span>
              </>
            )}
          </span>

          {/* Acciones de estatus */}
          <div className="flex items-center gap-1 border-l border-line pl-2">
            {status === "draft" && (
              <button
                onClick={() => onChangeVersionStatus("in_review")}
                className="px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 bg-warning-soft text-warning hover:bg-warning hover:text-white transition-all"
                title="Enviar la versión a revisión"
              >
                <Send className="w-3 h-3" />
                <span className="hidden lg:inline">A revisión</span>
              </button>
            )}
            {status !== "approved" ? (
              <button
                onClick={() => onChangeVersionStatus("approved")}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 bg-success text-white hover:bg-success/80 transition-all shadow-sm"
                title="Aprobar esta versión del flujo"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Aprobar versión</span>
              </button>
            ) : (
              <button
                onClick={() => onChangeVersionStatus("draft")}
                className="px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 bg-surface text-ink-soft border border-line hover:text-primary transition-all"
                title="Reabrir la versión como borrador"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden lg:inline">Reabrir</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BARRA SUPERIOR — SOLO AUDITAR / FICHA / PANTALLA COMPARTIDA / IA */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 pointer-events-none">
        <div className="bg-card/95 backdrop-blur-md p-1.5 rounded-xl border border-line shadow-lg flex items-center gap-2 pointer-events-auto">
          {/* Asistente IA */}
          <button
            onClick={onToggleChat}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border ${
              isChatOpen
                ? "bg-primary text-white border-primary shadow-md"
                : "bg-primary-soft text-primary border-primary/30 hover:bg-primary/20"
            }`}
            title="Chat IA con contexto del proyecto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Asistente IA</span>
          </button>

          {/* Audit Button */}
          <button
            onClick={onRunAudit}
            className="px-3 py-1.5 bg-surface hover:bg-primary-soft text-heading hover:text-primary border border-line rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Auditar Flow</span>
            {auditScore !== undefined && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${auditScore >= 80 ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
                {auditScore}%
              </span>
            )}
          </button>

          {/* Ficha Button */}
          <button
            onClick={onGenerateFicha}
            className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Ficha Técnica</span>
          </button>

          {/* Presentation Mode Toggle */}
          <button
            onClick={onTogglePresentationMode}
            className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all ${
              isPresentationMode
                ? "bg-heading text-white border-heading shadow-md"
                : "bg-surface text-ink border-line hover:bg-primary-soft hover:text-primary"
            }`}
            title="Modo Pantalla Compartida con Cliente"
          >
            <Monitor className="w-4 h-4" />
            <span className="hidden lg:inline">{isPresentationMode ? "Modo Cliente ON" : "Pantalla Compartida"}</span>
          </button>
        </div>
      </div>
    </>
  );
};
