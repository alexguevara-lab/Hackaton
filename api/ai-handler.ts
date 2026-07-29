import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Carga .env.local (y .env) para ejecuciÃ³n local; en AI Studio el entorno inyecta las claves.
dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

// Vercel enruta /api/* a esta función fija con la ruta original en `path`.
// Restauramos esa ruta antes de que Express evalúe los endpoints de IA.
app.use((req, _res, next) => {
  const requestedPath = req.query?.path;
  if (req.path === "/api/ai-handler" && typeof requestedPath === "string") {
    req.url = `/api/${requestedPath}`;
  }
  next();
});

const DEFAULT_MODEL = "gemini-3.6-flash";

// Initialize Gemini Client. Prioriza la key enviada desde la UI (config del proyecto);
// si viene vacÃ­a, usa la GEMINI_API_KEY del entorno (.env.local).
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

// Extrae la config de IA (key + modelo) que la UI envÃ­a en el body.
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
 * PING — valida que la key + el modelo funcionen con una llamada mínima.
 * Lo usa el modal de Configuración IA para el botón "Probar conexión".
 */
app.post("/api/ai/ping", async (req, res) => {
  try {
    const { ai, model } = resolveAI(req.body);
    const response = await ai.models.generateContent({
      model,
      contents: "Responde solo con: ok",
    });
    const text = (response.text || "").trim();
    res.json({ ok: true, model, message: `Conexión correcta con ${model}. Respuesta: "${text.slice(0, 20)}"` });
  } catch (error: any) {
    const raw = error?.message || "Error desconocido";
    let friendly = raw;
    if (/api key not valid|API_KEY_INVALID|invalid.*key/i.test(raw)) {
      friendly = "La API key no es válida. Revísala en Configuración IA o en .env.local.";
    } else if (/not found|404|is not found for API/i.test(raw)) {
      friendly = "El modelo seleccionado no existe para esta key. Elige otro modelo.";
    } else if (/quota|RESOURCE_EXHAUSTED|429/i.test(raw)) {
      friendly = "Se agotó la cuota de la API key.";
    }
    console.error("Error in /api/ai/ping:", raw);
    res.status(400).json({ ok: false, error: friendly });
  }
});

/**
 * 1. ANALYZE CONTEXT
 * Analyzes uploaded documents (briefs, catalogs, FAQs) and generates context summary + kick-off items checklist (Â§6).
 */
