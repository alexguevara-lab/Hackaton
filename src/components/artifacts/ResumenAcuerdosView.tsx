import React, { useState, useEffect } from "react";
import { CheckCircle2, FileText, Printer, Share2, Sparkles, UserCheck, ShieldCheck } from "lucide-react";
import confetti from "canvas-confetti";
import { Project, DiagramGraph, KickoffItem } from "../../types";
import { aiFetch } from "../../lib/aiConfig";

interface ResumenAcuerdosViewProps {
  project: Project;
  graph: DiagramGraph;
  kickoffItems: KickoffItem[];
  version: number;
}

export const ResumenAcuerdosView: React.FC<ResumenAcuerdosViewProps> = ({
  project,
  graph,
  kickoffItems,
  version,
}) => {
  const [contentMd, setContentMd] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [clientSignerName, setClientSignerName] = useState<string>("");

  const handleGenerateResumen = async () => {
    setIsLoading(true);
    try {
      const data = await aiFetch("/api/ai/generate-resumen", {
        clientName: project.client_name,
        version,
        graph,
        kickoffItems,
      });
      if (data.contentMd) setContentMd(data.contentMd);
    } catch (err) {
      console.error("Failed to generate Resumen", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleGenerateResumen();
  }, [project.id, version]);

  const handleSignAgreement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientSignerName.trim()) return;

    setConfirmed(true);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

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
              Resumen de Acuerdos de Flujo — {project.client_name} (v{version})
            </h2>
            <p className="text-xs text-ink-soft font-medium">
              Documento de confirmación ejecutivo para aprobación del cliente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white border border-line hover:bg-surface text-ink font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-primary" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        {/* Left: Summary Markdown */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-line p-6 overflow-y-auto leading-relaxed text-sm text-ink shadow-lg space-y-4">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-3 text-ink-soft py-12">
              <Sparkles className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm font-bold text-ink">Redactando resumen de acuerdos en lenguaje de negocio...</p>
            </div>
          ) : (
            <div className="prose prose max-w-none text-xs space-y-3">
              <div className="p-5 rounded-xl bg-surface border border-line text-ink">
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-ink font-medium">{contentMd}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Right: Client Confirmation / Signature Panel */}
        <div className="bg-white rounded-2xl border border-line p-6 flex flex-col justify-between shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <ShieldCheck className="w-5 h-5 text-success" />
              <h3 className="font-bold text-heading text-sm">Conformidad del Cliente</h3>
            </div>

            <p className="text-xs text-ink-soft font-medium">
              Al confirmar este resumen, se aprueba la arquitectura del bot (v{version}) para proceder con la habilitación técnica en Atom.
            </p>

            {confirmed ? (
              <div className="p-4 rounded-xl bg-success-soft border border-success/30 space-y-2 text-center shadow-xs">
                <CheckCircle2 className="w-10 h-10 text-success mx-auto" />
                <h4 className="font-bold text-success text-sm">¡Acuerdo Aprobado y Firmado!</h4>
                <p className="text-xs text-success font-medium">
                  Firmado por: <span className="font-bold">{clientSignerName}</span> el {new Date().toLocaleDateString()}
                </p>
                <p className="text-[10px] text-success uppercase font-mono font-bold">Estado: Aprobado para Construcción</p>
              </div>
            ) : (
              <form onSubmit={handleSignAgreement} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Nombre del Cliente / Representante:</label>
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
            AtomScope Hackathon Build • Powered by Atom Onboarding
          </div>
        </div>
      </div>
    </div>
  );
};
