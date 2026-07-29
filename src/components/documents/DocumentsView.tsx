import React, { useRef, useState } from "react";
import {
  Paperclip,
  Upload,
  FileText,
  Trash2,
  Sparkles,
  ClipboardPaste,
  CheckCircle2,
  AlertTriangle,
  Circle,
  Map,
  FileCode,
} from "lucide-react";
import { Project, DocumentItem, KickoffItem, ProjectAnalysis } from "../../types";
import {
  getDocuments,
  saveDocument,
  deleteDocument,
  getProjectAnalysis,
  saveProjectAnalysis,
} from "../../lib/storage";
import { extractDocumentText, detectRequiredDoc, REQUIRED_DOCS } from "../../lib/documentExtract";
import { BASE_QUESTIONS } from "../../lib/baseQuestions";
import { aiFetch, getAIConfig } from "../../lib/aiConfig";

interface DocumentsViewProps {
  project: Project;
  onKickoffItemsGenerated: (items: KickoffItem[], summary?: string) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  project,
  onKickoffItemsGenerated,
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>(getDocuments(project.id));
  const [pastedText, setPastedText] = useState("");
  const [pastedName, setPastedName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(
    getProjectAnalysis(project.id) || null
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => setDocuments(getDocuments(project.id));

  const handleFiles = async (files: FileList | File[]) => {
    setIsExtracting(true);
    try {
      for (const file of Array.from(files)) {
        const { text, note } = await extractDocumentText(file);
        saveDocument({
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          project_id: project.id,
          file_name: file.name,
          extracted_text: text,
          required_key: detectRequiredDoc(file.name) || undefined,
          extract_note: note,
          created_at: new Date().toISOString(),
        });
      }
      refresh();
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePasteSave = () => {
    if (!pastedText.trim()) return;
    const name = pastedName.trim() || `Brief pegado ${new Date().toLocaleDateString()}`;
    saveDocument({
      id: `doc-${Date.now()}`,
      project_id: project.id,
      file_name: name,
      extracted_text: pastedText,
      required_key: detectRequiredDoc(name) || undefined,
      created_at: new Date().toISOString(),
    });
    setPastedText("");
    setPastedName("");
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteDocument(id);
    refresh();
  };

  const docsWithText = documents.filter((d) => d.extracted_text && d.extracted_text.trim());
  const presentKeys = new Set(documents.map((d) => d.required_key).filter(Boolean));

  const handleAnalyze = async () => {
    if (docsWithText.length === 0) return;
    setIsAnalyzing(true);
    try {
      const data = await aiFetch("/api/ai/analyze-context", {
        documentTexts: docsWithText.map(
          (d) => `### ${d.file_name}${d.required_key ? ` [REQUERIDO: ${d.required_key}]` : ""}\n${d.extracted_text}`
        ),
        clientName: project.client_name,
        industry: project.industry,
        description: project.description,
        baseQuestions: BASE_QUESTIONS,
      });

      if (data.error) {
        setAnalysis({
          project_id: project.id,
          summary: `⚠️ Error de IA: ${data.error}`,
          generatedAt: new Date().toISOString(),
        });
        return;
      }

      // Persistir el análisis para regenerarlo o reutilizarlo después.
      const persisted: ProjectAnalysis = {
        project_id: project.id,
        summary: data.summary,
        scopeSummary: data.scopeSummary,
        detectedTone: data.detectedTone,
        detectedGoal: data.detectedGoal,
        mapReadiness: data.mapReadiness,
        specReadiness: data.specReadiness,
        generatedAt: new Date().toISOString(),
        model: getAIConfig().model,
        documentNames: docsWithText.map((d) => d.file_name),
      };
      saveProjectAnalysis(persisted);
      setAnalysis(persisted);

      if (data.kickoffItems && Array.isArray(data.kickoffItems)) {
        const newItems: KickoffItem[] = data.kickoffItems.map((item: any, idx: number) => ({
          id: item.baseId || `k-ai-${Date.now()}-${idx}`,
          project_id: project.id,
          category: item.category || "Generales",
          question: item.question,
          answer: item.answer || "",
          status: item.status === "answered" || item.answer ? "answered" : "pending",
          source: "ai",
        }));
        onKickoffItemsGenerated(newItems, data.summary);
      }
    } catch (err) {
      console.error("Failed to analyze documents", err);
      setAnalysis({
        project_id: project.id,
        summary: "⚠️ No se pudo conectar con el servidor de IA.",
        generatedAt: new Date().toISOString(),
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full bg-surface p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-soft text-primary rounded-xl border border-line">
              <Paperclip className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-heading">
                Documentos del Proyecto — {project.client_name}
              </h2>
              <p className="text-xs text-ink-soft font-medium">
                La IA analiza el SOW y el Baseline para detectar la información faltante del mapa visual y la ficha técnica.
              </p>
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || docsWithText.length === 0}
            className="px-4 py-2.5 bg-primary hover:bg-primary-hover disabled:bg-line disabled:text-ink-soft text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md active:scale-95"
          >
            <Sparkles className={`w-4 h-4 ${isAnalyzing ? "animate-spin" : ""}`} />
            <span>
              {isAnalyzing
                ? "Analizando con IA..."
                : analysis && !analysis.summary?.startsWith("⚠️")
                ? `Regenerar análisis (${docsWithText.length} docs)`
                : `Analizar contexto (${docsWithText.length} docs)`}
            </span>
          </button>
        </div>

        {/* Documentos requeridos */}
        <div className="p-4 rounded-xl bg-card border border-line">
          <p className="text-xs font-bold text-heading mb-3 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-primary" />
            Documentos requeridos para el análisis inicial
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REQUIRED_DOCS.map((rd) => {
              const present = presentKeys.has(rd.key);
              return (
                <div
                  key={rd.key}
                  className={`p-3 rounded-lg border flex gap-2.5 ${
                    present ? "bg-success-soft border-success/30" : "bg-surface border-line"
                  }`}
                >
                  {present ? (
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-ink-soft shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-heading">{rd.label}</p>
                    <p className="text-[10px] text-ink-soft leading-snug">{rd.hint}</p>
                    <p className={`text-[10px] font-bold mt-1 ${present ? "text-success" : "text-warning"}`}>
                      {present ? "Cargado ✓" : "Pendiente de cargar"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resultado del análisis: mapa visual y ficha técnica */}
        {analysis && (
          <div className="space-y-3">
            {(analysis.scopeSummary || analysis.summary) && (
              <div className="p-4 rounded-xl bg-primary-soft border border-line">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-heading">Resumen del alcance (SOW)</p>
                  <span className="text-[10px] text-ink-soft">
                    Análisis guardado · {new Date(analysis.generatedAt).toLocaleString()}
                    {analysis.model ? ` · ${analysis.model}` : ""}
                  </span>
                </div>
                <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">
                  {analysis.scopeSummary || analysis.summary}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ReadinessCard
                icon={<Map className="w-4 h-4" />}
                title="1. Para el mapa visual"
                readiness={analysis.mapReadiness}
              />
              <ReadinessCard
                icon={<FileCode className="w-4 h-4" />}
                title="2. Para la ficha técnica (MD)"
                readiness={analysis.specReadiness}
              />
            </div>
            <p className="text-[11px] text-ink-soft italic">
              Las preguntas faltantes se agregaron a la <b>Guía Kick-off</b> para resolverlas con el cliente.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Zona de carga */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-2 ${
              isDragOver
                ? "border-primary bg-primary-soft"
                : "border-line bg-card hover:border-primary hover:bg-primary-soft/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept=".txt,.md,.csv,.json,.html,.docx,.xlsx,.xls,.xlsm"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="p-3 rounded-xl bg-primary-soft text-primary">
              {isExtracting ? <Sparkles className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
            </div>
            <p className="text-sm font-bold text-heading">
              {isExtracting ? "Extrayendo texto..." : "Adjuntar documentos (SOW, Baseline, briefs)"}
            </p>
            <p className="text-xs text-ink-soft max-w-xs">
              Arrastra o haz clic. Se extrae texto de <b>.docx, .xlsx</b> y archivos de texto automáticamente.
            </p>
          </div>

          {/* Pegar texto */}
          <div className="p-5 rounded-2xl bg-card border border-line space-y-3">
            <h4 className="font-bold text-heading text-xs flex items-center gap-1.5">
              <ClipboardPaste className="w-4 h-4 text-primary" />
              <span>Pegar contenido directamente</span>
            </h4>
            <input
              type="text"
              value={pastedName}
              onChange={(e) => setPastedName(e.target.value)}
              placeholder="Nombre del documento (ej: Brief comercial)"
              className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-ink text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium"
            />
            <textarea
              rows={5}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Pega aquí el brief de ventas, catálogo, FAQs, acuerdos previos..."
              className="w-full bg-surface border border-line rounded-lg p-3 text-ink text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handlePasteSave}
              disabled={!pastedText.trim()}
              className="w-full py-2 bg-heading hover:bg-ink disabled:bg-line disabled:text-ink-soft text-white font-bold rounded-lg text-xs transition-all"
            >
              Guardar como documento
            </button>
          </div>
        </div>

        {/* Lista de documentos */}
        <div className="space-y-2">
          <span className="font-bold text-heading text-xs">
            Documentos cargados ({documents.length}):
          </span>
          {documents.length === 0 && (
            <p className="text-xs text-ink-soft italic py-4 text-center bg-card rounded-xl border border-line">
              Aún no hay documentos en este proyecto.
            </p>
          )}
          {documents.map((doc) => {
            const hasText = !!(doc.extracted_text && doc.extracted_text.trim());
            return (
              <div
                key={doc.id}
                className="p-3 bg-card rounded-xl border border-line flex items-center justify-between gap-3 hover:border-primary transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 rounded-lg bg-primary-soft text-primary shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-heading truncate flex items-center gap-1.5">
                      {doc.file_name}
                      {doc.required_key && (
                        <span className="px-1.5 py-0.5 rounded bg-primary-soft text-primary text-[9px] font-bold uppercase border border-primary/30">
                          Requerido
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-ink-soft">
                      {new Date(doc.created_at).toLocaleString()}
                      {hasText ? ` · ${doc.extracted_text.length.toLocaleString()} caracteres` : ""}
                    </p>
                    {doc.extract_note && (
                      <p className="text-[10px] text-warning flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3 shrink-0" /> {doc.extract_note}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {hasText ? (
                    <span className="px-2 py-0.5 rounded bg-success-soft text-success text-[10px] font-bold">
                      Analizable
                    </span>
                  ) : (
                    <span
                      className="px-2 py-0.5 rounded bg-warning-soft text-warning text-[10px] font-bold flex items-center gap-1"
                      title="No se pudo extraer texto. Pega su contenido manualmente."
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Sin texto
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 text-ink-soft hover:text-danger hover:bg-danger-soft rounded-lg transition-colors"
                    title="Eliminar documento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ReadinessCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  readiness?: { ready: boolean; missing: string[] };
}> = ({ icon, title, readiness }) => {
  const ready = readiness?.ready;
  const missing = readiness?.missing || [];
  return (
    <div className={`p-4 rounded-xl border ${ready ? "bg-success-soft border-success/30" : "bg-card border-line"}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={ready ? "text-success" : "text-primary"}>{icon}</span>
        <p className="text-xs font-bold text-heading">{title}</p>
        <span
          className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold ${
            ready ? "bg-success text-white" : "bg-warning-soft text-warning"
          }`}
        >
          {ready ? "Listo" : `${missing.length} faltante${missing.length !== 1 ? "s" : ""}`}
        </span>
      </div>
      {missing.length > 0 ? (
        <ul className="space-y-1">
          {missing.map((m, i) => (
            <li key={i} className="text-[11px] text-ink flex gap-1.5">
              <span className="text-warning shrink-0">•</span>
              <span>{m}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-ink-soft italic">
          {ready ? "Información suficiente para avanzar." : "Ejecuta el análisis para ver los faltantes."}
        </p>
      )}
    </div>
  );
};
