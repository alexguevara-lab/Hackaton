import React, { useState } from "react";
import { ArrowRight, Check, Lock, ShieldCheck, Sparkles, User, UserPlus } from "lucide-react";
import type { AuthUser } from "../../types";
import { isSupabaseConfigured, supabase, toAuthUser } from "../../lib/supabase";

interface LoginModalProps {
  onLoginSuccess: (user: AuthUser) => void;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, onClose }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Onboarding Manager");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) {
      setErrorMessage("Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name, role } },
        });
        if (error) throw error;

        if (!data.session || !data.user) {
          setIsSubmitted(true);
          return;
        }

        const user = await toAuthUser(data.user);
        onLoginSuccess(user);
        onClose?.();
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) throw error || new Error("No fue posible iniciar sesión.");

      const user = await toAuthUser(data.user);
      onLoginSuccess(user);
      onClose?.();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible completar la autenticación.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-heading/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md space-y-5 overflow-hidden rounded-3xl border border-line bg-white p-6 shadow-2xl">
        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />

        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary-soft text-primary shadow-sm">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-heading">AtomScope Login</h2>
          <p className="mx-auto max-w-xs text-xs font-medium text-ink-soft">
            Acceso al portal de onboarding para llamadas en vivo con clientes Atom.
          </p>
        </div>

        {isSubmitted ? (
          <div className="space-y-3 rounded-2xl border border-success/30 bg-success-soft p-6 text-center shadow-xs">
            <Check className="mx-auto h-10 w-10 text-success" />
            <h3 className="text-sm font-bold text-heading">Revisa tu correo</h3>
            <p className="text-xs font-medium text-ink-soft">
              Confirma tu dirección de correo y luego inicia sesión.
            </p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4 text-xs text-ink">
            {isRegistering && (
              <div>
                <label className="mb-1 block text-xs font-bold text-ink">Nombre completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-ink-soft" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-xl border border-line bg-white py-2 pl-9 pr-4 font-medium text-heading focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-bold text-ink">Correo electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 font-medium text-heading focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-ink">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-ink-soft" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-line bg-white py-2 pl-9 pr-4 font-medium text-heading focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {isRegistering && (
              <div>
                <label className="mb-1 block text-xs font-bold text-ink">Rol / cargo</label>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 font-medium text-heading focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Onboarding Manager">Onboarding Manager (OB Leader)</option>
                  <option value="Bot Architect">Bot Architect Specialist</option>
                  <option value="Customer Success Lead">Customer Success Lead</option>
                </select>
              </div>
            )}

            {errorMessage && (
              <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 font-medium text-danger">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || !isSupabaseConfigured}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{isLoading ? "Procesando..." : isRegistering ? "Crear cuenta" : "Ingresar al portal"}</span>
              {isRegistering ? <UserPlus className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRegistering((value) => !value);
                setErrorMessage(null);
              }}
              className="w-full font-bold text-primary hover:underline"
            >
              {isRegistering ? "Ya tengo cuenta" : "Crear una cuenta"}
            </button>
          </form>
        )}

        <div className="flex items-center justify-center gap-1 text-center text-[10px] font-medium text-ink-soft">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          <span>Autenticación gestionada por Supabase</span>
        </div>
      </div>
    </div>
  );
};
