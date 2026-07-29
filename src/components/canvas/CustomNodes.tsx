import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import {
  Play,
  MessageSquare,
  Brain,
  FileCheck2,
  Zap,
  GitFork,
  UserCheck,
  StopCircle,
  Target,
  CornerUpRight,
  FileText,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";
import { CustomNodeData } from "../../types";

// Base Wrapper for Canvas Nodes
const NodeCard: React.FC<{
  badgeBg: string;
  badgeText: string;
  icon: React.ReactNode;
  data: CustomNodeData;
  selected?: boolean;
  children?: React.ReactNode;
}> = ({ badgeBg, badgeText, icon, data, selected, children }) => {
  return (
    <div
      className={`min-w-[220px] max-w-[280px] bg-card rounded-xl border-2 transition-all duration-200 shadow-md hover:shadow-xl ${
        selected ? "border-primary ring-2 ring-primary/20 scale-102" : "border-line hover:border-ink-soft/40"
      }`}
    >
      {/* Node Header */}
      <div className="px-3 py-2 border-b border-line flex items-center justify-between gap-2 bg-surface rounded-t-xl">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className={`p-1.5 rounded-lg text-white ${badgeBg} shadow-xs shrink-0`}>
            {icon}
          </div>
          <span className="text-xs font-bold text-heading truncate">{data.label}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {data.hasWarnings && (
            <span className="p-1 rounded bg-warning-soft text-warning border border-warning/30 text-[10px] font-bold flex items-center gap-0.5" title={data.warningText || "Incompleto"}>
              <AlertTriangle className="w-3 h-3" />
            </span>
          )}
          {data.commentsCount && data.commentsCount > 0 ? (
            <span className="px-1.5 py-0.5 rounded bg-primary-soft text-primary border border-primary/30 text-[10px] font-semibold flex items-center gap-1">
              <MessageCircle className="w-2.5 h-2.5" />
              {data.commentsCount}
            </span>
          ) : null}
        </div>
      </div>

      {/* Node Content */}
      <div className="p-3 text-xs text-ink space-y-2">{children}</div>
    </div>
  );
};

// 1. Start Node
export const StartNode = memo(({ data, selected }: NodeProps<any>) => {
  return (
    <div className="relative group">
      <Handle type="source" position={Position.Bottom} className="!bg-success !w-3 !h-3" />
      <NodeCard
        badgeBg="bg-success"
        badgeText="Inicio"
        icon={<Play className="w-3.5 h-3.5" />}
        data={data}
        selected={selected}
      >
        <p className="text-success font-bold text-[11px]">Inbound WhatsApp Business</p>
        <p className="text-ink-soft text-[11px]">{data.description || "Entrada de mensajes del usuario"}</p>
      </NodeCard>
    </div>
  );
});

// 2. Message Node
export const MessageNode = memo(({ data, selected }: NodeProps<any>) => {
  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3" />
      <NodeCard
        badgeBg="bg-primary"
        badgeText="Mensaje"
        icon={<MessageSquare className="w-3.5 h-3.5" />}
        data={data}
        selected={selected}
      >
        <div className="bg-surface p-2 rounded-lg border border-line text-[11px] text-ink line-clamp-3">
          {data.messageText || "Sin texto configurado"}
        </div>
        {data.buttons && data.buttons.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] text-ink-soft uppercase font-semibold">Botones / Respuestas:</span>
            <div className="flex flex-wrap gap-1">
              {data.buttons.map((btn: any) => (
                <span
                  key={btn.id}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                    btn.label.length > 20
                      ? "bg-danger-soft text-danger border-danger/30"
                      : "bg-primary-soft text-heading border-line"
                  }`}
                >
                  {btn.label} {btn.label.length > 20 && "⚠️ (>20ch)"}
                </span>
              ))}
            </div>
          </div>
        )}
      </NodeCard>
    </div>
  );
});

// 3. Orchestrator Node (Smarton)
export const OrchestratorNode = memo(({ data, selected }: NodeProps<any>) => {
  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-heading !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-heading !w-3 !h-3" />
      <NodeCard
        badgeBg="bg-heading"
        badgeText="Orquestador"
        icon={<Brain className="w-3.5 h-3.5" />}
        data={data}
        selected={selected}
      >
        <div className="flex items-center justify-between text-[10px] bg-primary-soft text-heading px-2 py-1 rounded border border-line font-semibold">
          <span>Smarton Generic IA</span>
          <span className="font-bold text-primary">⏱️ {data.noAnswerMinutes || 30} min</span>
        </div>
        {data.intents && data.intents.length > 0 ? (
          <div className="space-y-1">
            <span className="text-[10px] text-ink-soft uppercase font-semibold">Intenciones ({data.intents.length}):</span>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {data.intents.map((intent: any) => (
                <div key={intent.id} className="p-1.5 rounded bg-surface border border-line flex justify-between items-center text-[10px]">
                  <span className="text-heading font-semibold truncate">{intent.name}</span>
                  {intent.isSalesBranch ? (
                    <span className="px-1 bg-success-soft text-success text-[9px] font-bold rounded border border-success/30">Venta</span>
                  ) : (
                    <span className="px-1 bg-line text-ink-soft text-[9px] font-semibold rounded">Servicio</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-warning text-[10px] font-semibold italic">⚠️ Faltan intenciones por definir</p>
        )}
      </NodeCard>
    </div>
  );
});

// 4. Capture Data Node
export const CaptureNode = memo(({ data, selected }: NodeProps<any>) => {
  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3" />
      <NodeCard
        badgeBg="bg-primary"
        badgeText="Captura"
        icon={<FileCheck2 className="w-3.5 h-3.5" />}
        data={data}
        selected={selected}
      >
        <span className="text-[10px] text-primary font-bold block">smarton_save_fields</span>
        {data.fields && data.fields.length > 0 ? (
          <div className="space-y-1">
            {data.fields.map((f: any, idx: number) => (
              <div key={idx} className="p-1 rounded bg-surface border border-line text-[10px] text-ink">
                <span className="font-mono font-bold text-primary">{f.name}</span>
                <p className="text-[10px] text-ink-soft truncate">{f.prompt}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-ink-soft text-[10px]">Sin campos asignados</p>
        )}
      </NodeCard>
    </div>
  );
});

// 5. Integration Node (HTTP/CRM)
export const IntegrationNode = memo(({ data, selected }: NodeProps<any>) => {
  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-warning !w-3 !h-3" />
      <Handle type="source" id="success" position={Position.Bottom} className="!bg-success !w-3 !h-3 !left-1/3" />
      <Handle type="source" id="error" position={Position.Bottom} className="!bg-danger !w-3 !h-3 !left-2/3" />
      <NodeCard
        badgeBg="bg-warning"
        badgeText="Integración"
        icon={<Zap className="w-3.5 h-3.5" />}
        data={data}
        selected={selected}
      >
        <div className="flex items-center justify-between bg-warning-soft p-1.5 rounded border border-warning/30">
          <span className="font-bold text-heading text-[11px]">{data.systemName || "API External"}</span>
          <span className="px-1 bg-warning text-white text-[9px] font-mono font-bold rounded">{data.httpMethod || "POST"}</span>
        </div>
        <p className="font-mono text-[10px] text-ink-soft truncate">{data.endpoint || "https://api..."}</p>
        {data.errorFallbackMessage ? (
          <div className="text-[9px] bg-success-soft text-success p-1 rounded border border-success/30 font-semibold">
            ✓ Fallback empático configurado
          </div>
        ) : (
          <div className="text-[9px] bg-danger-soft text-danger p-1 rounded border border-danger/30 font-bold">
            ⚠️ Falta rama de manejo de error
          </div>
        )}
      </NodeCard>
    </div>
  );
});

// 6. Decision Node
export const DecisionNode = memo(({ data, selected }: NodeProps<any>) => {
  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-heading !w-3 !h-3" />
      <Handle type="source" id="true" position={Position.Left} className="!bg-success !w-3 !h-3" />
      <Handle type="source" id="false" position={Position.Right} className="!bg-danger !w-3 !h-3" />
      <NodeCard
        badgeBg="bg-heading"
        badgeText="Condición"
        icon={<GitFork className="w-3.5 h-3.5" />}
        data={data}
        selected={selected}
      >
        <p className="text-[11px] text-heading font-bold">{data.label}</p>
        <p className="text-[10px] text-ink-soft">{data.description || "Evalúa expresión o variable"}</p>
      </NodeCard>
    </div>
  );
});

// 7. Human Agent Node
export const HumanNode = memo(({ data, selected }: NodeProps<any>) => {
  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-heading !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-heading !w-3 !h-3" />
      <NodeCard
        badgeBg="bg-heading"
        badgeText="Asesor Humano"
        icon={<UserCheck className="w-3.5 h-3.5" />}
        data={data}
        selected={selected}
      >
        <p className="text-heading font-bold text-[11px]">{data.groupName || "Mesa de Atención"}</p>
        <p className="text-ink-soft text-[10px]">⏰ {data.schedule || "L - V 8:00 AM - 6:00 PM"}</p>
      </NodeCard>
    </div>
  );
});

// 8. Closing Node (Tipificación)
export const ClosingNode = memo(({ data, selected }: NodeProps<any>) => {
  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-danger !w-3 !h-3" />
      <NodeCard
        badgeBg="bg-danger"
        badgeText="Cierre"
        icon={<StopCircle className="w-3.5 h-3.5" />}
        data={data}
        selected={selected}
      >
        <div className="bg-danger-soft p-2 rounded border border-danger/30">
          <span className="text-danger font-bold text-[11px] block">{data.typificationName || "Tipificación Cierre"}</span>
          <span className="text-ink-soft text-[10px] block truncate">{data.typificationDesc || "Motivo de finalización del chat"}</span>
        </div>
      </NodeCard>
    </div>
  );
});

// 9. Sales Stage Node
export const StageNode = memo(({ data, selected }: NodeProps<any>) => {
  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-success !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-success !w-3 !h-3" />
      <NodeCard
        badgeBg="bg-success"
        badgeText="Etapa Venta"
        icon={<Target className="w-3.5 h-3.5" />}
        data={data}
        selected={selected}
      >
        <div className="bg-success-soft text-success font-bold px-2 py-1 rounded text-center border border-success/30 text-xs uppercase tracking-wider">
          🎯 {data.salesStage || "Lead"}
        </div>
        <p className="text-ink-soft text-[10px]">{data.description || "Solo aplica a ramas de venta"}</p>
      </NodeCard>
    </div>
  );
});

// 10. Jump Node
export const JumpNode = memo(({ data, selected }: NodeProps<any>) => {
  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-ink-soft !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-ink-soft !w-3 !h-3" />
      <NodeCard
        badgeBg="bg-ink-soft"
        badgeText="Ir a..."
        icon={<CornerUpRight className="w-3.5 h-3.5" />}
        data={data}
        selected={selected}
      >
        <p className="text-ink text-[11px] font-mono">jump_start → {data.label}</p>
      </NodeCard>
    </div>
  );
});

// 11. Note Node
export const NoteNode = memo(({ data, selected }: NodeProps<any>) => {
  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3" />
      <div className={`w-[200px] bg-primary-soft border-2 border-primary/40 rounded-xl p-3 text-heading text-xs shadow-md ${selected ? "ring-2 ring-primary/30" : ""}`}>
        <div className="flex items-center gap-1 font-bold mb-1 text-primary">
          <FileText className="w-3.5 h-3.5" />
          <span>{data.label || "Comentario Kickoff"}</span>
        </div>
        <p className="text-[11px] italic text-ink">{data.description || "Acuerdo puntual o duda con el cliente"}</p>
      </div>
    </div>
  );
});

export const nodeTypes = {
  start: StartNode,
  message: MessageNode,
  orchestrator: OrchestratorNode,
  capture: CaptureNode,
  integration: IntegrationNode,
  decision: DecisionNode,
  human: HumanNode,
  closing: ClosingNode,
  stage: StageNode,
  jump: JumpNode,
  note: NoteNode,
};