app.post("/api/ai/analyze-context", async (req, res) => {
  try {
    const { documentTexts, clientName, industry, description, baseQuestions, industryContext } = req.body;
    const { ai, model } = resolveAI(req.body);

    const prompt = `
Eres un Arquitecto de Bots Senior para Atom (Atom Chat / WhatsApp Business).
Analiza el contexto de la empresa "${clientName || "Cliente"}" (Industria: ${industry || "General"}, DescripciÃ³n: ${description || "Sin descripciÃ³n"}).

## Documentos requeridos del anÃ¡lisis inicial
- **SOW (Statement of Work)**: es la FUENTE DE VERDAD del alcance prometido al cliente. De aquÃ­ salen los
  casos de uso (ventas/servicio), integraciones (ej. HubSpot CRM, WhatsApp Business API), lo que el AI Agent
  SÃ hace y lo que NO hace, fases, requisitos crÃ­ticos y fechas. El mapa visual y el bot NO deben prometer
  nada fuera de este alcance.
- **Baseline Onboarding**: define el funnel de calificaciÃ³n de leads con las etapas de Atom
  (Awareness â†’ Lead â†’ MQL â†’ SQL â†’ Opportunity) y los KPIs. Ãšsalo para saber quÃ© etapas de venta marcar y
  quÃ© datos de calificaciÃ³n se capturan. NO analices los nÃºmeros por cuenta; solo la definiciÃ³n del funnel.

Documentos adjuntos / Contexto extraÃ­do:
${documentTexts && documentTexts.length > 0 ? documentTexts.join("\n\n---\n\n") : "No se subieron documentos aÃºn."}

## Perfil conceptual de la industria
${industryContext ? JSON.stringify(industryContext, null, 2) : "Sin perfil específico; usa la industria indicada."}

Usa este perfil para interpretar los documentos y detectar restricciones, decisiones y rutas propias de la industria.
No conviertas automáticamente preguntas de fase "spec" en pendientes del kick-off: son contexto para la ficha técnica posterior.

## Base de preguntas del motor (obligatoria)
EvalÃºa CADA UNA de estas preguntas base contra los documentos. Este es el motor de preguntas: no inventes
preguntas arbitrarias, parte de esta base y complÃ©tala.
${baseQuestions && baseQuestions.length ? JSON.stringify(baseQuestions, null, 2) : "(sin base recibida; usa el checklist Â§6)"}

Para cada pregunta base:
- Si los documentos la responden de forma suficiente â†’ status "answered", con la respuesta detectada y cita breve de la evidencia (documento/secciÃ³n).
- Si no hay evidencia suficiente, es ambigua o contradictoria â†’ status "pending" (queda para resolver en el kick-off).
- Conserva su "id" y "category" originales.
AdemÃ¡s, agrega preguntas EXTRA solo si detectas vacÃ­os relevantes no cubiertos por la base.

Tu objetivo:
1. Resumir el ALCANCE del SOW (quÃ© harÃ¡ y quÃ© NO harÃ¡ el bot, integraciones, casos de uso, fases).
2. Evaluar la informaciÃ³n faltante en DOS niveles secuenciales:
   a) **Mapa visual** (lo mÃ­nimo para dibujar el diagrama de flujo con el cliente): rutas/intenciones del
      orquestador, ramas de venta vs servicio, puntos de integraciÃ³n, dÃ³nde se pasa a humano, cierres.
   b) **Ficha tÃ©cnica / MD** (el detalle que exige la Skill de Atom para generar el bot): prompts exactos,
      IDs de campos custom y tipificaciones, endpoints/auth/body de las integraciones, horarios de asesores,
      textos definitivos, no_answer_minutes.
3. Devolver el estado de CADA pregunta base + las extra, clasificadas en el checklist de Atom (Â§6):
   Generales, Rutas e Intenciones, Captura de Datos, Cierres, Integraciones, AsignaciÃ³n Humana.

Devuelve ÃšNICAMENTE un JSON vÃ¡lido con esta estructura:
{
  "scopeSummary": "Resumen del alcance del SOW en 1-2 pÃ¡rrafos: casos de uso, integraciones, quÃ© NO hace, fases.",
  "summary": "Resumen ejecutivo del contexto conocido.",
  "detectedTone": "Tono recomendado",
  "detectedGoal": "Objetivo principal del bot",
  "mapReadiness": {
    "ready": false,
    "missing": ["Lista concreta de la informaciÃ³n que aÃºn falta para poder dibujar el mapa visual"]
  },
  "specReadiness": {
    "ready": false,
    "missing": ["Lista concreta de lo que faltarÃ¡ para generar el MD tÃ©cnico final, aun cuando el mapa ya estÃ©"]
  },
  "kickoffItems": [
    {
      "baseId": "id de la pregunta base si aplica (o vacÃ­o para extra)",
      "category": "Generales" | "Rutas e Intenciones" | "Captura de Datos" | "Cierres" | "Integraciones" | "AsignaciÃ³n Humana",
      "question": "Pregunta concreta para el cliente",
      "answer": "Respuesta detectada en los documentos + evidencia (o vacÃ­a si falta)",
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
 * Validates graph JSON + kickoff items against Atom Skill imperatives (Â§6) and lists gaps.
 */
app.post("/api/ai/audit", async (req, res) => {
  try {
    const { graph, kickoffItems, clientName, industry } = req.body;
    const { ai, model } = resolveAI(req.body);

    const prompt = `
Eres un Auditor Estricto del Flujo de Atom.
Revisa el diagrama visual (React Flow nodes/edges) y las respuestas del kick-off para la cuenta "${clientName || "Cliente"}" (Industria: ${industry || "General"}).

Reglas de AuditorÃ­a Estrictas Atom (Â§6):
1. Smarton / Orquestador:
   - Debe tener configurado recupero sin respuesta ('no_answer_minutes' ej 30 min, 4 hrs).
   - Cada rama derivada debe especificar si es 'venta' (requiere etapas Awareness->Lead->MQL->SQL) o 'servicio' (sin etapas).
2. Nodos de Mensaje / Botones:
   - Labels de botones <= 20 caracteres.
   - Textos de mensajes <= 300 caracteres recomendados.
3. Integraciones (HTTP / CRM):
   - Todo nodo de IntegraciÃ³n DEBE tener una rama de error/fallback explÃ­cita (mensaje empÃ¡tico + derivaciÃ³n o reintento). NUNCA mostrar "Error de API" o dejar la salida fallida desconectada.
   - Debe especificar mÃ©todo, URL/endpoint y variable de salida.
4. Captura de Datos (Save Fields):
   - Debe definir si los campos custom_ ya existen en Atom (con ID) o si son nuevos.
5. Cierres / Tipificaciones:
   - Toda rama del diagrama DEBE terminar en una TipificaciÃ³n de cierre o un Jump. No deben quedar ramas sueltas o inconclusas.
   - Nombre de tipificaciÃ³n debe ser <= 20 caracteres con descripciÃ³n clara.
   - Debe especificar si la tipificaciÃ³n ya existe en Atom (ID) o es nueva.
6. AsignaciÃ³n Humana:
   - Debe indicar grupo/equipo de destino, horario de atenciÃ³n y mensaje de transiciÃ³n.

Diagrama actual (Nodes and Edges):
${JSON.stringify(graph, null, 2)}

Checklist Respuestas Kick-off:
${JSON.stringify(kickoffItems, null, 2)}

Devuelve ÃšNICAMENTE un JSON estructurado con la siguiente lista de hallazgos / auditorÃ­a:
{
  "score": 85, // Puntaje de completitud de 0 a 100
  "isReady": false, // true si no hay hallazgos de severidad "blocking"
  "gaps": [
    {
      "nodeId": "id_del_nodo_afectado_o_null",
      "nodeName": "Nombre del nodo o categorÃ­a",
      "category": "Generales" | "Rutas" | "Captura" | "Cierres" | "Integraciones" | "AsignaciÃ³n",
      "severity": "blocking" | "warning" | "info", // "blocking" para 6.1-6.6 no cumplidos; "warning" para 6.7-6.8
      "issue": "DescripciÃ³n clara del problema",
      "suggestion": "InstrucciÃ³n exacta para corregirlo",
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
 * 3. GENERATE FICHA TÃ‰CNICA (Markdown)
 * Translates canvas diagram + kickoff answers + comments into complete Markdown Spec for Atom Skill (Â§7).
 */
app.post("/api/ai/generate-ficha", async (req, res) => {
  try {
    const { graph, kickoffItems, comments, clientName, version, industry } = req.body;
    const { ai, model } = resolveAI(req.body);

    const prompt = `
Eres la IA traductora oficial de AtomScope.
Tu tarea es convertir el diagrama visual y las definiciones recopiladas en la **Ficha TÃ©cnica Oficial en Markdown** para el cliente "${clientName}" (VersiÃ³n v${version || 1}, Industria: ${industry || "General"}).
Esta Ficha TÃ©cnica alimentar directa y fielmente la Skill de creaciÃ³n de flujos de Atom.

Formato requerido en Markdown exacto (Â§7):

# Ficha TÃ©cnica â€” ${clientName} v${version || 1}
> Generada automÃ¡ticamente desde AtomScope el ${new Date().toLocaleDateString("es-ES")}

## 1. Resumen General
- **Cliente:** ${clientName}
- **Industria:** ${industry}
- **DirecciÃ³n:** Inbound por defecto (WhatsApp)
- **Tono y Estilo:** [Detallar tono acordado]
- **Objetivo del Bot:** [Detallar objetivo]

## 2. Arquitectura del Flujo (Orquestador Smarton)
- **Componente Inicial:** Bot Inbound
- **Recupero sin respuesta (no_answer_minutes):** [Especificar tiempo]
- **Intenciones del Orquestador:**
| IntenciÃ³n | CondiciÃ³n / Prompt | Rama Destino | Tipo (Venta / Servicio) |
|---|---|---|---|

## 3. Detalle por Rama y Componentes
[Por cada rama del diagrama, desglosar la secuencia exacta de nodos: Mensajes, Smartons, Integraciones HTTP, Capturas, Etapas de Venta y Cierres]

## 4. Campos de InformaciÃ³n a Capturar
| Campo | Tipo (var_ / custom_) | Prompt de Pregunta | Â¿Existe en Atom? (ID / Nuevo) |
|---|---|---|---|

## 5. Cierres y Tipificaciones
| Nombre (<= 20 chars) | DescripciÃ³n | Â¿Existe en Atom? (ID / Nuevo) |
|---|---|---|---|

## 6. Integraciones (HTTP / CRM / Pasarelas)
[Por cada integraciÃ³n: Sistema, PropÃ³sito, Endpoint/URL, MÃ©todo, AutenticaciÃ³n Bearer, Body, Variable de Salida, Manejo de Error EmpÃ¡tico + AcciÃ³n Fallback]

## 7. AsignaciÃ³n a Asesores Humanos
- **Grupo / Equipo:**
- **Horario y Zona Horaria:**
- **Mensaje de TransiciÃ³n:**

## 8. Acuerdos y Comentarios Relevantes
[Listar observaciones y acuerdos destacados]

## 9. Estado de AuditorÃ­a y Pendientes
[Indicar si hay vacÃ­os pendientes o si la ficha estÃ¡ 100% lista para producciÃ³n]

Diagrama actual (JSON):
${JSON.stringify(graph, null, 2)}

Kickoff Items:
${JSON.stringify(kickoffItems, null, 2)}

Comentarios:
${JSON.stringify(comments, null, 2)}

Genera el documento completo en Markdown con formato impecable, tabulaciones limpias y mÃ¡xima minuciosidad tÃ©cnica.
`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    const markdownText = response.text || "";
    res.json({ contentMd: markdownText });
  } catch (error: any) {
    console.error("Error in /api/ai/generate-ficha:", error);
    res.status(500).json({ error: error.message || "Error al generar la ficha tÃ©cnica" });
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
Genera un **Documento de Acuerdos** formal y legible para el cliente "${clientName}" (VersiÃ³n ${version || 1}${versionLabel ? " â€” " + versionLabel : ""}).
Este documento se estructura como un SOW: numerado, por acciones pactadas, en lenguaje de negocio (no tÃ©cnico, sin jerga de FlowBuilder).

## Bases del acuerdo (fuentes de verdad)
El acuerdo se construye EXCLUSIVAMENTE a partir de:
1. Los documentos cargados (SOW = alcance prometido; baseline = funnel).
2. Las preguntas del kick-off YA RESUELTAS con el cliente (no incluyas lo que sigue pendiente como si estuviera acordado).
3. La versiÃ³n del flujo aprobado (diagrama).

Estado de la versiÃ³n del flujo: ${versionStatus || "borrador"}.

## Documentos cargados
${
  documents && documents.length > 0
    ? documents.map((d: any) => `### ${d.file_name}\n${(d.extracted_text || "").slice(0, 3000)}`).join("\n\n")
    : "Sin documentos."
}

## Preguntas resueltas (acuerdos confirmados)
${JSON.stringify(answered, null, 2)}

## Preguntas aÃºn pendientes (NO son acuerdos; van en la secciÃ³n de pendientes)
${JSON.stringify(pending, null, 2)}

## Diagrama del flujo aprobado
${JSON.stringify(graph, null, 2)}

## Formato de salida â€” devuelve ÃšNICAMENTE un JSON con esta estructura:
{
  "title": "Documento de Acuerdos â€” ${clientName}",
  "clientName": "${clientName}",
  "intro": "PÃ¡rrafo introductorio: propÃ³sito del bot y alcance general acordado, en lenguaje de negocio.",
  "sections": [
    {
      "title": "TÃ­tulo de la acciÃ³n pactada (ej: AtenciÃ³n y calificaciÃ³n de leads)",
      "points": ["Punto concreto de lo acordado", "Otro punto observable acordado"]
    }
  ],
  "exclusions": ["Lo que el bot NO harÃ¡ (tomado del SOW)"],
  "pending": ["Puntos aÃºn por definir con el cliente (de las preguntas pendientes)"],
  "nextSteps": ["PrÃ³ximos pasos hacia la construcciÃ³n en Atom"]
}

Reglas:
- "sections" enumera las ACCIONES PACTADAS (rutas de atenciÃ³n, datos que se piden, integraciones, transferencias, cierres), cada una con puntos claros.
- No inventes acuerdos que no estÃ©n respaldados por documentos, respuestas resueltas o el diagrama.
- Lo que siga pendiente va SOLO en "pending", nunca como acuerdo confirmado.
- Lenguaje claro para un cliente no tÃ©cnico.
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
Eres el corrector automÃ¡tico de flujos de AtomScope.
Recibes un diagrama (React Flow nodes/edges) y una lista de hallazgos de auditorÃ­a para "${clientName || "Cliente"}" (${industry || "General"}).
Devuelve operaciones estructuradas que RESUELVAN esos hallazgos respetando las reglas de la Skill de Atom.

## Reglas Atom que deben cumplir las correcciones
- Labels â‰¤30 chars, botones â‰¤20, tipificaciones â‰¤20.
- Toda rama termina en "closing" (tipificaciÃ³n) o derivaciÃ³n humana.
- Todo "integration" lleva errorFallbackMessage empÃ¡tico (nunca "Error de API") y su rama de error conectada.
- Smarton/orchestrator con noAnswerMinutes de recupero.
- Etapas de venta solo en ramas comerciales (Awarenessâ†’Leadâ†’MQLâ†’SQL).

## Diagrama actual
${JSON.stringify(graph, null, 2)}

## Hallazgos a corregir
${JSON.stringify(gaps, null, 2)}

## Tipos de nodo (campo type y data.nodeType iguales)
start, message, orchestrator, capture, integration, decision, human, closing, stage, jump, note.

## Devuelve ÃšNICAMENTE JSON:
{
  "summary": "ExplicaciÃ³n breve de las correcciones aplicadas",
  "operations": [
    { "op": "add_node", "node": { "id": "node-x", "type": "closing", "position": {"x":600,"y":400}, "data": { "label":"...", "nodeType":"closing", "typificationName":"...", "typificationDesc":"..." } } },
    { "op": "update_node", "id": "node-existente", "data": { "errorFallbackMessage": "..." } },
    { "op": "add_edge", "edge": { "source": "node-a", "target": "node-b", "label": "" } },
    { "op": "delete_node", "id": "node-x" },
    { "op": "delete_edge", "id": "e-x" }
  ]
}

- Prefiere update_node y add_edge sobre recrear nodos.
- Al agregar nodos, conÃ©ctalos con add_edge y ubÃ­calos sin encimar (mira las posiciones actuales).
- No borres nodos con contenido vÃ¡lido; corrige lo seÃ±alado por los hallazgos.
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
Eres un DiseÃ±ador de Flujos en React Flow para AtomScope.
Basado en el cliente "${clientName}" (${industry}), genera una estructura de nodos y conexiones sugerida para React Flow.

Tipos de nodos disponibles:
- "start": Inicio (â–¶)
- "message": Mensaje con texto y botones (ðŸ’¬)
- "orchestrator": MenÃº Inteligente Smarton (ðŸ§ )
- "capture": Captura de datos / Save fields (ðŸ“)
- "integration": IntegraciÃ³n HTTP / CRM (ðŸ”Œ)
- "human": Asesor humano (ðŸ§‘ðŸ’¼)
- "closing": Cierre con TipificaciÃ³n (â¹)
- "stage": Etapa de venta Awareness/Lead/MQL/SQL (ðŸŽ¯)

Genera un JSON vÃ¡lido con la lista de nodes y edges de React Flow:
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
    const { messages, project, graph, kickoffItems, documents, industryContext } = req.body;
    const { ai, model } = resolveAI(req.body);

    const history = (messages || [])
      .map((m: any) => `${m.role === "user" ? "USUARIO" : "ASISTENTE"}: ${m.text}`)
      .join("\n");

    const prompt = `
Eres el Asistente IA de AtomScope para el proyecto "${project?.client_name}" (Industria: ${project?.industry}).
AcompaÃ±as al equipo de Onboarding durante la llamada de kick-off. Tienes TODO el contexto del proyecto y
puedes MODIFICAR el flujo del canvas proponiendo operaciones estructuradas.

## Contexto del proyecto
DescripciÃ³n: ${project?.description || "N/A"}

## Diagrama actual (React Flow nodes/edges)
${JSON.stringify(graph, null, 2)}

## Checklist Kick-off (preguntas y acuerdos)
${JSON.stringify(kickoffItems, null, 2)}

## Documentos cargados (texto extraÃ­do)
${
  documents && documents.length > 0
    ? documents.map((d: any) => `### ${d.file_name}\n${(d.extracted_text || "").slice(0, 4000)}`).join("\n\n")
    : "Sin documentos."
}

## Historial de conversaciÃ³n
${history}

## Perfil conceptual de la industria
${industryContext ? JSON.stringify(industryContext, null, 2) : "Sin perfil específico; usa la industria indicada."}

Úsalo como guía de decisiones y preguntas relevantes. No asumas que una respuesta está confirmada solo porque aparezca en el perfil: prevalecen los documentos y acuerdos del proyecto.

## Tipos de nodo disponibles (campo "type")
- "start": Inicio inbound WhatsApp (solo uno)
- "message": Mensaje. data: { label, messageText, buttons?: [{id,label(â‰¤20ch)}] }
- "orchestrator": Smarton IA. data: { label, noAnswerMinutes, intents: [{id,name,condition,isSalesBranch}] }
- "capture": Captura de datos. data: { label, fields: [{name(var_/custom_),type:"var"|"custom",prompt}] }
- "integration": HTTP/CRM. data: { label, systemName, endpoint, httpMethod, errorFallbackMessage, saveVariable }
- "decision": CondiciÃ³n. data: { label, description }
- "human": Asesor humano. data: { label, groupName, schedule, transitionMessage }
- "closing": TipificaciÃ³n de cierre. data: { label, typificationName(â‰¤20ch), typificationDesc }
- "stage": Etapa de venta. data: { label, salesStage: "Awareness"|"Lead"|"MQL"|"SQL" } â€” SOLO en ramas de venta
- "jump": Salto a otra secciÃ³n. data: { label }
- "note": Nota/acuerdo. data: { label, description }

## Reglas Atom que SIEMPRE respetas al modificar el flujo
- Labels â‰¤30 caracteres, botones â‰¤20, tipificaciones â‰¤20.
- Toda rama termina en un nodo "closing" (tipificaciÃ³n) o derivaciÃ³n humana.
- Todo nodo "integration" lleva errorFallbackMessage empÃ¡tico (nunca "Error de API").
- Etapas de venta SOLO en ramas comerciales (Awarenessâ†’Leadâ†’MQLâ†’SQL en orden).
- Smarton/orchestrator siempre con noAnswerMinutes de recupero.

## Formato de respuesta â€” devuelve ÃšNICAMENTE JSON vÃ¡lido:
{
  "reply": "Tu respuesta conversacional en espaÃ±ol, breve y Ãºtil (formato texto plano, sin markdown pesado)",
  "operations": [
    { "op": "add_node", "node": { "id": "node-nuevo-x", "type": "message", "position": {"x": 400, "y": 300}, "data": { "label": "...", "nodeType": "message" } } },
    { "op": "update_node", "id": "node-existente", "data": { "messageText": "nuevo texto" } },
    { "op": "delete_node", "id": "node-x" },
    { "op": "add_edge", "edge": { "source": "node-a", "target": "node-b", "sourceHandle": null, "label": "" } },
    { "op": "delete_edge", "id": "e-x" }
  ]
}

- "operations" es opcional: inclÃºyelo SOLO cuando el usuario pida o acepte cambios al flujo. Si solo pregunta, devuelve operations: [].
- En add_node incluye SIEMPRE data.nodeType igual al type, y una position que no se encime con nodos existentes (mira las posiciones actuales del grafo).
- Al agregar nodos conÃ©ctalos con add_edge para no dejar nodos sueltos.
- En update_node envÃ­a SOLO los campos de data que cambian (se hace merge).
- Explica en "reply" quÃ© cambios aplicaste y por quÃ©.
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
