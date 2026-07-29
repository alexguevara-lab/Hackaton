import { IndustryType, KickoffCategory } from "../types";
import { BASE_QUESTIONS, BaseQuestion } from "./baseQuestions";

export interface IndustryQuestion extends BaseQuestion {
  section: string;
  phase: "map" | "spec";
  priority: "high" | "medium" | "low";
}

export interface IndustryQuestionContext {
  industry: IndustryType;
  label: string;
  questions: IndustryQuestion[];
}

type QuestionEntry = readonly [id: string, question: string];

const questions = (
  prefix: string,
  section: string,
  category: KickoffCategory,
  topic: BaseQuestion["topic"],
  phase: IndustryQuestion["phase"],
  priority: IndustryQuestion["priority"],
  entries: readonly QuestionEntry[],
): IndustryQuestion[] =>
  entries.map(([id, question]) => ({
    id: `${prefix}_${id}`,
    section,
    category,
    topic,
    phase,
    priority,
    question,
  }));

const GENERAL_QUESTIONS: IndustryQuestion[] = [
  ...questions("gq_goal", "Objetivo y medición", "Generales", "measurement", "map", "high", [
    ["business_problem", "¿Qué problema del negocio debe resolver el bot?"],
    ["primary_metric", "¿Cuál es la métrica principal que se quiere impactar?"],
    ["current_value", "¿Cuál es el valor actual de esa métrica?"],
    ["target", "¿Cuál es la meta esperada y en qué periodo se medirá?"],
    ["success_criteria", "¿Qué condiciones determinarán que el proyecto fue exitoso?"],
  ]),
  ...questions("gq_scope", "Canal y alcance", "Generales", "scope", "map", "high", [
    ["included_processes", "¿Qué procesos están incluidos en el alcance?"],
    ["policies", "¿Qué restricciones o políticas debe respetar el bot?"],
    ["restricted_promises", "¿Qué información o promesas no debe comunicar?"],
    ["owners", "¿Qué equipos o responsables participan en el proceso?"],
  ]),
  ...questions("gq_data", "Captura y clasificación", "Captura de Datos", "data", "spec", "medium", [
    ["required_optional", "¿Qué datos son obligatorios, cuáles opcionales y cómo se valida cada uno?"],
    ["lead_definition", "¿Cuándo una persona se considera lead y cuándo lead calificado?"],
    ["existing_customer", "¿Qué debe ocurrir si el usuario ya existe?"],
    ["classifications", "¿Qué clasificaciones o tipificaciones deben registrarse?"],
  ]),
  ...questions("gq_flow", "Flujo y atención", "Rutas e Intenciones", "paths", "map", "high", [
    ["initial_menu", "¿Qué opciones debe presentar el menú inicial y cuáles son los recorridos principales?"],
    ["advisor_assignment", "¿Cuándo y cómo se asigna un asesor?"],
    ["out_of_hours", "¿Qué debe suceder fuera del horario laboral?"],
    ["unknown_answer", "¿Qué debe pasar si la IA no conoce la respuesta?"],
    ["restart", "¿Cómo puede el usuario regresar, cancelar o empezar nuevamente?"],
  ]),
  ...questions("gq_integration", "Integraciones", "Integraciones", "integration", "spec", "medium", [
    ["lookup_create", "¿Qué información debe consultarse, crearse o actualizarse en cada plataforma?"],
    ["record_identifier", "¿Cuál será el identificador para buscar registros existentes?"],
    ["retry_alert", "¿Debe realizarse un reintento y quién recibe la alerta ante un error?"],
    ["dependencies", "¿Existen límites, horarios o dependencias externas de la integración?"],
  ]),
];

