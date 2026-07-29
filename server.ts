import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Carga .env.local (y .env) para ejecución local; en AI Studio el entorno inyecta las claves.
dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

const DEFAULT_MODEL = "gemini-3.6-flash";

// Initialize Gemini Client. Prioriza la key enviada desde la UI (config del proyecto);
// si viene vacía, usa la GEMINI_API_KEY del entorno (.env.local).
const getGeminiClient = (overrideKey?: string) => {
  const apiKey = (overrideKey && overrideKey.trim()) || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is missing. AI features will fallback or return errors.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "dummy-key",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Extrae la config de IA (key + modelo) que la UI envía en el body.
const resolveAI = (body: any) => {
  const config = body?.config || {};
  return {
    ai: getGeminiClient(config.apiKey),
    model: (config.model && String(config.model).trim()) || DEFAULT_MODEL,
  };
};

// --- API ROUTES ---

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * 1. ANALYZE CONTEXT
 * Analyzes uploaded documents (briefs, catalogs, FAQs) and generates context summary + kick-off items checklist (§6).
 */
app.post("/api/ai/analyze-context", async (req, res) => {
  try {
    const { documentTexts, clientName, industry, description, baseQuestions } = req.body;
    const { ai, model } = resolveAI(req.body);

    const prompt = `
Eres un Arquitecto de Bots Senior para Atom (Atom Chat / WhatsApp Business).
Analiza el contexto de la empresa "${clientName || "Cliente"}" (Industria: ${industry || "General"}, Descripción: ${description || "Sin descripción"}).

## Documentos requeridos del análisis inicial
- **SOW (Statement of Work)**: es la FUENTE DE VERDAD del alcance prometido al cliente. De aquí salen los
  casos de uso (ventas/servicio), integraciones (ej. HubSpot CRM, WhatsApp Business API), lo que el AI Agent
  SÍ hace y lo que NO hace, fases, requisitos críticos y fechas. El mapa visual y el bot NO deben prometer
  nada fuera de este alcance.
- **Baseline Onboarding**: define el funnel de calificación de leads con las etapas de Atom
  (Awareness → Lead → MQL → SQL → Opportunity) y los KPIs. Úsalo para saber qué etapas de venta marcar y
  qué datos de calificación se capturan. NO analices los números por cuenta; solo la definición del funnel.

Documentos adjuntos / Contexto extraído:
${documentTexts && documentTexts.length > 0 ? documentTexts.join("\n\n---\n\n") : "No se subieron documentos aún."}

## Base de preguntas del motor (obligatoria)
Evalúa CADA UNA de estas preguntas base contra los documentos. Este es el motor de preguntas: no inventes
preguntas arbitrarias, parte de esta base y complétala.
${baseQuestions && baseQuestions.length ? JSON.stringify(baseQuestions, null, 2) : "(sin base recibida; usa el checklist §6)"}

Para cada pregunta base:
- Si los documentos la responden de forma suficiente → status "answered", con la respuesta detectada y cita breve de la evidencia (documento/sección).
- Si no hay evidencia suficiente, es ambigua o contradictoria → status "pending" (queda para resolver en el kick-off).
- Conserva su "id" y "category" originales.
Además, agrega preguntas EXTRA solo si detectas vacíos relevantes no cubiertos por la base.

Tu objetivo:
1. Resumir el ALCANCE del SOW (qué hará y qué NO hará el bot, integraciones, casos de uso, fases).
2. Evaluar la información faltante en DOS niveles secuenciales:
   a) **Mapa visual** (lo mínimo para dibujar el diagrama de flujo con el cliente): rutas/intenciones del
      orquestador, ramas de venta vs servicio, puntos de integración, dónde se pasa a humano, cierres.
   b) **Ficha técnica / MD** (el detalle que exige la Skill de Atom para generar el bot): prompts exactos,
      IDs de campos custom y tipificaciones, endpoints/auth/body de las integraciones, horarios de asesores,
      textos definitivos, no_answer_minutes.
3. Devolver el estado de CADA pregunta base + las extra, clasificadas en el checklist de Atom (§6):
   Generales, Rutas e Intenciones, Captura de Datos, Cierres, Integraciones, Asignación Humana.

Devuelve ÚNICAMENTE un JSON válido con esta estructura:
{
  "scopeSummary": "Resumen del alcance del SOW en 1-2 párrafos: casos de uso, integraciones, qué NO hace, fases.",
  "summary": "Resumen ejecutivo del contexto conocido.",
  "detectedTone": "Tono recomendado",
  "detectedGoal": "Objetivo principal del bot",
  "mapReadiness": {
    "ready": false,
    "missing": ["Lista concreta de la información que aún falta para poder dibujar el mapa visual"]
  },
  "specReadiness": {
    "ready": false,
    "missing": ["Lista concreta de lo que faltará para generar el MD técnico final, aun cuando el mapa ya esté"]
  },
  "kickoffItems": [
    {
      "baseId": "id de la pregunta base si aplica (o vacío para extra)",
      "category": "Generales" | "Rutas e Intenciones" | "Captura de Datos" | "Cierres" | "Integraciones" | "Asignación Humana",
      "question": "Pregunta concreta para el cliente",
      "answer": "Respuesta detectada en los documentos + evidencia (o vacía si falta)",
      "status": "answered" | "pending",
      "source": "ai"
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);
    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/ai/analyze-context:", error);
    res.status(500).json({ error: error.message || "Error al analizar el contexto con IA" });
  }
});

/**
 * 2. AUDIT FLOW
 * Validates graph JSON + kickoff items against Atom Skill imperatives (§6) and lists gaps.
 */
app.post("/api/ai/audit", async (req, res) => {
  try {
    const { graph, kickoffItems, clientName, industry } = req.body;
    const { ai, model } = resolveAI(req.body);

    const prompt = `
Eres un Auditor Estricto del Flujo de Atom.
Revisa el diagrama visual (React Flow nodes/edges) y las respuestas del kick-off para la cuenta "${clientName || "Cliente"}" (Industria: ${industry || "General"}).

Reglas de Auditoría Estrictas Atom (§6):
1. Smarton / Orquestador:
   - Debe tener configurado recupero sin respuesta ('no_answer_minutes' ej 30 min, 4 hrs).
   - Cada rama derivada debe especificar si es 'venta' (requiere etapas Awareness->Lead->MQL->SQL) o 'servicio' (sin etapas).
2. Nodos de Mensaje / Botones:
   - Labels de botones <= 20 caracteres.
   - Textos de mensajes <= 300 caracteres recomendados.
3. Integraciones (HTTP / CRM):
   - Todo nodo de Integración DEBE tener una rama de error/fallback explícita (mensaje empático + derivación o reintento). NUNCA mostrar "Error de API" o dejar la salida fallida desconectada.
   - Debe especificar método, URL/endpoint y variable de salida.
4. Captura de Datos (Save Fields):
   - Debe definir si los campos custom_ ya existen en Atom (con ID) o si son nuevos.
5. Cierres / Tipificaciones:
   - Toda rama del diagrama DEBE terminar en una Tipificación de cierre o un Jump. No deben quedar ramas sueltas o inconclusas.
   - Nombre de tipificación debe ser <= 20 caracteres con descripción clara.
   - Debe especificar si la tipificación ya existe en Atom (ID) o es nueva.
6. Asignación Humana:
   - Debe indicar grupo/equipo de destino, horario de atención y mensaje de transición.

Diagrama actual (Nodes and Edges):
${JSON.stringify(graph, null, 2)}

Checklist Respuestas Kick-off:
${JSON.stringify(kickoffItems, null, 2)}

Devuelve ÚNICAMENTE un JSON estructurado con la siguiente lista de hallazgos / auditoría:
{
  "score": 85, // Puntaje de completitud de 0 a 100
  "isReady": false, // true si no hay hallazgos de severidad "blocking"
  "gaps": [
    {
      "nodeId": "id_del_nodo_afectado_o_null",
      "nodeName": "Nombre del nodo o categoría",
      "category": "Generales" | "Rutas" | "Captura" | "Cierres" | "Integraciones" | "Asignación",
      "severity": "blocking" | "warning" | "info", // "blocking" para 6.1-6.6 no cumplidos; "warning" para 6.7-6.8
      "issue": "Descripción clara del problema",
      "suggestion": "Instrucción exacta para corregirlo",
      "autoFixAvailable": true
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);
    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/ai/audit:", error);
    res.status(500).json({ error: error.message || "Error al auditar el diagrama" });
  }
});

/**
 * 3. GENERATE FICHA TÉCNICA (Markdown)
 * Translates canvas diagram + kickoff answers + comments into complete Markdown Spec for Atom Skill (§7).
 */
app.post("/api/ai/generate-ficha", async (req, res) => {
  try {
    const { graph, kickoffItems, comments, clientName, version, industry } = req.body;
    const { ai, model } = resolveAI(req.body);

    const prompt = `
Eres la IA traductora oficial de AtomScope.
Tu tarea es convertir el diagrama visual y las definiciones recopiladas en la **Ficha Técnica Oficial en Markdown** para el cliente "${clientName}" (Versión v${version || 1}, Industria: ${industry || "General"}).
Esta Ficha Técnica alimentar directa y fielmente la Skill de creación de flujos de Atom.

Formato requerido en Markdown exacto (§7):

# Ficha Técnica — ${clientName} v${version || 1}
> Generada automáticamente desde AtomScope el ${new Date().toLocaleDateString("es-ES")}

## 1. Resumen General
- **Cliente:** ${clientName}
- **Industria:** ${industry}
- **Dirección:** Inbound por defecto (WhatsApp)
- **Tono y Estilo:** [Detallar tono acordado]
- **Objetivo del Bot:** [Detallar objetivo]

## 2. Arquitectura del Flujo (Orquestador Smarton)
- **Componente Inicial:** Bot Inbound
- **Recupero sin respuesta (no_answer_minutes):** [Especificar tiempo]
- **Intenciones del Orquestador:**
| Intención | Condición / Prompt | Rama Destino | Tipo (Venta / Servicio) |
|---|---|---|---|

## 3. Detalle por Rama y Componentes
[Por cada rama del diagrama, desglosar la secuencia exacta de nodos: Mensajes, Smartons, Integraciones HTTP, Capturas, Etapas de Venta y Cierres]

## 4. Campos de Información a Capturar
| Campo | Tipo (var_ / custom_) | Prompt de Pregunta | ¿Existe en Atom? (ID / Nuevo) |
|---|---|---|---|

## 5. Cierres y Tipificaciones
| Nombre (<= 20 chars) | Descripción | ¿Existe en Atom? (ID / Nuevo) |
|---|---|---|---|

## 6. Integraciones (HTTP / CRM / Pasarelas)
[Por cada integración: Sistema, Propósito, Endpoint/URL, Método, Autenticación Bearer, Body, Variable de Salida, Manejo de Error Empático + Acción Fallback]

## 7. Asignación a Asesores Humanos
- **Grupo / Equipo:**
- **Horario y Zona Horaria:**
- **Mensaje de Transición:**

## 8. Acuerdos y Comentarios Relevantes
[Listar observaciones y acuerdos destacados]

## 9. Estado de Auditoría y Pendientes
[Indicar si hay vacíos pendientes o si la ficha está 100% lista para producción]

Diagrama actual (JSON):
${JSON.stringify(graph, null, 2)}

Kickoff Items:
${JSON.stringify(kickoffItems, null, 2)}

Comentarios:
${JSON.stringify(comments, null, 2)}

Genera el documento completo en Markdown con formato impecable, tabulaciones limpias y máxima minuciosidad técnica.
`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    const markdownText = response.text || "";
    res.json({ contentMd: markdownText });
  } catch (error: any) {
    console.error("Error in /api/ai/generate-ficha:", error);
    res.status(500).json({ error: error.message || "Error al generar la ficha técnica" });
  }
});

/**
 * 4. GENERATE RESUMEN DE ACUERDOS
 * Generates client-friendly summary in Markdown for customer sign-off.
 */
app.post("/api/ai/generate-resumen", async (req, res) => {
  try {
    const { clientName, version, versionLabel, versionStatus, kickoffItems, graph, documents } = req.body;
    const { ai, model } = resolveAI(req.body);

    const answered = (kickoffItems || []).filter((k: any) => k.status === "answered");
    const pending = (kickoffItems || []).filter((k: any) => k.status !== "answered");

    const prompt = `
Eres un Gerente de Proyecto de Onboarding en Atom.
Genera un **Documento de Acuerdos** formal y legible para el cliente "${clientName}" (Versión ${version || 1}${versionLabel ? " — " + versionLabel : ""}).
Este documento se estructura como un SOW: numerado, por acciones pactadas, en lenguaje de negocio (no técnico, sin jerga de FlowBuilder).

## Bases del acuerdo (fuentes de verdad)
El acuerdo se construye EXCLUSIVAMENTE a partir de:
1. Los documentos cargados (SOW = alcance prometido; baseline = funnel).
2. Las preguntas del kick-off YA RESUELTAS con el cliente (no incluyas lo que sigue pendiente como si estuviera acordado).
3. La versión del flujo aprobado (diagrama).

Estado de la versión del flujo: ${versionStatus || "borrador"}.

## Documentos cargados
${
  documents && documents.length > 0
    ? documents.map((d: any) => `### ${d.file_name}\n${(d.extracted_text || "").slice(0, 3000)}`).join("\n\n")
    : "Sin documentos."
}

## Preguntas resueltas (acuerdos confirmados)
${JSON.stringify(answered, null, 2)}

## Preguntas aún pendientes (NO son acuerdos; van en la sección de pendientes)
${JSON.stringify(pending, null, 2)}

## Diagrama del flujo aprobado
${JSON.stringify(graph, null, 2)}

## Formato de salida — devuelve ÚNICAMENTE un JSON con esta estructura:
{
  "title": "Documento de Acuerdos — ${clientName}",
  "clientName": "${clientName}",
  "intro": "Párrafo introductorio: propósito del bot y alcance general acordado, en lenguaje de negocio.",
  "sections": [
    {
      "title": "Título de la acción pactada (ej: Atención y calificación de leads)",
      "points": ["Punto concreto de lo acordado", "Otro punto observable acordado"]
    }
  ],
  "exclusions": ["Lo que el bot NO hará (tomado del SOW)"],
  "pending": ["Puntos aún por definir con el cliente (de las preguntas pendientes)"],
  "nextSteps": ["Próximos pasos hacia la construcción en Atom"]
}

Reglas:
- "sections" enumera las ACCIONES PACTADAS (rutas de atención, datos que se piden, integraciones, transferencias, cierres), cada una con puntos claros.
- No inventes acuerdos que no estén respaldados por documentos, respuestas resueltas o el diagrama.
- Lo que siga pendiente va SOLO en "pending", nunca como acuerdo confirmado.
- Lenguaje claro para un cliente no técnico.
`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json({ agreement: data });
  } catch (error: any) {
    console.error("Error in /api/ai/generate-resumen:", error);
    res.status(500).json({ error: error.message || "Error al generar resumen de acuerdos" });
  }
});

/**
 * 7. AUTO-FIX AUDIT GAPS
 * Given the graph + audit gaps, returns graph operations that resolve them,
 * applied to the live canvas by the client (same schema as the AI chat).
 */
app.post("/api/ai/autofix", async (req, res) => {
  try {
    const { graph, gaps, clientName, industry } = req.body;
    const { ai, model } = resolveAI(req.body);

    const prompt = `
Eres el corrector automático de flujos de AtomScope.
Recibes un diagrama (React Flow nodes/edges) y una lista de hallazgos de auditoría para "${clientName || "Cliente"}" (${industry || "General"}).
Devuelve operaciones estructuradas que RESUELVAN esos hallazgos respetando las reglas de la Skill de Atom.

## Reglas Atom que deben cumplir las correcciones
- Labels ≤30 chars, botones ≤20, tipificaciones ≤20.
- Toda rama termina en "closing" (tipificación) o derivación humana.
- Todo "integration" lleva errorFallbackMessage empático (nunca "Error de API") y su rama de error conectada.
- Smarton/orchestrator con noAnswerMinutes de recupero.
- Etapas de venta solo en ramas comerciales (Awareness→Lead→MQL→SQL).

## Diagrama actual
${JSON.stringify(graph, null, 2)}

## Hallazgos a corregir
${JSON.stringify(gaps, null, 2)}

## Tipos de nodo (campo type y data.nodeType iguales)
start, message, orchestrator, capture, integration, decision, human, closing, stage, jump, note.

## Devuelve ÚNICAMENTE JSON:
{
  "summary": "Explicación breve de las correcciones aplicadas",
  "operations": [
    { "op": "add_node", "node": { "id": "node-x", "type": "closing", "position": {"x":600,"y":400}, "data": { "label":"...", "nodeType":"closing", "typificationName":"...", "typificationDesc":"..." } } },
    { "op": "update_node", "id": "node-existente", "data": { "errorFallbackMessage": "..." } },
    { "op": "add_edge", "edge": { "source": "node-a", "target": "node-b", "label": "" } },
    { "op": "delete_node", "id": "node-x" },
    { "op": "delete_edge", "id": "e-x" }
  ]
}

- Prefiere update_node y add_edge sobre recrear nodos.
- Al agregar nodos, conéctalos con add_edge y ubícalos sin encimar (mira las posiciones actuales).
- No borres nodos con contenido válido; corrige lo señalado por los hallazgos.
`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/ai/autofix:", error);
    res.status(500).json({ error: error.message || "Error al autocorregir el flujo" });
  }
});

/**
 * 5. SUGGEST FLOW / AUTO-GENERATE NODES
 * Generates initial or expansion nodes for the canvas based on context.
 */
app.post("/api/ai/suggest-flow", async (req, res) => {
  try {
    const { clientName, industry, kickoffItems, description } = req.body;
    const { ai, model } = resolveAI(req.body);

    const prompt = `
Eres un Diseñador de Flujos en React Flow para AtomScope.
Basado en el cliente "${clientName}" (${industry}), genera una estructura de nodos y conexiones sugerida para React Flow.

Tipos de nodos disponibles:
- "start": Inicio (▶)
- "message": Mensaje con texto y botones (💬)
- "orchestrator": Menú Inteligente Smarton (🧠)
- "capture": Captura de datos / Save fields (📝)
- "integration": Integración HTTP / CRM (🔌)
- "human": Asesor humano (🧑💼)
- "closing": Cierre con Tipificación (⏹)
- "stage": Etapa de venta Awareness/Lead/MQL/SQL (🎯)

Genera un JSON válido con la lista de nodes y edges de React Flow:
{
  "nodes": [
    {
      "id": "1",
      "type": "start",
      "position": { "x": 250, "y": 50 },
      "data": { "label": "Inicio Bot", "description": "WhatsApp Inbound" }
    }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2", "label": "Inicio" }
  ]
}
`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);
    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/ai/suggest-flow:", error);
    res.status(500).json({ error: error.message || "Error al sugerir el flujo" });
  }
});

/**
 * 6. AI PROJECT CHAT
 * Conversational assistant with full project context. Can propose graph operations
 * (add/update/delete nodes and edges) that the client applies to the live canvas.
 */
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages, project, graph, kickoffItems, documents } = req.body;
    const { ai, model } = resolveAI(req.body);

    const history = (messages || [])
      .map((m: any) => `${m.role === "user" ? "USUARIO" : "ASISTENTE"}: ${m.text}`)
      .join("\n");

    const prompt = `
Eres el Asistente IA de AtomScope para el proyecto "${project?.client_name}" (Industria: ${project?.industry}).
Acompañas al equipo de Onboarding durante la llamada de kick-off. Tienes TODO el contexto del proyecto y
puedes MODIFICAR el flujo del canvas proponiendo operaciones estructuradas.

## Contexto del proyecto
Descripción: ${project?.description || "N/A"}

## Diagrama actual (React Flow nodes/edges)
${JSON.stringify(graph, null, 2)}

## Checklist Kick-off (preguntas y acuerdos)
${JSON.stringify(kickoffItems, null, 2)}

## Documentos cargados (texto extraído)
${
  documents && documents.length > 0
    ? documents.map((d: any) => `### ${d.file_name}\n${(d.extracted_text || "").slice(0, 4000)}`).join("\n\n")
    : "Sin documentos."
}

## Historial de conversación
${history}

## Tipos de nodo disponibles (campo "type")
- "start": Inicio inbound WhatsApp (solo uno)
- "message": Mensaje. data: { label, messageText, buttons?: [{id,label(≤20ch)}] }
- "orchestrator": Smarton IA. data: { label, noAnswerMinutes, intents: [{id,name,condition,isSalesBranch}] }
- "capture": Captura de datos. data: { label, fields: [{name(var_/custom_),type:"var"|"custom",prompt}] }
- "integration": HTTP/CRM. data: { label, systemName, endpoint, httpMethod, errorFallbackMessage, saveVariable }
- "decision": Condición. data: { label, description }
- "human": Asesor humano. data: { label, groupName, schedule, transitionMessage }
- "closing": Tipificación de cierre. data: { label, typificationName(≤20ch), typificationDesc }
- "stage": Etapa de venta. data: { label, salesStage: "Awareness"|"Lead"|"MQL"|"SQL" } — SOLO en ramas de venta
- "jump": Salto a otra sección. data: { label }
- "note": Nota/acuerdo. data: { label, description }

## Reglas Atom que SIEMPRE respetas al modificar el flujo
- Labels ≤30 caracteres, botones ≤20, tipificaciones ≤20.
- Toda rama termina en un nodo "closing" (tipificación) o derivación humana.
- Todo nodo "integration" lleva errorFallbackMessage empático (nunca "Error de API").
- Etapas de venta SOLO en ramas comerciales (Awareness→Lead→MQL→SQL en orden).
- Smarton/orchestrator siempre con noAnswerMinutes de recupero.

## Formato de respuesta — devuelve ÚNICAMENTE JSON válido:
{
  "reply": "Tu respuesta conversacional en español, breve y útil (formato texto plano, sin markdown pesado)",
  "operations": [
    { "op": "add_node", "node": { "id": "node-nuevo-x", "type": "message", "position": {"x": 400, "y": 300}, "data": { "label": "...", "nodeType": "message" } } },
    { "op": "update_node", "id": "node-existente", "data": { "messageText": "nuevo texto" } },
    { "op": "delete_node", "id": "node-x" },
    { "op": "add_edge", "edge": { "source": "node-a", "target": "node-b", "sourceHandle": null, "label": "" } },
    { "op": "delete_edge", "id": "e-x" }
  ]
}

- "operations" es opcional: inclúyelo SOLO cuando el usuario pida o acepte cambios al flujo. Si solo pregunta, devuelve operations: [].
- En add_node incluye SIEMPRE data.nodeType igual al type, y una position que no se encime con nodos existentes (mira las posiciones actuales del grafo).
- Al agregar nodos conéctalos con add_edge para no dejar nodos sueltos.
- En update_node envía SOLO los campos de data que cambian (se hace merge).
- Explica en "reply" qué cambios aplicaste y por qué.
`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);
    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/ai/chat:", error);
    res.status(500).json({ error: error.message || "Error en el chat de IA" });
  }
});

// --- VITE / STATIC SERVING ---
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[AtomScope Server] Running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  void start();
}

export default app;
