import {
  Project,
  DocumentItem,
  KickoffItem,
  DiagramVersion,
  VersionStatus,
  ProjectAnalysis,
  CommentItem,
  Artifact,
  IndustryType,
} from "../types";
import { getTemplateForIndustry } from "../templates/industryTemplates";

const STORAGE_KEYS = {
  PROJECTS: "atomscope_projects_v1",
  DOCUMENTS: "atomscope_documents_v1",
  KICKOFF: "atomscope_kickoff_v1",
  DIAGRAMS: "atomscope_diagrams_v1",
  COMMENTS: "atomscope_comments_v1",
  ARTIFACTS: "atomscope_artifacts_v1",
  ANALYSIS: "atomscope_analysis_v1",
  CURRENT_PROJECT: "atomscope_current_project_id",
  AUTH_USER: "atomscope_auth_user_v1",
};

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

// Helper to initialize local storage with default demo projects
export function initStorage() {
  if (typeof window === "undefined") return;

  if (!localStorage.getItem(STORAGE_KEYS.PROJECTS)) {
    const defaultProjects: Project[] = [
      {
        id: "proj-demo-1",
        client_name: "NovaRetail Store",
        industry: "ecommerce",
        brand_logo_url: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=100&auto=format&fit=crop&q=80",
        brand_color: "#7c3aed", // Violet
        description: "Bot Inbound WhatsApp para ventas de catálogo, rastreo de envíos y atención a cliente.",
        status: "kickoff",
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "proj-demo-2",
        client_name: "Clínica San Gabriel",
        industry: "salud",
        brand_logo_url: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=100&auto=format&fit=crop&q=80",
        brand_color: "#0284c7", // Ocean Blue
        description: "Agendamiento de citas médicas, consulta de exámenes de laboratorio y orientación 24/7.",
        status: "draft",
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "proj-demo-3",
        client_name: "FinanzCorp Bank",
        industry: "financiero",
        brand_logo_url: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&auto=format&fit=crop&q=80",
        brand_color: "#059669", // Emerald
        description: "Flujo de pre-calificación para créditos de consumo con conexión a buró crediticio.",
        status: "validated",
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(defaultProjects));

    // Initialize diagrams for demo projects
    const defaultDiagrams: DiagramVersion[] = defaultProjects.map((p) => ({
      id: `diag-${p.id}-v1`,
      project_id: p.id,
      version: 1,
      label: "v1 - Diagrama Kickoff Inicial",
      graph: getTemplateForIndustry(p.industry, p.client_name),
      is_current: true,
      status: "draft",
      created_at: new Date().toISOString(),
    }));

    localStorage.setItem(STORAGE_KEYS.DIAGRAMS, JSON.stringify(defaultDiagrams));

    // Initialize kickoff items for NovaRetail
    const defaultKickoff: KickoffItem[] = [
      {
        id: "k1",
        project_id: "proj-demo-1",
        category: "Generales",
        question: "¿Cuál es la plataforma principal de interacción del bot?",
        answer: "WhatsApp Business API Inbound",
        status: "answered",
        source: "manual",
      },
      {
        id: "k2",
        project_id: "proj-demo-1",
        category: "Generales",
        question: "¿Cuál es el tono de comunicación de la marca?",
        answer: "Cercano, moderno, con formato WhatsApp (*negritas*) y emojis moderados",
        status: "answered",
        source: "ai",
      },
      {
        id: "k3",
        project_id: "proj-demo-1",
        category: "Rutas e Intenciones",
        question: "¿Cuál es el tiempo de espera para el recupero sin respuesta en Smarton?",
        answer: "30 minutos antes de enviar recordatorio de cierre",
        status: "answered",
        source: "ai",
      },
      {
        id: "k4",
        project_id: "proj-demo-1",
        category: "Captura de Datos",
        question: "¿Los campos custom_ (nombre, ciudad) ya existen en Atom con ID o se crean nuevos?",
        answer: "",
        status: "pending",
        source: "ai",
      },
      {
        id: "k5",
        project_id: "proj-demo-1",
        category: "Integraciones",
        question: "¿Qué endpoint se consultará para el estado de pedidos y cuál es la respuesta ante error?",
        answer: "API Shopify POST. Si falla, mensaje empático y transferencia a soporte humano",
        status: "answered",
        source: "ai",
      },
      {
        id: "k6",
        project_id: "proj-demo-1",
        category: "Cierres",
        question: "¿Se tienen los IDs de las tipificaciones existentes en Atom?",
        answer: "",
        status: "pending",
        source: "manual",
      },
    ];

    localStorage.setItem(STORAGE_KEYS.KICKOFF, JSON.stringify(defaultKickoff));
  }

  if (!localStorage.getItem(STORAGE_KEYS.CURRENT_PROJECT)) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT, "proj-demo-1");
  }

  if (!localStorage.getItem(STORAGE_KEYS.AUTH_USER)) {
    localStorage.setItem(
      STORAGE_KEYS.AUTH_USER,
      JSON.stringify({
        id: "usr-ob-1",
        email: "alex.guevara@atomchat.io",
        name: "Alex Guevara (Onboarding Leader)",
        role: "Onboarding Manager",
      })
    );
  }
}

