import React from "react";
import {
  FolderKanban,
  Layers,
  Sparkles,
  Paperclip,
  ShieldAlert,
  FileCode,
  FileText,
  User,
  ChevronLeft,
  Settings,
} from "lucide-react";
import { Project, AuthUser } from "../../types";

export type AppView =
  | "projects"
  | "canvas"
  | "kickoff"
  | "documents"
  | "audit"
  | "ficha"
  | "resumen";

interface SidebarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  currentProject: Project | undefined;
  authUser: AuthUser;
  onOpenLogin: () => void;
  onOpenSettings: () => void;
  auditScore?: number;
  kickoffProgress?: { answered: number; total: number };
  documentsCount?: number;
}

const NavButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: React.ReactNode;
}> = ({ active, onClick, icon, label, badge }) => (
  <button
    onClick={onClick}
    className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-2.5 text-xs font-bold transition-all ${
      active
        ? "bg-primary text-white shadow-md"
        : "text-ink-soft hover:bg-primary-soft hover:text-primary"
    }`}
  >
    <span className="shrink-0">{icon}</span>
    <span className="flex-1 text-left truncate">{label}</span>
    {badge}
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigate,
  currentProject,
  authUser,
  onOpenLogin,
  onOpenSettings,
  auditScore,
  kickoffProgress,
  documentsCount,
}) => {
  return (
    <aside className="w-60 h-full shrink-0 bg-card border-r border-line flex flex-col select-none">
      {/* Logo */}
      <div className="p-4 border-b border-line flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center font-bold text-white text-lg shadow-md">
          A
        </div>
        <div>
          <h1 className="text-base font-bold leading-none text-heading tracking-tight">
            Atom<span className="text-primary">Scope</span>
          </h1>
          <p className="text-[9px] text-ink-soft font-medium uppercase tracking-wider mt-0.5">
            Kickoff &amp; Flow Design
          </p>
        </div>
      </div>

      {/* Módulos principales */}
      <div className="p-3 space-y-1">
        <span className="px-2 text-[10px] font-bold text-ink-soft uppercase tracking-wider">
          Módulos
        </span>
        <NavButton
          active={activeView === "projects"}
          onClick={() => onNavigate("projects")}
          icon={<FolderKanban className="w-4 h-4" />}
          label="Proyectos"
        />
        <button
          onClick={onOpenSettings}
          className="w-full px-3 py-2.5 rounded-lg flex items-center gap-2.5 text-xs font-bold text-ink-soft hover:bg-primary-soft hover:text-primary transition-all"
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">Configuración IA</span>
        </button>
      </div>

      {/* Submódulos del proyecto seleccionado */}
      {currentProject && (
        <div className="p-3 pt-1 space-y-1 flex-1 overflow-y-auto">
          <div className="mx-1 mb-2 p-2.5 rounded-lg bg-primary-soft border border-line flex items-center gap-2">
            {currentProject.brand_logo_url ? (
              <img
                src={currentProject.brand_logo_url}
                alt={currentProject.client_name}
                className="w-7 h-7 rounded-md object-cover border border-line shrink-0"
              />
            ) : (
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-white text-[10px] shrink-0"
                style={{ backgroundColor: currentProject.brand_color || "#FF5A00" }}
              >
                {currentProject.client_name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-[11px] font-bold text-heading truncate">
                {currentProject.client_name}
              </p>
              <p className="text-[9px] text-ink-soft capitalize">{currentProject.industry}</p>
            </div>
          </div>

          <span className="px-2 text-[10px] font-bold text-ink-soft uppercase tracking-wider">
            Proyecto
          </span>

          <NavButton
            active={activeView === "canvas"}
            onClick={() => onNavigate("canvas")}
            icon={<Layers className="w-4 h-4" />}
            label="Canvas del Flujo"
          />
          <NavButton
            active={activeView === "kickoff"}
            onClick={() => onNavigate("kickoff")}
            icon={<Sparkles className="w-4 h-4" />}
            label="Guía Kick-off"
            badge={
              kickoffProgress && kickoffProgress.total > 0 ? (
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    kickoffProgress.answered === kickoffProgress.total
                      ? "bg-success-soft text-success"
                      : activeView === "kickoff"
                      ? "bg-white/20 text-white"
                      : "bg-warning-soft text-warning"
                  }`}
                >
                  {kickoffProgress.answered}/{kickoffProgress.total}
                </span>
              ) : undefined
            }
          />
          <NavButton
            active={activeView === "documents"}
            onClick={() => onNavigate("documents")}
            icon={<Paperclip className="w-4 h-4" />}
            label="Documentos"
            badge={
              documentsCount ? (
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    activeView === "documents" ? "bg-white/20 text-white" : "bg-surface text-ink-soft"
                  }`}
                >
                  {documentsCount}
                </span>
              ) : undefined
            }
          />
          <NavButton
            active={activeView === "audit"}
            onClick={() => onNavigate("audit")}
            icon={<ShieldAlert className="w-4 h-4" />}
            label="Auditoría IA"
            badge={
              auditScore !== undefined ? (
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    auditScore >= 90
                      ? "bg-success-soft text-success"
                      : auditScore >= 70
                      ? "bg-warning-soft text-warning"
                      : "bg-danger-soft text-danger"
                  }`}
                >
                  {auditScore}%
                </span>
              ) : undefined
            }
          />

          <span className="px-2 pt-2 block text-[10px] font-bold text-ink-soft uppercase tracking-wider">
            Entregables
          </span>
          <NavButton
            active={activeView === "ficha"}
            onClick={() => onNavigate("ficha")}
            icon={<FileCode className="w-4 h-4" />}
            label="Ficha Técnica"
          />
          <NavButton
            active={activeView === "resumen"}
            onClick={() => onNavigate("resumen")}
            icon={<FileText className="w-4 h-4" />}
            label="Acuerdos Cliente"
          />

          <button
            onClick={() => onNavigate("projects")}
            className="w-full mt-3 px-3 py-2 rounded-lg flex items-center gap-2 text-[11px] font-bold text-ink-soft hover:text-primary hover:bg-primary-soft transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Volver a proyectos</span>
          </button>
        </div>
      )}

      {!currentProject && <div className="flex-1" />}

      {/* Usuario */}
      <div className="p-3 border-t border-line">
        <div
          onClick={onOpenLogin}
          className="flex items-center gap-2.5 cursor-pointer bg-surface hover:bg-primary-soft px-3 py-2 rounded-lg border border-line transition-colors"
        >
          <div className="w-7 h-7 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <p className="text-[11px] font-bold text-heading leading-none truncate">{authUser.name}</p>
            <p className="text-[9px] text-ink-soft leading-none mt-1 truncate">{authUser.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
