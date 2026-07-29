import React, { useState } from "react";
import { FileCode, Copy, Download, RefreshCw, Check, Sparkles } from "lucide-react";
import { Project, DiagramGraph, KickoffItem, CommentItem } from "../../types";
import { aiFetch } from "../../lib/aiConfig";

interface FichaTecnicaViewProps {
  project: Project;
  graph: DiagramGraph;
  kickoffItems: KickoffItem[];
  comments: CommentItem[];
  version: number;
}

export const FichaTecnicaView: React.FC<FichaTecnicaViewProps> = ({
  project,
  graph,
  kickoffItems,
  comments,
  version,
}) => {
  const [contentMd, setContentMd] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleGenerateFicha = async () => {
    setIsLoading(true);
    try {
      const data = await aiFetch("/api/ai/generate-ficha", {
        clientName: project.client_name,
        industry: project.industry,
        version,
        graph,
        kickoffItems,
        comments,
      });
      if (data.contentMd) {
        setContentMd(data.contentMd);
      }
    } catch (err) {
      console.error("Failed to generate Ficha", err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    handleGenerateFicha();
  }, [project.id, version]);

  const handleCopy = () => {
    navigator.clipboard.writeText(contentMd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMd = () => {
    const blob = new Blob([contentMd], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Ficha_Tecnica_${project.client_name.replace(/\s+/g, "_")}_v${version}.md`;
    a.click();
  };

  const handleDownloadJson = () => {
    const flowPlan = {
      client: project.client_name,
      version: version,
      industry: project.industry,
      flow_plan: {
        nodes: graph.nodes.map((n) => ({
          id: n.id,
          type: n.data.nodeType,
          label: n.data.label,
          properties: n.data,
        })),
        edges: graph.edges,
      },
    };

    const blob = new Blob([JSON.stringify(flowPlan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flow_plan_${project.client_name.replace(/\s+/g, "_")}_v${version}.json`;
    a.click();
  };

  return (
    <div className="h-full bg-surface p-6 flex flex-col text-ink overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-line shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary-soft text-primary rounded-xl border border-primary/30 shadow-xs">
            <FileCode className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-heading">
              Ficha Técnica Oficial — {project.client_name} (v{version})
            </h2>
            <p className="text-xs text-ink-soft font-medium">
              Salida estructurada lista para alimentar la Skill de creación de flujos de Atom
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateFicha}
            disabled={isLoading}
            className="px-3 py-1.5 bg-white border border-line hover:bg-surface text-ink font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
            <span>Regenerar</span>
          </button>

          <button
            onClick={handleCopy}
            disabled={!contentMd}
            className="px-3 py-1.5 bg-white border border-line hover:bg-surface text-ink font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "¡Copiado!" : "Copiar MD"}</span>
          </button>

          <button
            onClick={handleDownloadMd}
            disabled={!contentMd}
            className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar .MD</span>
          </button>

          <button
            onClick={handleDownloadJson}
            className="px-3 py-1.5 bg-success hover:bg-success/80 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>flow_plan.json</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 mt-4 bg-white rounded-2xl border border-line p-6 overflow-y-auto font-mono text-xs text-ink leading-relaxed shadow-lg">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-3 text-ink-soft">
            <Sparkles className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-bold text-ink">Generando Ficha Técnica detallada con Gemini IA...</p>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-xs text-ink font-medium">{contentMd}</pre>
        )}
      </div>
    </div>
  );
};