const AUTOMOTRIZ_QUESTIONS: IndustryQuestion[] = [
  ...questions("auto_need", "Necesidad del cliente", "Rutas e Intenciones", "qualification", "map", "high", [
    ["vehicle_type", "¿Busca un vehículo nuevo, usado o ambos?"],
    ["model_interest", "¿Qué marca, modelo o categoría le interesa?"],
    ["budget", "¿Cuál es su presupuesto y tiene un vehículo para entregar como parte de pago?"],
    ["payment_type", "¿Desea comprar de contado o mediante financiamiento?"],
    ["location", "¿En qué ciudad o sede desea recibir atención?"],
  ]),
  ...questions("auto_goal", "Objetivo del flujo", "Rutas e Intenciones", "paths", "map", "high", [
    ["main_intent", "¿El objetivo es cotizar, agendar una prueba de manejo, consultar inventario o hablar con un asesor?"],
    ["multiple_intents", "¿El cliente puede completar más de uno de esos objetivos en la misma conversación?"],
    ["qualified_lead", "¿Qué información convierte al prospecto en un lead calificado?"],
    ["immediate_purchase", "¿Cómo debe priorizarse un prospecto con intención inmediata de compra?"],
  ]),
  ...questions("auto_catalog", "Inventario y catálogo", "Integraciones", "integration", "spec", "medium", [
    ["realtime_inventory", "¿El bot debe consultar inventario en tiempo real?"],
    ["unavailable_vehicle", "¿Qué sucede si el vehículo solicitado no está disponible y puede sugerir modelos similares?"],
    ["catalog_fields", "¿Qué información del vehículo puede mostrar: precio, promociones y disponibilidad?"],
    ["approval", "¿Qué información requiere aprobación antes de comunicarse?"],
  ]),
  ...questions("auto_test_drive", "Prueba de manejo", "Rutas e Intenciones", "paths", "spec", "medium", [
    ["booking_data", "¿Qué datos se necesitan para agendar una prueba de manejo?"],
    ["availability", "¿Cómo se consulta la disponibilidad por sede, fecha y hora?"],
    ["reschedule", "¿El cliente puede reagendar o cancelar?"],
    ["reminders", "¿Qué confirmaciones y recordatorios deben enviarse y qué pasa si no hay espacios?"],
  ]),
  ...questions("auto_finance", "Financiamiento", "Captura de Datos", "qualification", "spec", "medium", [
    ["qualification_data", "¿Qué datos se solicitan para evaluar financiamiento y habrá precalificación?"],
    ["rules", "¿Qué reglas determinan una precalificación favorable?"],
    ["processor", "¿Qué institución o sistema procesa la solicitud?"],
    ["escalation", "¿Qué debe comunicarse si no aplica y cuándo debe intervenir un asesor?"],
  ]),
  ...questions("auto_crm", "CRM o DMS", "Integraciones", "integration", "spec", "medium", [
    ["system", "¿Qué CRM o DMS utiliza el concesionario?"],
    ["existing_lead", "¿Debe buscarse primero si el prospecto ya existe?"],
    ["entity", "¿Se crea un lead, contacto, oportunidad o cita y qué campos se envían?"],
    ["routing_failure", "¿Cómo se asigna el lead entre sedes o asesores y qué ocurre si el CRM o DMS no responde?"],
  ]),
];

const EDUCACION_QUESTIONS: IndustryQuestion[] = [
  ...questions("edu_interest", "Interés académico", "Rutas e Intenciones", "qualification", "map", "high", [
    ["program", "¿Qué programa, carrera o curso le interesa al prospecto?"],
    ["level", "¿Qué nivel académico busca y qué modalidad prefiere: presencial, virtual o híbrida?"],
    ["campus", "¿Qué sede o campus le interesa y para qué periodo desea ingresar?"],
    ["related_programs", "¿El bot debe mostrar programas relacionados?"],
  ]),
  ...questions("edu_profile", "Perfilamiento", "Captura de Datos", "qualification", "map", "high", [
    ["academic_data", "¿Qué datos académicos debe capturar, incluido el último grado aprobado?"],
    ["residence", "¿Debe consultar país, ciudad o residencia?"],
    ["student_type", "¿Debe identificar si es estudiante nuevo, antiguo o reingreso?"],
    ["qualification_priority", "¿Qué condiciones definen un lead calificado y cuáles prospectos deben priorizarse?"],
  ]),
  ...questions("edu_admissions", "Programas y admisiones", "Rutas e Intenciones", "paths", "spec", "medium", [
    ["program_information", "¿Qué información debe responder sobre duración, modalidad, horarios y costos?"],
    ["requirements", "¿Qué requisitos de admisión debe comunicar?"],
    ["availability", "¿Qué pasa si el programa no está disponible y se ofrece otro periodo, sede o modalidad?"],
    ["application_data", "¿Qué información debe solicitar para iniciar la inscripción?"],
  ]),
  ...questions("edu_finance", "Financiamiento educativo", "Rutas e Intenciones", "paths", "spec", "medium", [
    ["offers", "¿Debe informar becas, descuentos o financiamiento y qué condiciones aplican?"],
    ["installments", "¿El bot puede calcular o mostrar cuotas?"],
    ["evaluation", "¿Debe redirigir a un proceso de evaluación y qué documentos solicita el área correspondiente?"],
  ]),
  ...questions("edu_followup", "Asignación y seguimiento", "Asignación Humana", "transfer", "spec", "medium", [
    ["assignment", "¿La asignación depende del programa, sede, país o modalidad?"],
    ["after_hours", "¿Qué ocurre fuera del horario de atención?"],
    ["followup", "¿Cuántos seguimientos deben realizarse y qué pasa si el estudiante abandona el proceso?"],
    ["remarketing", "¿Debe ejecutarse remarketing automático?"],
  ]),
  ...questions("edu_crm", "CRM académico", "Integraciones", "integration", "spec", "medium", [
    ["system", "¿Qué CRM o sistema académico se utiliza?"],
    ["existing_student", "¿Debe buscarse si el prospecto ya existe?"],
    ["entity_stage", "¿Qué entidad, campos y etapa deben crearse o actualizarse?"],
    ["failure", "¿Qué ocurre si la integración falla?"],
  ]),
];

