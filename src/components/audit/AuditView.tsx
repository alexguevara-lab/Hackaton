import React from "react";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  Wand2,
  RefreshCw,
  ArrowRight,
  Zap,
} from "lucide-react";
import { AuditResult, AuditGap, Project } from "../../types";

interface AuditViewProps {
  project: Project;
  auditResult: AuditResult | null;
  auditError?: string;
  isRunningAudit: boolean;
  isAutoFixing?: boolean;
  onRunAudit: () => void;
  onSelectNodeInCanvas: (nodeId: string) => void;
  onAutoFixGap?: (gap: AuditGap) => void;
  onAutoFixAll?: (gaps: AuditGap[]) => void;
}

export const AuditView: React.FC<AuditViewProps> = ({
  auditResult,
  auditError,
  isRunningAudit,
  isAutoFixing,
  onRunAudit,
  onSelectNodeInCanvas,
  onAutoFixGap,
  onAutoFixAll,
}) => {
  const fixableGaps = (auditResult?.gaps || []).filter((g) => g.severity !== "info");
  return (
    <div className="h-full bg-white border-l border-line p-6 text-xs text-ink flex flex-col overflow-y-auto shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-line">
        <div>
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
            Auditoría de Completitud
          </span>
          <h3 className="text-base font-bold text-heading flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <span>Validación de Reglas de Skill Atom</span>
          </h3>
        </div>

        <button
          onClick={onRunAudit}
          disabled={isRunningAudit}
          className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-line text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-md"
        >
          {isRunningAudit ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Wand2 className="w-3.5 h-3.5" />
          )}
          <span>{isRunningAudit ? "Auditando..." : "Re-auditar Flujo"}</span>
        </button>
      </div>

      {/* Error de IA (key/modelo) */}
      {auditError && (
        <div className="mb-4 p-3 rounded-xl bg-danger-soft border border-danger/30 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <p className="text-[11px] text-danger font-medium">{auditError}</p>
        </div>
      )}

      {/* Audit Score Hero */}
      {auditResult ? (
        <div className="space-y-5">
          <div
            className={`p-5 rounded-2xl border flex items-center justify-between shadow-xs ${
              auditResult.score >= 90
                ? "bg-success-soft border-success/30"
                : auditResult.score >= 70
                ? "bg-warning-soft border-warning/30"
                : "bg-danger-soft border-danger/30"
            }`}
          >
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-ink-soft">Puntaje de Completitud</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-heading">{auditResult.score}%</span>
                <span className="text-xs text-ink-soft font-bold">/ 100%</span>
              </div>
              <p className="text-[11px] text-ink font-medium">
                {auditResult.isReady
                  ? "✓ Flujo listo para ser traducido a la Ficha Técnica de Atom."
                  : "⚠️ Existen brechas bloqueantes que deben resolverse antes del pase a producción."}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-line text-center shadow-sm">
              {auditResult.isReady ? (
                <ShieldCheck className="w-8 h-8 text-success mx-auto" />
              ) : (
                <ShieldAlert className="w-8 h-8 text-warning mx-auto" />
              )}
              <span className="text-[10px] font-bold text-ink mt-1 block">
                {auditResult.isReady ? "LISTO" : "GAPS DETECTADOS"}
              </span>
            </div>
          </div>

          {/* Corregir todo con IA */}
          {fixableGaps.length > 0 && onAutoFixAll && (
            <button
              onClick={() => onAutoFixAll(fixableGaps)}
              disabled={isAutoFixing}
              className="w-full py-2.5 bg-primary hover:bg-primary-hover disabled:bg-line disabled:text-ink-soft text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
            >
              {isAutoFixing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              <span>
                {isAutoFixing
                  ? "Aplicando correcciones..."
                  : `Auto-corregir todo con IA (${fixableGaps.length})`}
              </span>
            </button>
          )}

          {/* Gaps List */}
          <div className="space-y-3">
            <span className="font-bold text-heading text-xs block">
              Hallazgos y Observaciones ({auditResult.gaps.length}):
            </span>

            {auditResult.gaps.map((gap, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border space-y-2.5 transition-all shadow-xs ${
                  gap.severity === "blocking"
                    ? "bg-danger-soft border-danger/30"
                    : gap.severity === "warning"
                    ? "bg-warning-soft border-warning/30"
                    : "bg-primary-soft border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      gap.severity === "blocking"
                        ? "bg-danger-soft text-danger"
                        : gap.severity === "warning"
                        ? "bg-warning-soft text-warning"
                        : "bg-primary-soft text-primary"
                    }`}
                  >
                    {gap.severity === "blocking" ? "Bloqueante" : gap.severity === "warning" ? "Advertencia" : "Info"}
                  </span>
                  <span className="text-[10px] text-ink-soft font-bold">{gap.category}</span>
                </div>

                <p className="font-bold text-heading text-xs">{gap.issue}</p>
                <p className="text-[11px] text-ink italic bg-white p-2.5 rounded-lg border border-line">
                  💡 Sugerencia: {gap.suggestion}
                </p>

                <div className="flex items-center justify-between pt-1">
                  {gap.nodeId ? (
                    <button
                      onClick={() => onSelectNodeInCanvas(gap.nodeId!)}
                      className="text-[10px] text-primary hover:underline flex items-center gap-1 font-bold"
                    >
                      <span>Ver Nodo en Canvas</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <span />
                  )}

                  {gap.severity !== "info" && onAutoFixGap && (
                    <button
                      onClick={() => onAutoFixGap(gap)}
                      disabled={isAutoFixing}
                      className="px-3 py-1 bg-primary hover:bg-primary-hover disabled:bg-line disabled:text-ink-soft text-white font-bold rounded text-[10px] flex items-center gap-1 shadow-xs"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Corregir con IA</span>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {auditResult.gaps.length === 0 && (
              <div className="p-8 text-center bg-surface rounded-xl border border-line space-y-2">
                <CheckCircle className="w-10 h-10 text-success mx-auto" />
                <h4 className="font-bold text-heading text-sm">¡Auditoría Perfecta!</h4>
                <p className="text-ink-soft text-xs">
                  No se detectaron brechas o inconsistencias. El flujo cumple con todas las reglas de la Skill de Atom.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
          <ShieldAlert className="w-12 h-12 text-ink-soft" />
          <h4 className="font-bold text-ink text-sm">Auditoría no ejecutada aún</h4>
          <p className="text-ink-soft text-xs max-w-xs">
            Haz clic en "Re-auditar Flujo" para evaluar automáticamente las reglas de la Skill de Atom sobre tu diagrama visual.
          </p>
        </div>
      )}
    </div>
  );
};
