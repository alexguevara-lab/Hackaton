/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PanelLeftOpen } from "lucide-react";

import {
  Project,
  DiagramVersion,
  KickoffItem,
  CustomCanvasNode,
  CustomCanvasEdge,
  CustomNodeType,
  AuthUser,
  AuditResult,
  AuditGap,
} from "./types";

import {
  getProjects,
  saveProject,
  deleteProject,
  getCurrentProjectId,
  setCurrentProjectId,
  getDiagramVersions,
  getCurrentDiagram,
  saveDiagramVersion,
  createNewVersion,
  setVersionStatus,
  getKickoffItems,
  saveKickoffItem,
  getDocuments,
} from "./lib/storage";
import { VersionStatus } from "./types";
import { supabase, toAuthUser } from "./lib/supabase";

import { nodeTypes } from "./components/canvas/CustomNodes";
import { NodePropertyInspector } from "./components/canvas/NodePropertyInspector";
import { CanvasToolbar } from "./components/canvas/CanvasToolbar";
import { KickoffPanel } from "./components/kickoff/KickoffPanel";
import { AuditView } from "./components/audit/AuditView";
import { FichaTecnicaView } from "./components/artifacts/FichaTecnicaView";
import { ResumenAcuerdosView } from "./components/artifacts/ResumenAcuerdosView";
import { ProjectList } from "./components/projects/ProjectList";
import { DocumentsView } from "./components/documents/DocumentsView";
import { LoginModal } from "./components/auth/LoginModal";
import { Sidebar, AppView } from "./components/layout/Sidebar";
import { ChatPanel, GraphOperation } from "./components/chat/ChatPanel";
import { SettingsModal } from "./components/settings/SettingsModal";
import { aiFetch } from "./lib/aiConfig";

// Vistas que muestran el canvas (con o sin panel lateral)
const CANVAS_VIEWS: AppView[] = ["canvas", "kickoff", "audit"];

