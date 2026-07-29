import React, { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Building2,
  Sparkles,
  ShoppingBag,
  Stethoscope,
  Landmark,
  Home,
  ArrowRight,
  MoreVertical,
  Trash2,
  Layers,
} from "lucide-react";
import { Project, IndustryType, ProjectStatus } from "../../types";

interface ProjectListProps {
  projects: Project[];
  currentProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  currentProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Project Form State
  const [clientName, setClientName] = useState("");
  const [industry, setIndustry] = useState<IndustryType>("ecommerce");
  const [brandColor, setBrandColor] = useState("#FF5A00");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [description, setDescription] = useState("");

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.client_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = selectedIndustry === "all" || p.industry === selectedIndustry;
    return matchesSearch && matchesIndustry;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    const newProject: Project = {
      id: `proj-${Date.now()}`,
      client_name: clientName.trim(),
      industry,
      brand_color: brandColor,
      brand_logo_url: brandLogoUrl || undefined,
      description: description || `Proyecto de Onboarding para ${clientName}`,
      status: "kickoff",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onCreateProject(newProject);
    setIsModalOpen(false);
    // Reset
    setClientName("");
    setDescription("");
  };

  const getIndustryBadge = (ind: IndustryType) => {
    switch (ind) {
      case "ecommerce":
        return { label: "E-Commerce", icon: <ShoppingBag className="w-3 h-3" />, color: "bg-primary-soft text-primary border-primary/30" };
      case "salud":
        return { label: "Salud", icon: <Stethoscope className="w-3 h-3" />, color: "bg-primary-soft text-primary border-primary/30" };
      case "financiero":
        return { label: "Financiero", icon: <Landmark className="w-3 h-3" />, color: "bg-success-soft text-success border-success/30" };
      case "inmobiliario":
        return { label: "Inmobiliario", icon: <Home className="w-3 h-3" />, color: "bg-warning-soft text-warning border-warning/30" };
      default:
        return { label: "General", icon: <Building2 className="w-3 h-3" />, color: "bg-surface text-ink border-line" };
    }
  };

  return (
    <div className="h-full bg-surface p-6 flex flex-col text-ink overflow-y-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-line">
        <div>
          <h1 className="text-2xl font-extrabold text-heading tracking-tight flex items-center gap-2">
            <span>AtomScope Projects</span>
          </h1>
          <p className="text-xs text-ink-soft mt-1 font-medium">
            Gestión de cuentas para llamadas de Onboarding Kick-off en vivo
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Proyecto / Cliente</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="my-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-soft absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por cliente o empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-line rounded-xl pl-9 pr-4 py-2 text-xs text-heading focus:outline-none focus:ring-2 focus:ring-primary shadow-xs font-medium"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-ink-soft shrink-0" />
          {["all", "ecommerce", "salud", "financiero", "inmobiliario"].map((ind) => (
            <button
              key={ind}
              onClick={() => setSelectedIndustry(ind)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-all ${
                selectedIndustry === ind
                  ? "bg-primary text-white shadow-xs"
                  : "bg-white text-ink-soft border border-line hover:bg-surface"
              }`}
            >
              {ind === "all" ? "Todas las Industrias" : ind}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProjects.map((p) => {
          const badge = getIndustryBadge(p.industry);
          const isSelected = p.id === currentProjectId;

          return (
            <div
              key={p.id}
              className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between group shadow-sm ${
                isSelected
                  ? "bg-white border-primary ring-2 ring-primary/20 shadow-xl"
                  : "bg-white border-line hover:border-line hover:shadow-md"
              }`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    {p.brand_logo_url ? (
                      <img
                        src={p.brand_logo_url}
                        alt={p.client_name}
                        className="w-10 h-10 rounded-xl object-cover border border-line shrink-0"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md shrink-0"
                        style={{ backgroundColor: p.brand_color || "#FF5A00" }}
                      >
                        {p.client_name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-heading text-sm group-hover:text-primary transition-colors">
                        {p.client_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-1 ${badge.color}`}
                        >
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`¿Eliminar proyecto ${p.client_name}?`)) onDeleteProject(p.id);
                    }}
                    className="p-1 text-ink-soft hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-ink-soft line-clamp-2 mb-4 leading-relaxed font-medium">
                  {p.description}
                </p>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-line flex items-center justify-between">
                <span className="text-[10px] text-ink-soft font-mono font-medium">
                  Actualizado: {new Date(p.updated_at).toLocaleDateString()}
                </span>

                <button
                  onClick={() => onSelectProject(p.id)}
                  className="px-3 py-1.5 bg-primary-soft hover:bg-primary text-primary hover:text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-all border border-primary/30"
                >
                  <span>Abrir Canvas Kickoff</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE PROJECT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-heading/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-heading flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>Crear Nuevo Proyecto de Onboarding</span>
            </h3>

            <form onSubmit={handleCreate} className="space-y-4 text-xs text-ink">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Nombre del Cliente / Empresa:</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej: Mercado Global, Banco Financiero, Clínica Norte"
                  className="w-full bg-white border border-line rounded-xl px-3 py-2 text-heading text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Industria (Plantilla Preloaded):</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value as IndustryType)}
                    className="w-full bg-white border border-line rounded-xl px-3 py-2 text-heading text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                  >
                    <option value="ecommerce">E-Commerce</option>
                    <option value="salud">Salud / Médica</option>
                    <option value="financiero">Financiero / Fintech</option>
                    <option value="inmobiliario">Inmobiliario / Constructora</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Color de Marca (Branding):</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-line bg-transparent"
                    />
                    <input
                      type="text"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="flex-1 bg-white border border-line rounded-xl px-3 py-1.5 text-heading text-xs font-mono font-medium"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">URL Logo del Cliente (opcional):</label>
                <input
                  type="url"
                  value={brandLogoUrl}
                  onChange={(e) => setBrandLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-white border border-line rounded-xl px-3 py-2 text-heading text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Descripción del Bot / Alcance:</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Atención al cliente en WhatsApp, calificación de ventas e integración con CRM..."
                  className="w-full bg-white border border-line rounded-xl px-3 py-2 text-heading text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-surface hover:bg-line text-ink font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Crear Proyecto & Cargar Plantilla</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