// --- CRUD OPERATIONS ---

export function getProjects(): Project[] {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
  return raw ? JSON.parse(raw) : [];
}

export function saveProject(project: Project): Project {
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  project.updated_at = new Date().toISOString();

  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.unshift(project);
    // Create initial v1 diagram
    const v1: DiagramVersion = {
      id: `diag-${project.id}-v1`,
      project_id: project.id,
      version: 1,
      label: "v1 - Diagrama Inicial Kickoff",
      graph: getTemplateForIndustry(project.industry, project.client_name),
      is_current: true,
      status: "draft",
      created_at: new Date().toISOString(),
    };
    saveDiagramVersion(v1);
  }

  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  return project;
}

export function deleteProject(id: string) {
  const projects = getProjects().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));

  // Borrado en cascada de datos asociados al proyecto
  const filterOut = (key: string, field: string) => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const all: any[] = JSON.parse(raw);
    localStorage.setItem(key, JSON.stringify(all.filter((item) => item[field] !== id)));
  };
  filterOut(STORAGE_KEYS.DIAGRAMS, "project_id");
  filterOut(STORAGE_KEYS.KICKOFF, "project_id");
  filterOut(STORAGE_KEYS.DOCUMENTS, "project_id");
  filterOut(STORAGE_KEYS.ARTIFACTS, "project_id");
  filterOut(STORAGE_KEYS.ANALYSIS, "project_id");
}

export function getCurrentProjectId(): string {
  initStorage();
  return localStorage.getItem(STORAGE_KEYS.CURRENT_PROJECT) || "proj-demo-1";
}

export function setCurrentProjectId(id: string) {
  localStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT, id);
}

// --- DIAGRAMS & VERSIONS ---

export function getDiagramVersions(projectId: string): DiagramVersion[] {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.DIAGRAMS);
  const all: DiagramVersion[] = raw ? JSON.parse(raw) : [];
  return all.filter((d) => d.project_id === projectId).sort((a, b) => b.version - a.version);
}

export function getCurrentDiagram(projectId: string): DiagramVersion | undefined {
  const versions = getDiagramVersions(projectId);
  return versions.find((v) => v.is_current) || versions[0];
}

export function saveDiagramVersion(version: DiagramVersion): DiagramVersion {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.DIAGRAMS);
  let all: DiagramVersion[] = raw ? JSON.parse(raw) : [];

  // Set all other versions of this project to is_current = false if this is current
  if (version.is_current) {
    all = all.map((d) => (d.project_id === version.project_id ? { ...d, is_current: false } : d));
  }

  const existingIdx = all.findIndex((d) => d.id === version.id);
  if (existingIdx >= 0) {
    all[existingIdx] = version;
  } else {
    all.unshift(version);
  }

  localStorage.setItem(STORAGE_KEYS.DIAGRAMS, JSON.stringify(all));
  return version;
}

export function createNewVersion(projectId: string, label?: string): DiagramVersion {
  const current = getCurrentDiagram(projectId);
  const versions = getDiagramVersions(projectId);
  const nextVer = (versions[0]?.version || 0) + 1;

  const newVer: DiagramVersion = {
    id: `diag-${projectId}-v${nextVer}`,
    project_id: projectId,
    version: nextVer,
    label: label || `v${nextVer} - Iteración Kick-off`,
    graph: current ? JSON.parse(JSON.stringify(current.graph)) : getTemplateForIndustry("ecommerce", "Cliente"),
    is_current: true,
    status: "draft",
    created_at: new Date().toISOString(),
  };

  return saveDiagramVersion(newVer);
}