// Color del minimapa por tipo de nodo — refleja la estructura del flujo con la
// misma semántica de color de las tarjetas del canvas (naranja/verde/rojo/negro).
const nodeMiniMapColor = (n: { type?: string }): string => {
  switch (n.type) {
    case "start":
    case "stage":
      return "#16a34a"; // verde — inicio / etapa de venta
    case "closing":
      return "#dc2626"; // rojo — cierre
    case "integration":
      return "#ff8a00"; // naranja — integración
    case "message":
    case "capture":
      return "#ff5a00"; // primario — mensajes / captura
    case "note":
      return "#ffd9c2"; // naranja suave — nota
    case "jump":
      return "#999999";
    default:
      return "#292929"; // orquestador / condición / humano
  }
};

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | undefined>();
  const [versions, setVersions] = useState<DiagramVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<DiagramVersion | undefined>();

  // React Flow State
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomCanvasNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<CustomCanvasEdge>([]);

  // Selected Node Inspector State
  const [selectedNode, setSelectedNode] = useState<CustomCanvasNode | null>(null);

  // Kickoff & Audit State
  const [kickoffItems, setKickoffItems] = useState<KickoffItem[]>([]);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isRunningAudit, setIsRunningAudit] = useState<boolean>(false);
  const [documentsCount, setDocumentsCount] = useState<number>(0);

  // UI State
  const [activeView, setActiveView] = useState<AppView>("projects");
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isAutoFixing, setIsAutoFixing] = useState<boolean>(false);
  const [auditError, setAuditError] = useState<string>("");
  const [authUser, setAuthUser] = useState<AuthUser>({
    id: "",
    email: "",
    name: "",
    role: "",
  });

  // Ref con la versión actual para el autoguardado (evita cierres obsoletos)
  const currentVersionRef = useRef<DiagramVersion | undefined>(undefined);
  currentVersionRef.current = currentVersion;
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Evita marcar "guardando" cuando el cambio de nodes/edges viene de cargar un diagrama.
  const hasHydratedRef = useRef(false);
  // Instancia de React Flow para reencuadrar cuando cambia el ancho útil del canvas.
  const rfRef = useRef<any>(null);
  const fitCanvas = useCallback(() => {
    const apply = () => rfRef.current?.fitView({ padding: 0.14, duration: 250, maxZoom: 1 });
    requestAnimationFrame(apply);
    setTimeout(apply, 220);
  }, []);

  // Al editar el canvas se oculta automáticamente el menú principal
  const hideSidebarOnEdit = useCallback(() => {
    setIsSidebarHidden(true);
  }, []);

  // Load Initial Data
  const loadProjectData = useCallback(
    (projectId: string) => {
      const allProjects = getProjects();
      setProjects(allProjects);

      const proj = allProjects.find((p) => p.id === projectId) || allProjects[0];
      if (!proj) return;

      setCurrentProject(proj);
      setCurrentProjectId(proj.id);

      const vers = getDiagramVersions(proj.id);
      setVersions(vers);

      const currentDiag = getCurrentDiagram(proj.id);
      setCurrentVersion(currentDiag);

      hasHydratedRef.current = false; // el próximo cambio de nodes/edges es la carga, no una edición
      if (currentDiag && currentDiag.graph) {
        setNodes(currentDiag.graph.nodes || []);
        setEdges(currentDiag.graph.edges || []);
      }

      setKickoffItems(getKickoffItems(proj.id));
      setDocumentsCount(getDocuments(proj.id).length);
      setAuditResult(null);
      setSelectedNode(null);
      setSaveStatus("idle");
    },
    [setNodes, setEdges]
  );

  useEffect(() => {
    const currentId = getCurrentProjectId();
    loadProjectData(currentId);
  }, [loadProjectData]);

  // Reencuadra el diagrama cuando cambia el ancho útil del canvas (paneles/chat),
  // para que ningún nodo quede oculto tras un panel lateral.
  useEffect(() => {
    if (!CANVAS_VIEWS.includes(activeView)) return;
    const t = setTimeout(() => fitCanvas(), 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, isChatOpen, currentVersion?.id]);

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    const hydrateAuthUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;
      if (!session?.user) {
        setIsLoginOpen(true);
        return;
      }

      setAuthUser(await toAuthUser(session.user));
      setIsLoginOpen(false);
    };

    void hydrateAuthUser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session?.user) {
        setIsLoginOpen(true);
        return;
      }
      void toAuthUser(session.user).then((user) => {
        if (active) setAuthUser(user);
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Autoguardado del diagrama: reacciona SIEMPRE al estado real de nodes/edges,
  // reportando el estatus de guardado (Guardando… / Guardado).
  useEffect(() => {
    const version = currentVersionRef.current;
    if (!version) return;

    // No mostrar "guardando" cuando el cambio viene de cargar/cambiar de diagrama.
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      return;
    }

    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDiagramVersion({ ...version, graph: { nodes, edges } });
      setSaveStatus("saved");
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [nodes, edges]);

  // React Flow Edge Connect Handler
  const onConnect = useCallback(
    (params: Connection | Edge) => {
      hideSidebarOnEdit();
      const newEdge: CustomCanvasEdge = {
        id: `e-${params.source}-${params.target}-${Date.now()}`,
        source: params.source || "",
        target: params.target || "",
        sourceHandle: params.sourceHandle || undefined,
        targetHandle: params.targetHandle || undefined,
        animated: true,
        style: { stroke: "#FF5A00", strokeWidth: 2 },
      };
      setEdges((eds) => addEdge(newEdge, eds) as CustomCanvasEdge[]);
    },
    [setEdges, hideSidebarOnEdit]
  );

  // Handle Node Selection
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: CustomCanvasNode) => {
      if (isPresentationMode) return;
      hideSidebarOnEdit();
      setSelectedNode(node);
    },
    [isPresentationMode, hideSidebarOnEdit]
  );

  // Add New Custom Node to Canvas
  const handleAddNode = (type: CustomNodeType, customLabel?: string, extraProps?: any) => {
    if (!currentProject) return;
    hideSidebarOnEdit();

    const newNodeId = `node-${Date.now()}`;
    const xPos = Math.floor(Math.random() * 200) + 200;
    const yPos = Math.floor(Math.random() * 200) + 150;

    const newNode: CustomCanvasNode = {
      id: newNodeId,
      type,
      position: { x: xPos, y: yPos },
      data: {
        label: customLabel || `Nuevo ${type}`,
        nodeType: type,
        description: extraProps?.description || "",
        messageText: type === "message" ? "¡Hola! ¿En qué podemos ayudarte?" : undefined,
        buttons: type === "message" ? [{ id: "b1", label: "Opción 1" }] : undefined,
        noAnswerMinutes: type === "orchestrator" ? 30 : undefined,
        intents:
          type === "orchestrator"
            ? [{ id: "i1", name: "Consulta General", condition: "", isSalesBranch: false }]
            : undefined,
        fields:
          type === "capture"
            ? [{ name: "var_dato", type: "var", prompt: "Ingresa tu información:" }]
            : undefined,
        systemName: type === "integration" ? "CRM External" : undefined,
        endpoint: type === "integration" ? "https://api.crm.com/v1/..." : undefined,
        errorFallbackMessage:
          type === "integration"
            ? "Disculpa, hubo un problema. Te pasamos con un asesor."
            : undefined,
        typificationName: type === "closing" ? "Cierre Exitoso" : undefined,
        typificationDesc: type === "closing" ? "Finalización normal del chat" : undefined,
        salesStage: type === "stage" ? "Lead" : undefined,
        ...extraProps,
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
  };

  // Update Node from Inspector
  const handleUpdateNode = (updatedNode: CustomCanvasNode) => {
    setNodes((nds) => nds.map((n) => (n.id === updatedNode.id ? updatedNode : n)));
    setSelectedNode(updatedNode);
  };

  // Delete Node from Canvas
  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  };

  // Aplica operaciones de grafo propuestas por el Asistente IA
  const handleApplyOperations = useCallback(
    (ops: GraphOperation[]) => {
      ops.forEach((operation) => {
        switch (operation.op) {
          case "add_node": {
            const n = operation.node;
            if (!n || !n.id || !n.type) return;
            const newNode: CustomCanvasNode = {
              id: n.id,
              type: n.type,
              position: n.position || {
                x: Math.floor(Math.random() * 300) + 300,
                y: Math.floor(Math.random() * 300) + 200,
              },
              data: {
                label: n.data?.label || `Nuevo ${n.type}`,
                ...n.data,
                nodeType: n.type,
              },
            };
            setNodes((nds) =>
              nds.some((existing) => existing.id === newNode.id) ? nds : [...nds, newNode]
            );
            break;
          }
          case "update_node": {
            if (!operation.id) return;
            setNodes((nds) =>
              nds.map((n) =>
                n.id === operation.id ? { ...n, data: { ...n.data, ...operation.data } } : n
              )
            );
            break;
          }
          case "delete_node": {
            if (!operation.id) return;
            setNodes((nds) => nds.filter((n) => n.id !== operation.id));
            setEdges((eds) =>
              eds.filter((e) => e.source !== operation.id && e.target !== operation.id)
            );
            break;
          }
          case "add_edge": {
            const e = operation.edge;
            if (!e || !e.source || !e.target) return;
            const newEdge: CustomCanvasEdge = {
              id: `e-ai-${e.source}-${e.target}-${Date.now()}`,
              source: e.source,
              target: e.target,
              sourceHandle: e.sourceHandle || undefined,
              label: e.label || undefined,
              animated: true,
              style: { stroke: "#FF5A00", strokeWidth: 2 },
            };
            setEdges((eds) => addEdge(newEdge, eds) as CustomCanvasEdge[]);
            break;
          }
          case "delete_edge": {
            if (!operation.id) return;
            setEdges((eds) => eds.filter((e) => e.id !== operation.id));
            break;
          }
        }
      });
    },
    [setNodes, setEdges]
  );

  // Select Project → abre el workspace en Canvas
  const handleSelectProject = (projectId: string) => {
    loadProjectData(projectId);
    setActiveView("canvas");
  };

  // Create Project
  const handleCreateProject = (project: Project) => {
    saveProject(project);
    loadProjectData(project.id);
    setActiveView("documents");
  };

  // Delete Project
  const handleDeleteProject = (projectId: string) => {
    deleteProject(projectId);
    const remaining = getProjects();
    setProjects(remaining);
    if (currentProject?.id === projectId) {
      if (remaining.length > 0) {
        loadProjectData(remaining[0].id);
      } else {
        setCurrentProject(undefined);
        setCurrentVersion(undefined);
        setNodes([]);
        setEdges([]);
        setKickoffItems([]);
      }
    }
  };

  // Create New Version
  const handleCreateNewVersion = () => {
    if (!currentProject) return;
    const newVer = createNewVersion(currentProject.id);
    setVersions(getDiagramVersions(currentProject.id));
    setCurrentVersion(newVer);
    hasHydratedRef.current = false;
    setNodes(newVer.graph.nodes || []);
    setEdges(newVer.graph.edges || []);
    setSaveStatus("idle");
  };

  // Cambiar estatus de la versión actual (borrador → revisión → aprobado)
  const handleChangeVersionStatus = (status: VersionStatus) => {
    if (!currentProject || !currentVersion) return;
    // Persistir primero el diagrama vigente antes de cambiar el estatus.
    const withGraph: DiagramVersion = { ...currentVersion, graph: { nodes, edges } };
    saveDiagramVersion(withGraph);
    const updated = setVersionStatus(currentVersion.id, status, authUser.name || undefined);
    if (updated) {
      setCurrentVersion(updated);
      setVersions(getDiagramVersions(currentProject.id));
      // Refleja el avance en el estatus del proyecto.
      if (status === "approved") {
        const p = { ...currentProject, status: "validated" as const };
        saveProject(p);
        setCurrentProject(p);
        setProjects(getProjects());
      }
    }
  };

  // Aplica una tanda de operaciones devueltas por autofix/IA sobre el canvas.
  const applyOps = (ops: GraphOperation[]) => handleApplyOperations(ops);

  // Autocorrección de un hallazgo (o de todos) usando IA
  const handleAutoFix = async (gaps: AuditGap[]) => {
    if (!currentProject || gaps.length === 0) return;
    setIsAutoFixing(true);
    try {
      const data = await aiFetch("/api/ai/autofix", {
        graph: { nodes, edges },
        gaps,
        clientName: currentProject.client_name,
        industry: currentProject.industry,
      });
      if (data.operations && Array.isArray(data.operations)) {
        applyOps(data.operations);
        // Re-auditar tras aplicar el parche (el motor exige reauditoría).
        setTimeout(() => handleRunAudit(), 600);
      }
    } catch (err) {
      console.error("Autofix failed", err);
    } finally {
      setIsAutoFixing(false);
    }
  };

  // Merge de preguntas generadas por la IA (desde Documentos)
  const handleKickoffItemsGenerated = (newItems: KickoffItem[]) => {
    setKickoffItems((prev) => {
      const merged = [...prev];
      newItems.forEach((ni) => {
        if (!merged.some((m) => m.question.toLowerCase() === ni.question.toLowerCase())) {
          merged.push(ni);
          saveKickoffItem(ni);
        }
      });
      return merged;
    });
  };

  // Run AI Audit
  const handleRunAudit = async () => {
    if (!currentProject) return;
    setIsRunningAudit(true);
    setActiveView("audit");
    setAuditError("");

    try {
      const data = await aiFetch("/api/ai/audit", {
        graph: { nodes, edges },
        kickoffItems,
        clientName: currentProject.client_name,
        industry: currentProject.industry,
      });

      if (data.error) {
        setAuditError(
          /api key|API_KEY|invalid/i.test(data.error)
            ? "La IA rechazó la API key. Ábre Configuración IA y usa 'Probar conexión'."
            : /not found|404/i.test(data.error)
            ? "El modelo seleccionado no existe. Cámbialo en Configuración IA."
            : `Error de IA: ${data.error}`
        );
        return;
      }
      setAuditResult(data);

      // Marca badges de advertencia en los nodos afectados
      if (data.gaps && Array.isArray(data.gaps)) {
        const gapMap = new Map<string, string>();
        data.gaps.forEach((g: AuditGap) => {
          if (g.nodeId) gapMap.set(g.nodeId, g.issue);
        });

        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            data: {
              ...n.data,
              hasWarnings: gapMap.has(n.id),
              warningText: gapMap.get(n.id) || "",
            },
          }))
        );
      }
    } catch (err) {
      console.error("Failed to run audit", err);
    } finally {
      setIsRunningAudit(false);
    }
  };

  const kickoffProgress = {
    answered: kickoffItems.filter((k) => k.status === "answered").length,
    total: kickoffItems.length,
  };

  const showCanvas = CANVAS_VIEWS.includes(activeView) && currentProject;
  const showSidebar = !isPresentationMode && !isSidebarHidden;

  return (
    <div className="h-screen w-screen bg-surface flex overflow-hidden font-sans text-ink">
      {/* SIDEBAR DE MÓDULOS (izquierda) */}
      {showSidebar && (
        <Sidebar
          activeView={activeView}
          onNavigate={(view) => {
            setActiveView(view);
            setSelectedNode(null);
            if (view === "documents" && currentProject) {
              setDocumentsCount(getDocuments(currentProject.id).length);
            }
          }}
          currentProject={currentProject}
          authUser={authUser}
          onOpenLogin={() => setIsLoginOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          auditScore={auditResult?.score}
          kickoffProgress={kickoffProgress}
          documentsCount={documentsCount}
        />
      )}

      {/* Botón para reabrir el menú cuando se ocultó al editar */}
      {!showSidebar && !isPresentationMode && (
        <button
          onClick={() => setIsSidebarHidden(false)}
          className="absolute bottom-4 left-4 z-30 p-2.5 bg-heading hover:bg-ink text-white rounded-xl shadow-lg transition-all active:scale-95"
          title="Mostrar menú principal"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 relative overflow-hidden flex">
        {activeView === "projects" ? (
          <div className="w-full h-full">
            <ProjectList
              projects={projects}
              currentProjectId={currentProject?.id || ""}
              onSelectProject={handleSelectProject}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
            />
          </div>
        ) : activeView === "documents" && currentProject ? (
          <DocumentsView
            key={currentProject.id}
            project={currentProject}
            onKickoffItemsGenerated={(items) => {
              handleKickoffItemsGenerated(items);
              setDocumentsCount(getDocuments(currentProject.id).length);
            }}
          />
        ) : activeView === "ficha" && currentProject ? (
          <div className="w-full h-full">
            <FichaTecnicaView
              project={currentProject}
              graph={{ nodes, edges }}
              kickoffItems={kickoffItems}
              comments={[]}
              version={currentVersion?.version || 1}
            />
          </div>
        ) : activeView === "resumen" && currentProject ? (
          <div className="w-full h-full">
            <ResumenAcuerdosView
              project={currentProject}
              graph={{ nodes, edges }}
              kickoffItems={kickoffItems}
              version={currentVersion?.version || 1}
              versionLabel={currentVersion?.label}
              versionStatus={currentVersion?.status || "draft"}
              documents={getDocuments(currentProject.id)}
            />
          </div>
        ) : showCanvas ? (
          /* CANVAS + PANELES LATERALES */
          <div className="w-full h-full flex relative">
            {/* CANVAS AREA */}
            <div className="flex-1 h-full relative">
              {!isPresentationMode && (
                <CanvasToolbar
                  onAddNode={handleAddNode}
                  versions={versions}
                  currentVersion={currentVersion}
                  onSelectVersion={(v) => {
                    setCurrentVersion(v);
                    saveDiagramVersion({ ...v, is_current: true });
                    hasHydratedRef.current = false;
                    setNodes(v.graph.nodes || []);
                    setEdges(v.graph.edges || []);
                    setSaveStatus("idle");
                  }}
                  onCreateNewVersion={handleCreateNewVersion}
                  onChangeVersionStatus={handleChangeVersionStatus}
                  saveStatus={saveStatus}
                  isPresentationMode={isPresentationMode}
                  onTogglePresentationMode={() => setIsPresentationMode(!isPresentationMode)}
                  onRunAudit={handleRunAudit}
                  onGenerateFicha={() => setActiveView("ficha")}
                  onToggleChat={() => setIsChatOpen((v) => !v)}
                  isChatOpen={isChatOpen}
                  auditScore={auditResult?.score}
                />
              )}

              {isPresentationMode && (
                <button
                  onClick={() => setIsPresentationMode(false)}
                  className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-heading text-white rounded-lg text-xs font-bold shadow-lg hover:bg-ink transition-colors"
                >
                  Salir de Pantalla Compartida
                </button>
              )}

              {/* El área de React Flow se inserta debajo de la barra superior y a la
                  derecha del palette para que ningún nodo quede oculto tras ellos. */}
              <div
                className={
                  isPresentationMode
                    ? "absolute inset-0"
                    : "absolute top-[68px] left-[168px] right-0 bottom-0"
                }
              >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onNodeDragStart={hideSidebarOnEdit}
                onInit={(instance) => {
                  rfRef.current = instance;
                  fitCanvas();
                }}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.14, maxZoom: 1 }}
                minZoom={0.2}
                proOptions={{ hideAttribution: true }}
                className="bg-surface"
              >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#D9D9D9" />
                <Controls position="bottom-left" showInteractive={false} />
                {!isPresentationMode && (
                  <MiniMap
                    position="bottom-right"
                    pannable
                    zoomable
                    ariaLabel="Mapa del flujo"
                    nodeStrokeWidth={3}
                    nodeBorderRadius={8}
                    maskColor="rgba(41,41,41,0.06)"
                    style={{ width: 200, height: 130 }}
                    nodeColor={nodeMiniMapColor}
                    nodeStrokeColor={nodeMiniMapColor}
                  />
                )}
              </ReactFlow>
              </div>
            </div>

            {/* PANEL LATERAL: KICKOFF o AUDITORÍA */}
            {activeView === "kickoff" && currentProject && (
              <div className="w-96 h-full shrink-0">
                <KickoffPanel
                  project={currentProject}
                  kickoffItems={kickoffItems}
                  onUpdateKickoffItems={(updated) => setKickoffItems(updated)}
                  onInsertNodeFromKickoff={(type, label, props) => handleAddNode(type, label, props)}
                />
              </div>
            )}

            {activeView === "audit" && currentProject && (
              <div className="w-96 h-full shrink-0">
                <AuditView
                  project={currentProject}
                  auditResult={auditResult}
                  auditError={auditError}
                  isRunningAudit={isRunningAudit}
                  isAutoFixing={isAutoFixing}
                  onRunAudit={handleRunAudit}
                  onAutoFixGap={(gap) => handleAutoFix([gap])}
                  onAutoFixAll={(gaps) => handleAutoFix(gaps)}
                  onSelectNodeInCanvas={(nodeId) => {
                    const found = nodes.find((n) => n.id === nodeId);
                    if (found) setSelectedNode(found);
                  }}
                />
              </div>
            )}

            {/* CHAT IA CON CONTEXTO DEL PROYECTO */}
            {isChatOpen && currentProject && !isPresentationMode && (
              <ChatPanel
                project={currentProject}
                graph={{ nodes, edges }}
                kickoffItems={kickoffItems}
                onApplyOperations={handleApplyOperations}
                onClose={() => setIsChatOpen(false)}
              />
            )}

            {/* INSPECTOR DE PROPIEDADES DEL NODO */}
            {selectedNode && currentVersion && !isPresentationMode && (
              <NodePropertyInspector
                node={selectedNode}
                diagramId={currentVersion.id}
                onClose={() => setSelectedNode(null)}
                onUpdateNode={handleUpdateNode}
                onDeleteNode={handleDeleteNode}
              />
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-soft text-sm">
            Selecciona un proyecto para comenzar.
          </div>
        )}
      </main>

      {/* LOGIN MODAL */}
      {isLoginOpen && (
        <LoginModal
          onLoginSuccess={(user) => {
            setAuthUser(user);
            setIsLoginOpen(false);
          }}
          onClose={() => setIsLoginOpen(false)}
        />
      )}

      {/* SETTINGS MODAL (config de IA) */}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
}
