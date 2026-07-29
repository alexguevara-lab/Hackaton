import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Printer,
  Sparkles,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Ban,
  Clock,
  ArrowRight,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Project, DiagramGraph, KickoffItem, DocumentItem, VersionStatus } from "../../types";
import { aiFetch } from "../../lib/aiConfig";

interface AgreementSection {
  title: string;
  points: string[];
}
interface Agreement {
  title?: string;
  clientName?: string;
  intro?: string;
  sections?: AgreementSection[];
  exclusions?: string[];
  pending?: string[];
  nextSteps?: string[];
}

interface ResumenAcuerdosViewProps {
  project: Project;
  graph: DiagramGraph;
  kickoffItems: KickoffItem[];
  version: number;
  versionLabel?: string;
  versionStatus?: VersionStatus;
  documents?: DocumentItem[];
}

export const ResumenAcuerdosView: React.FC<ResumenAcuerdosViewProps> = ({
  project,
  graph,
  kickoffItems,
  version,
  versionLabel,
  versionStatus = "draft",
  documents = [],
}) => {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [clientSignerName, setClientSignerName] = useState<string>("");

  const answeredCount = kickoffItems.filter((k) => k.status === "answered").length;

  const handleGenerate = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await aiFetch("/api/ai/generate-resumen", {
        clientName: project.client_name,
        version,
        versionLabel,
        versionStatus,
        graph,
        kickoffItems,
        documents: documents.map((d) => ({
          file_name: d.file_name,
          extracted_text: d.extracted_text,
        })),
      });
      if (data.error) {
        setError(data.error);
      } else if (data.agreement) {
        setAgreement(data.agreement);
      }
    } catch (err) {
      console.error("Failed to generate Resumen", err);
      setError("No se pudo conectar con el servidor de IA.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, version]);

  const handleSignAgreement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientSignerName.trim()) return;
    setConfirmed(true);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  let sectionNo = 0;

  return (
    <div className="h-full bg-surface p-6 flex flex-col text-ink overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-line shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-md"
            style={{ backgroundColor: project.brand_color || "#FF5A00" }}
          >
            {project.client_name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-heading">
              Documento de Acuerdos — {project.client_name} (v{version})
            </h2>
            <p className="text-xs text-ink-soft font-medium">
              Basado en los documentos cargados, las preguntas resueltas y la versión del flujo aprobado
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="px-3 py-1.5 bg-white border border-line hover:bg-surface text-ink font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
            <span>Regenerar</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white border border-line hover:bg-surface text-ink font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-primary" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Aviso de estatus de versión */}
      {versionStatus !== "approved" && (
        <div className="mt-3 p-3 rounded-xl bg-warning-soft border border-warning/30 flex items-start gap-2 shrink-0">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-[11px] text-ink">
            La versión del flujo está en <b>{versionStatus === "in_review" ? "revisión" : "borrador"}</b>. El
            acuerdo se genera sobre esta versión, pero para el documento final conviene{" "}
            <b>aprobar la versión</b> en el canvas antes de enviarlo al cliente.
          </p>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        {/* Left: Documento de acuerdos legible */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-line p-8 overflow-y-auto shadow-lg print:shadow-none">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-3 text-ink-soft py-12">
              <Sparkles className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm font-bold text-ink">Redactando el documento de acuerdos...</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center space-y-2 text-center py-12">
              <AlertTriangle className="w-8 h-8 text-danger" />
              <p className="text-sm font-bold text-heading">No se pudo generar el acuerdo</p>
              <p className="text-xs text-ink-soft max-w-xs">{error}</p>
            </div>
          ) : agreement ? (
            <div className="space-y-6 max-w-2xl">
              {/* Encabezado del documento */}
              <div className="border-b border-line pb-4">
                <h1 className="text-xl font-extrabold text-heading">
                  {agreement.title || `Documento de Acuerdos — ${project.client_name}`}
                </h1>
                <p className="text-[11px] text-ink-soft mt-1">
                  {project.client_name} · Versión {version}
                  {versionLabel ? ` (${versionLabel})` : ""} ·{" "}
                  {new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>

              {agreement.intro && (
                <p className="text-sm text-ink leading-relaxed">{agreement.intro}</p>
              )}

              {/* Secciones enumeradas (acciones pactadas) */}
              {agreement.sections && agreement.sections.length > 0 && (
                <div className="space-y-5">
                  {agreement.sections.map((sec, i) => {
                    sectionNo += 1;
                    return (
                      <div key={i}>
                        <h3 className="text-sm font-bold text-heading flex items-baseline gap-2">
                          <span className="text-primary">{sectionNo}.</span>
                          <span>{sec.title}</span>
                        </h3>
                        <ul className="mt-1.5 ml-6 space-y-1.5">
                          {sec.points.map((p, j) => (
                            <li key={j} className="text-[13px] text-ink leading-relaxed flex gap-2">
                              <span className="text-ink-soft shrink-0">{sectionNo}.{j + 1}</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Fuera de alcance */}
              {agreement.exclusions && agreement.exclusions.length > 0 && (
                <div className="pt-2">
                  <h3 className="text-sm font-bold text-heading flex items-center gap-2">
                    <Ban className="w-4 h-4 text-danger" /> Fuera de alcance
                  </h3>
                  <ul className="mt-1.5 ml-6 space-y-1">
                    {agreement.exclusions.map((p, j) => (
                      <li key={j} className="text-[13px] text-ink flex gap-2">
                        <span className="text-danger shrink-0">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pendientes */}
              {agreement.pending && agreement.pending.length > 0 && (
                <div className="pt-2">
                  <h3 className="text-sm font-bold text-heading flex items-center gap-2">
                    <Clock className="w-4 h-4 text-warning" /> Pendientes por definir
                  </h3>
                  <ul className="mt-1.5 ml-6 space-y-1">
                    {agreement.pending.map((p, j) => (
                      <li key={j} className="text-[13px] text-ink flex gap-2">
                        <span className="text-warning shrink-0">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Próximos pasos */}
              {agreement.nextSteps && agreement.nextSteps.length > 0 && (
                <div className="pt-2">
                  <h3 className="text-sm font-bold text-heading flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-primary" /> Próximos pasos
                  </h3>
                  <ul className="mt-1.5 ml-6 space-y-1">
                    {agreement.nextSteps.map((p, j) => (
                      <li key={j} className="text-[13px] text-ink flex gap-2">
                        <span className="text-primary shrink-0">→</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-ink-soft italic text-center py-12">
              Genera el documento de acuerdos con el botón “Regenerar”.
            </p>
          )}
        </div>

        {/* Right: Client Confirmation / Signature Panel */}
        <div className="bg-white rounded-2xl border border-line p-6 flex flex-col justify-between shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <ShieldCheck className="w-5 h-5 text-success" />
              <h3 className="font-bold text-heading text-sm">Conformidad del Cliente</h3>
            </div>

            <div className="text-[11px] text-ink-soft space-y-1.5">
              <p className="flex items-center justify-between">
                <span>Preguntas resueltas</span>
                <span className="font-bold text-heading">
                  {answeredCount}/{kickoffItems.length}
                </span>
              </p>
              <p className="flex items-center justify-between">
                <span>Documentos base</span>
                <span className="font-bold text-heading">{documents.length}</span>
              </p>
              <p className="flex items-center justify-between">
                <span>Estado de la versión</span>
                <span
                  className={`font-bold ${
                    versionStatus === "approved"
                      ? "text-success"
                      : versionStatus === "in_review"
                      ? "text-warning"
                      : "text-ink-soft"
                  }`}
                >
                  {versionStatus === "approved" ? "Aprobado" : versionStatus === "in_review" ? "En revisión" : "Borrador"}
                </span>
              </p>
            </div>

            <p className="text-xs text-ink-soft font-medium border-t border-line pt-3">
              Al confirmar este documento, el cliente aprueba la arquitectura del bot (v{version}) para
              proceder con la habilitación técnica en Atom.
            </p>

            {confirmed ? (
              <div className="p-4 rounded-xl bg-success-soft border border-success/30 space-y-2 text-center shadow-xs">
                <CheckCircle2 className="w-10 h-10 text-success mx-auto" />
                <h4 className="font-bold text-success text-sm">¡Acuerdo Aprobado y Firmado!</h4>
                <p className="text-xs text-success font-medium">
                  Firmado por: <span className="font-bold">{clientSignerName}</span> el{" "}
                  {new Date().toLocaleDateString()}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSignAgreement} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Nombre del Cliente / Representante:
                  </label>
                  <input
                    type="text"
                    required
                    value={clientSignerName}
                    onChange={(e) => setClientSignerName(e.target.value)}
                    placeholder="Ej: Carlos Mendoza (Líder Digital)"
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-heading text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-success hover:bg-success/80 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Aprobar y Confirmar Acuerdos (v{version})</span>
                </button>
              </form>
            )}
          </div>

          <div className="text-[10px] text-ink-soft font-medium text-center pt-4 border-t border-line">
            AtomScope · Documento generado desde el diagrama aprobado
          </div>
        </div>
      </div>
    </div>
  );
};
