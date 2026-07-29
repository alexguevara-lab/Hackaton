import type { CSSProperties } from "react";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export type IndustryType = "ecommerce" | "salud" | "financiero" | "inmobiliario" | "otro";

export type ProjectStatus = "draft" | "kickoff" | "validated" | "delivered";

export interface Project {
  id: string;
  owner_id?: string;
  client_name: string;
  industry: IndustryType;
  brand_logo_url?: string;
  brand_color: string; // Hex e.g. #0284c7
  description: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface DocumentItem {
  id: string;
  project_id: string;
  file_name: string;
  storage_path?: string;
  extracted_text: string;
  required_key?: string; // "sow" | "baseline" si es un documento requerido
  extract_note?: string; // aviso si la extracción fue parcial
  created_at: string;
}

export type KickoffCategory =
  | "Generales"
  | "Rutas e Intenciones"
  | "Captura de Datos"
  | "Cierres"
  | "Integraciones"
  | "Asignación Humana";

export interface KickoffItem {
  id: string;
  project_id: string;
  category: KickoffCategory;
  question: string;
  answer?: string;
  status: "pending" | "answered" | "n_a";
  source: "ai" | "manual";
  created_at?: string;
}

export interface CommentItem {
  id: string;
  diagram_id: string;
  node_id?: string;
  author_name: string;
  body: string;
  resolved: boolean;
  created_at: string;
}

export interface AuditGap {
  nodeId?: string | null;
  nodeName?: string;
  category: KickoffCategory | "General";
  severity: "blocking" | "warning" | "info";
  issue: string;
  suggestion: string;
  autoFixAvailable?: boolean;
}

export interface AuditResult {
  score: number;
  isReady: boolean;
  gaps: AuditGap[];
  lastAuditedAt?: string;
}

export interface DiagramGraph {
  nodes: CustomCanvasNode[];
  edges: CustomCanvasEdge[];
}

export type VersionStatus = "draft" | "in_review" | "approved";

export interface DiagramVersion {
  id: string;
  project_id: string;
  version: number;
  label: string;
  graph: DiagramGraph;
  is_current: boolean;
  status?: VersionStatus; // borrador | en revisión | aprobado
  approved_at?: string;
  approved_by?: string;
  created_at: string;
}

// Análisis persistido del proyecto (documentos → alcance + información faltante).
// Se guarda para poder regenerarlo y para alimentar las preguntas del kick-off.
export interface ProjectAnalysis {
  project_id: string;
  scopeSummary?: string;
  summary?: string;
  detectedTone?: string;
  detectedGoal?: string;
  mapReadiness?: { ready: boolean; missing: string[] };
  specReadiness?: { ready: boolean; missing: string[] };
  generatedAt: string;
  model?: string;
  documentNames?: string[];
}

export type ArtifactKind = "ficha_tecnica" | "auditoria" | "resumen_acuerdos";

export interface Artifact {
  id: string;
  project_id: string;
  diagram_version: number;
  kind: ArtifactKind;
  content_md: string;
  created_at: string;
}

// Custom Node Data Types for Canvas
export type CustomNodeType =
  | "start"
  | "message"
  | "orchestrator"
  | "capture"
  | "integration"
  | "decision"
  | "human"
  | "closing"
  | "stage"
  | "jump"
  | "note";

export interface CustomNodeData extends Record<string, unknown> {
  label: string;
  nodeType: CustomNodeType;
  description?: string;
  // Specific properties according to Skill rules
  // Message
  messageText?: string;
  buttons?: { id: string; label: string; actionTarget?: string }[];
  // Orchestrator
  noAnswerMinutes?: number;
  intents?: { id: string; name: string; condition: string; isSalesBranch: boolean }[];
  // Capture
  fields?: { name: string; type: "var" | "custom"; prompt: string; atomExistId?: string }[];
  // Integration
  systemName?: string; // e.g. "HubSpot", "Stripe", "PostgreSQL", "Rest API"
  systemLogo?: string;
  endpoint?: string;
  httpMethod?: "GET" | "POST" | "PUT" | "DELETE";
  errorFallbackMessage?: string;
  saveVariable?: string;
  // Human
  groupName?: string;
  schedule?: string;
  transitionMessage?: string;
  // Closing / Tipificación
  typificationName?: string;
  typificationDesc?: string;
  atomTipificationId?: string;
  // Stage
  salesStage?: "Awareness" | "Lead" | "MQL" | "SQL";
  // Status badges
  hasWarnings?: boolean;
  warningText?: string;
  commentsCount?: number;
}

export interface CustomCanvasNode {
  id: string;
  type: CustomNodeType;
  position: { x: number; y: number };
  data: CustomNodeData;
}

export interface CustomCanvasEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  animated?: boolean;
  style?: CSSProperties;
}