const FINANCIERO_QUESTIONS: IndustryQuestion[] = [
  ...questions("fin_product", "Producto solicitado", "Rutas e Intenciones", "qualification", "map", "high", [
    ["type", "¿Qué producto financiero busca: crédito, tarjeta, seguro, ahorro u otro?"],
    ["amount_term", "¿Qué monto, plazo y uso previsto necesita?"],
    ["customer_status", "¿Ya es cliente de la institución?"],
  ]),
  ...questions("fin_eligibility", "Perfil y elegibilidad", "Rutas e Intenciones", "qualification", "map", "high", [
    ["data", "¿Qué datos y requisitos mínimos se necesitan para evaluar al cliente?"],
    ["preapproval", "¿Qué condiciones generan una preaprobación, rechazo o un perfil especial?"],
    ["advisor", "¿Cuándo debe escalarse el caso a un asesor?"],
  ]),
  ...questions("fin_security", "Identidad y seguridad", "Captura de Datos", "data", "spec", "high", [
    ["identity", "¿Cómo se validará la identidad: documento, OTP, preguntas de seguridad o biometría?"],
    ["consents", "¿Qué autorizaciones debe aceptar el cliente?"],
    ["sensitive_data", "¿Qué datos sensibles no deben mostrarse y cuándo debe detenerse el flujo por seguridad?"],
  ]),
  ...questions("fin_risk", "Riesgo y terceros", "Integraciones", "integration", "spec", "high", [
    ["credit_bureau", "¿Debe consultarse una central de riesgo y qué sistemas externos participan?"],
    ["data_exchange", "¿Qué información se envía, recibe y cómo se interpreta la respuesta?"],
    ["outage", "¿Qué sucede si la consulta está caída: puede continuarse manualmente o debe detenerse?"],
  ]),
  ...questions("fin_result", "Resultado y comunicación", "Rutas e Intenciones", "paths", "spec", "high", [
    ["approval_language", "¿Qué puede comunicar el bot sobre una preaprobación y qué mensajes requieren aprobación legal?"],
    ["rejection", "¿Qué motivos de rechazo pueden mostrarse?"],
    ["next_steps", "¿Qué documentos o pasos siguen y cómo se agenda una llamada o cita con un asesor?"],
  ]),
  ...questions("fin_integration", "Integración", "Integraciones", "integration", "spec", "high", [
    ["registration", "¿En qué sistema se registra la solicitud y debe buscarse primero si el cliente existe?"],
    ["fields", "¿Qué campos se crean o actualizan y cómo se registra consentimiento y trazabilidad?"],
    ["failure_notification", "¿Qué pasa si la creación falla y quién debe ser notificado?"],
  ]),
];

const INDUSTRY_QUESTIONS: Partial<Record<IndustryType, IndustryQuestion[]>> = {
  automotriz: AUTOMOTRIZ_QUESTIONS,
  educacion: EDUCACION_QUESTIONS,
  financiero: FINANCIERO_QUESTIONS,
};

const INDUSTRY_LABELS: Record<IndustryType, string> = {
  ecommerce: "E-Commerce",
  salud: "Salud",
  financiero: "Servicios financieros",
  inmobiliario: "Inmobiliario",
  automotriz: "Automotriz",
  educacion: "Educación",
  otro: "General",
};

const coreQuestions = (): IndustryQuestion[] =>
  BASE_QUESTIONS.map((question) => ({
    ...question,
    section: question.section || "Motor canónico de onboarding",
    phase: question.phase || (question.topic === "data" || question.topic === "integration" ? "spec" : "map"),
    priority: question.priority || "high",
  }));

export function getQuestionsForIndustry(industry: IndustryType): IndustryQuestion[] {
  return [...coreQuestions(), ...GENERAL_QUESTIONS, ...(INDUSTRY_QUESTIONS[industry] || [])];
}

/** Preguntas que deben aparecer primero en el análisis y kick-off del mapa visual. */
export function getAnalysisQuestionsForIndustry(industry: IndustryType): IndustryQuestion[] {
  return getQuestionsForIndustry(industry).filter((question) => question.phase === "map");
}

/** Perfil completo para dar a la IA contexto conceptual, sin convertir todo en pendientes inmediatos. */
export function getIndustryQuestionContext(industry: IndustryType): IndustryQuestionContext {
  return {
    industry,
    label: INDUSTRY_LABELS[industry],
    questions: getQuestionsForIndustry(industry),
  };
}
