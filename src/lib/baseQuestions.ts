// Base canónica de preguntas del motor de Onboarding.
// El análisis de documentos evalúa CADA una: si el SOW/baseline ya la responde
// la marca "answered" con evidencia; si no, queda "pending" para el kick-off.
// Las categorías siguen la priorización del motor (alcance → activación → caminos →
// calificación → datos → integraciones → transferencias → recuperos → cierres → medición).

import { KickoffCategory } from "../types";

export interface BaseQuestion {
  id: string;
  topic:
    | "scope"
    | "activation"
    | "paths"
    | "qualification"
    | "data"
    | "integration"
    | "transfer"
    | "recovery"
    | "closure"
    | "measurement";
  category: KickoffCategory;
  question: string;
  /** Metadatos opcionales para catálogos contextuales por industria. */
  section?: string;
  phase?: "map" | "spec";
  priority?: "high" | "medium" | "low";
}

export const BASE_QUESTIONS: BaseQuestion[] = [
  // Alcance / Generales
  { id: "bq_scope_usecases", topic: "scope", category: "Generales", question: "¿Cuáles son los casos de uso incluidos en el alcance (ventas, servicio, otros) según el SOW?" },
  { id: "bq_scope_excluded", topic: "scope", category: "Generales", question: "¿Qué queda explícitamente fuera del alcance del bot (lo que el AI Agent NO hará)?" },
  { id: "bq_scope_tone", topic: "scope", category: "Generales", question: "¿Cuál es el tono y estilo de comunicación acordado con la marca?" },
  // Activación
  { id: "bq_act_channel", topic: "activation", category: "Generales", question: "¿Cuál es el canal y el tipo de tráfico de entrada (inbound WhatsApp, formularios, campañas)?" },
  { id: "bq_act_trigger", topic: "activation", category: "Rutas e Intenciones", question: "¿Qué dispara el inicio de la conversación y bajo qué condiciones entra el usuario al flujo?" },
  // Caminos / Rutas
  { id: "bq_paths_main", topic: "paths", category: "Rutas e Intenciones", question: "¿Cuáles son las rutas principales del orquestador y qué intención resuelve cada una?" },
  { id: "bq_paths_saleservice", topic: "paths", category: "Rutas e Intenciones", question: "¿Qué ramas son de venta (con etapas) y cuáles de servicio (sin etapas)?" },
  { id: "bq_paths_noanswer", topic: "recovery", category: "Rutas e Intenciones", question: "¿Cuál es el tiempo de recupero sin respuesta (no_answer_minutes) y qué acción sigue?" },
  // Calificación
  { id: "bq_qual_criteria", topic: "qualification", category: "Rutas e Intenciones", question: "¿Qué condición observable califica un lead en cada etapa del funnel (Awareness→Lead→MQL→SQL)?" },
  // Datos
  { id: "bq_data_fields", topic: "data", category: "Captura de Datos", question: "¿Qué datos se capturan en cada rama y con qué pregunta/prompt?" },
  { id: "bq_data_ids", topic: "data", category: "Captura de Datos", question: "¿Los campos custom_ ya existen en Atom (con ID) o se crean nuevos?" },
  // Integraciones
  { id: "bq_int_systems", topic: "integration", category: "Integraciones", question: "¿Con qué sistemas se integra (CRM/pasarela/BD), en qué momento y qué dato entra y sale?" },
  { id: "bq_int_error", topic: "integration", category: "Integraciones", question: "¿Qué mensaje empático y acción de fallback ocurre si una integración falla?" },
  // Transferencias / Asignación
  { id: "bq_transfer_dest", topic: "transfer", category: "Asignación Humana", question: "Cuando se pasa a asesor, ¿a qué grupo se transfiere, con qué contexto y en qué horario?" },
  // Cierres
  { id: "bq_closure_typ", topic: "closure", category: "Cierres", question: "¿Qué tipificaciones de cierre existen y si ya están en Atom (ID) o son nuevas?" },
  { id: "bq_closure_all", topic: "closure", category: "Cierres", question: "¿Toda rama termina en un cierre o transferencia, sin caminos abiertos?" },
  // Medición
  { id: "bq_meas_kpis", topic: "measurement", category: "Generales", question: "¿Qué KPIs y baseline se usarán para medir el desempeño del bot?" },
];