// Cambia el estatus de una versión (borrador | en revisión | aprobado).
export function setVersionStatus(
  versionId: string,
  status: VersionStatus,
  approvedBy?: string
): DiagramVersion | undefined {
  const raw = localStorage.getItem(STORAGE_KEYS.DIAGRAMS);
  const all: DiagramVersion[] = raw ? JSON.parse(raw) : [];
  const idx = all.findIndex((d) => d.id === versionId);
  if (idx < 0) return undefined;

  all[idx] = {
    ...all[idx],
    status,
    approved_at: status === "approved" ? new Date().toISOString() : undefined,
    approved_by: status === "approved" ? approvedBy : undefined,
  };
  localStorage.setItem(STORAGE_KEYS.DIAGRAMS, JSON.stringify(all));
  return all[idx];
}

// --- PROJECT ANALYSIS (persistido) ---

export function getProjectAnalysis(projectId: string): ProjectAnalysis | undefined {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.ANALYSIS);
  const all: ProjectAnalysis[] = raw ? JSON.parse(raw) : [];
  return all.find((a) => a.project_id === projectId);
}

export function saveProjectAnalysis(analysis: ProjectAnalysis): ProjectAnalysis {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.ANALYSIS);
  let all: ProjectAnalysis[] = raw ? JSON.parse(raw) : [];
  all = all.filter((a) => a.project_id !== analysis.project_id);
  all.unshift(analysis);
  localStorage.setItem(STORAGE_KEYS.ANALYSIS, JSON.stringify(all));
  return analysis;
}

// --- DOCUMENTS ---

export function getDocuments(projectId: string): DocumentItem[] {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
  const all: DocumentItem[] = raw ? JSON.parse(raw) : [];
  return all.filter((d) => d.project_id === projectId);
}

export function saveDocument(doc: DocumentItem): DocumentItem {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
  const all: DocumentItem[] = raw ? JSON.parse(raw) : [];
  all.unshift(doc);
  localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(all));
  return doc;
}

export function deleteDocument(id: string) {
  const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
  const all: DocumentItem[] = raw ? JSON.parse(raw) : [];
  localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(all.filter((d) => d.id !== id)));
}

// --- KICKOFF ITEMS ---

export function getKickoffItems(projectId: string): KickoffItem[] {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.KICKOFF);
  const all: KickoffItem[] = raw ? JSON.parse(raw) : [];
  return all.filter((k) => k.project_id === projectId);
}

export function saveKickoffItem(item: KickoffItem): KickoffItem {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.KICKOFF);
  let all: KickoffItem[] = raw ? JSON.parse(raw) : [];
  const idx = all.findIndex((k) => k.id === item.id);
  if (idx >= 0) {
    all[idx] = item;
  } else {
    all.push(item);
  }
  localStorage.setItem(STORAGE_KEYS.KICKOFF, JSON.stringify(all));
  return item;
}

export function bulkSaveKickoffItems(projectId: string, items: KickoffItem[]) {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.KICKOFF);
  let all: KickoffItem[] = raw ? JSON.parse(raw) : [];
  all = all.filter((k) => k.project_id !== projectId).concat(items);
  localStorage.setItem(STORAGE_KEYS.KICKOFF, JSON.stringify(all));
}

// --- COMMENTS ---

export function getComments(diagramId: string): CommentItem[] {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.COMMENTS);
  const all: CommentItem[] = raw ? JSON.parse(raw) : [];
  return all.filter((c) => c.diagram_id === diagramId);
}

export function saveComment(comment: CommentItem): CommentItem {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.COMMENTS);
  const all: CommentItem[] = raw ? JSON.parse(raw) : [];
  all.unshift(comment);
  localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(all));
  return comment;
}

// --- ARTIFACTS ---

export function getArtifacts(projectId: string): Artifact[] {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.ARTIFACTS);
  const all: Artifact[] = raw ? JSON.parse(raw) : [];
  return all.filter((a) => a.project_id === projectId);
}

export function saveArtifact(artifact: Artifact): Artifact {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.ARTIFACTS);
  let all: Artifact[] = raw ? JSON.parse(raw) : [];
  all = all.filter((a) => !(a.project_id === artifact.project_id && a.kind === artifact.kind));
  all.unshift(artifact);
  localStorage.setItem(STORAGE_KEYS.ARTIFACTS, JSON.stringify(all));
  return artifact;
}

// --- AUTH ---

export function getAuthUser(): AuthUser {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
  return raw
    ? JSON.parse(raw)
    : {
        id: "usr-ob-1",
        email: "alex.guevara@atomchat.io",
        name: "Alex Guevara",
        role: "Onboarding Manager",
      };
}

export function setAuthUser(user: AuthUser) {
  localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
}
