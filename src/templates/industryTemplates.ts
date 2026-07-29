import { CustomCanvasNode, CustomCanvasEdge, DiagramGraph, IndustryType } from "../types";

export const getTemplateForIndustry = (industry: IndustryType, clientName: string): DiagramGraph => {
  switch (industry) {
    case "ecommerce":
      return getEcommerceTemplate(clientName);
    case "salud":
      return getSaludTemplate(clientName);
    case "financiero":
      return getFinancieroTemplate(clientName);
    case "inmobiliario":
      return getInmobiliarioTemplate(clientName);
    default:
      return getEcommerceTemplate(clientName);
  }
};

const getEcommerceTemplate = (clientName: string): DiagramGraph => {
  const nodes: CustomCanvasNode[] = [
    {
      id: "node-start",
      type: "start",
      position: { x: 300, y: 50 },
      data: {
        label: "Inicio WhatsApp",
        nodeType: "start",
        description: "Inbound por defecto - Usuario saluda",
      },
    },
    {
      id: "node-welcome",
      type: "message",
      position: { x: 300, y: 160 },
      data: {
        label: "Bienvenida E-Commerce",
        nodeType: "message",
        messageText: `¡Hola! 👋 Bienvenido a *${clientName}*. ¿En qué podemos ayudarte hoy?`,
        buttons: [
          { id: "b1", label: "📦 Ver Catálogo" },
          { id: "b2", label: "🚚 Estado de Pedido" },
          { id: "b3", label: "💬 Hablar con Asesor" },
        ],
      },
    },
    {
      id: "node-orch",
      type: "orchestrator",
      position: { x: 300, y: 320 },
      data: {
        label: "Orquestador Inteligente",
        nodeType: "orchestrator",
        noAnswerMinutes: 30,
        intents: [
          { id: "i1", name: "Consulta Catálogo / Comprar", condition: "quiere comprar o ver productos", isSalesBranch: true },
          { id: "i2", name: "Consultar Estado Pedido", condition: "pregunta por envío o guía", isSalesBranch: false },
          { id: "i3", name: "Derivar Asesor", condition: "solicita humano o caso complejo", isSalesBranch: false },
        ],
      },
    },
    // Branch 1: Sales / Catalog
    {
      id: "node-stage-lead",
      type: "stage",
      position: { x: 50, y: 480 },
      data: {
        label: "Etapa de Venta",
        nodeType: "stage",
        salesStage: "Lead",
        description: "Interés detectado en catálogo",
      },
    },
    {
      id: "node-catalog-msg",
      type: "message",
      position: { x: 50, y: 600 },
      data: {
        label: "Mostrar Productos",
        nodeType: "message",
        messageText: "Mira nuestras categorías principales en tendencia 🔥",
        buttons: [
          { id: "cb1", label: "👕 Moda y Calzado" },
          { id: "cb2", label: "📱 Tecnología" },
        ],
      },
    },
    {
      id: "node-capture-buy",
      type: "capture",
      position: { x: 50, y: 740 },
      data: {
        label: "Captura Datos Envío",
        nodeType: "capture",
        fields: [
          { name: "custom_nombre_cliente", type: "custom", prompt: "¿Cuál es tu nombre completo?" },
          { name: "custom_ciudad_envio", type: "custom", prompt: "¿A qué ciudad enviaremos tu pedido?" },
        ],
      },
    },
    {
      id: "node-closing-sale",
      type: "closing",
      position: { x: 50, y: 900 },
      data: {
        label: "Cierre Venta Iniciada",
        nodeType: "closing",
        typificationName: "Interés Venta Catálogo",
        typificationDesc: "Cliente navegó catálogo y dejó datos de contacto",
      },
    },
    // Branch 2: Order Status Integration
    {
      id: "node-capture-order",
      type: "capture",
      position: { x: 380, y: 480 },
      data: {
        label: "Pedir N° de Pedido",
        nodeType: "capture",
        fields: [
          { name: "var_numero_pedido", type: "var", prompt: "Por favor ingresa tu número de pedido de 6 dígitos:" },
        ],
      },
    },
    {
      id: "node-http-order",
      type: "integration",
      position: { x: 380, y: 630 },
      data: {
        label: "Consulta CRM Shopify",
        nodeType: "integration",
        systemName: "Shopify",
        endpoint: "https://api.shopify.com/v1/orders/check",
        httpMethod: "POST",
        saveVariable: "var_estado_pedido",
        errorFallbackMessage: "No pudimos ubicar tu pedido automáticamente. Te pasamos con un asesor.",
      },
    },
    {
      id: "node-closing-order",
      type: "closing",
      position: { x: 380, y: 800 },
      data: {
        label: "Cierre Consulta Pedido",
        nodeType: "closing",
        typificationName: "Consulta Pedido Exito",
        typificationDesc: "Se entregó la guía de rastreo al cliente",
      },
    },
    // Branch 3: Human Support
    {
      id: "node-human",
      type: "human",
      position: { x: 720, y: 480 },
      data: {
        label: "Asignación Soporte",
        nodeType: "human",
        groupName: "Soporte E-Commerce",
        schedule: "Lunes a Viernes 8:00 AM - 6:00 PM (GMT-5)",
        transitionMessage: "Un asesor de nuestro equipo te atenderá en unos momentos. 🎧",
      },
    },
    {
      id: "node-closing-human",
      type: "closing",
      position: { x: 720, y: 650 },
      data: {
        label: "Cierre Derivado Human",
        nodeType: "closing",
        typificationName: "Derivado a Asesor",
        typificationDesc: "Soporte en vivo requerido",
      },
    },
  ];

  const edges: CustomCanvasEdge[] = [
    { id: "e-1", source: "node-start", target: "node-welcome" },
    { id: "e-2", source: "node-welcome", target: "node-orch" },
    { id: "e-3", source: "node-orch", target: "node-stage-lead", label: "Catálogo / Comprar" },
    { id: "e-4", source: "node-stage-lead", target: "node-catalog-msg" },
    { id: "e-5", source: "node-catalog-msg", target: "node-capture-buy" },
    { id: "e-6", source: "node-capture-buy", target: "node-closing-sale" },
    { id: "e-7", source: "node-orch", target: "node-capture-order", label: "Rastreo Pedido" },
    { id: "e-8", source: "node-capture-order", target: "node-http-order" },
    { id: "e-9", source: "node-http-order", target: "node-closing-order", label: "Éxito" },
    { id: "e-10", source: "node-http-order", target: "node-human", label: "Falló API" },
    { id: "e-11", source: "node-orch", target: "node-human", label: "Hablar con Asesor" },
    { id: "e-12", source: "node-human", target: "node-closing-human" },
  ];

  return { nodes, edges };
};

const getSaludTemplate = (clientName: string): DiagramGraph => {
  const nodes: CustomCanvasNode[] = [
    {
      id: "node-start",
      type: "start",
      position: { x: 300, y: 50 },
      data: { label: "Inicio WhatsApp Salud", nodeType: "start", description: "Atención Pacientes Inbound" },
    },
    {
      id: "node-welcome",
      type: "message",
      position: { x: 300, y: 160 },
      data: {
        label: "Bienvenida Centro Médico",
        nodeType: "message",
        messageText: `¡Hola! Te damos la bienvenida a *${clientName}*. ¿En qué podemos ayudarte?`,
        buttons: [
          { id: "b1", label: "📅 Agendar Cita Médica" },
          { id: "b2", label: "📄 Resultados Exámenes" },
          { id: "b3", label: "🚨 Urgencias / Humano" },
        ],
      },
    },
    {
      id: "node-orch",
      type: "orchestrator",
      position: { x: 300, y: 320 },
      data: {
        label: "Orquestador Pacientes",
        nodeType: "orchestrator",
        noAnswerMinutes: 15,
        intents: [
          { id: "i1", name: "Agendamiento Cita", condition: "quiere reservar consulta o especialidad", isSalesBranch: true },
          { id: "i2", name: "Consultar Laboratorio", condition: "pregunta por resultados o exámenes", isSalesBranch: false },
          { id: "i3", name: "Emergencia / Asesor", condition: "caso urgente o asesor", isSalesBranch: false },
        ],
      },
    },
    {
      id: "node-capture-patient",
      type: "capture",
      position: { x: 80, y: 480 },
      data: {
        label: "Datos del Paciente",
        nodeType: "capture",
        fields: [
          { name: "custom_documento_id", type: "custom", prompt: "Por favor ingresa tu número de documento de identidad:" },
          { name: "custom_especialidad", type: "custom", prompt: "¿Qué especialidad médica necesitas? (ej: Medicina General, Odontología)" },
        ],
      },
    },
    {
      id: "node-http-his",
      type: "integration",
      position: { x: 80, y: 640 },
      data: {
        label: "Consulta HIS / Citas",
        nodeType: "integration",
        systemName: "Sistema Médico HIS",
        endpoint: "https://his.salud.org/api/v1/appointments/available",
        httpMethod: "POST",
        saveVariable: "var_horarios_disponibles",
        errorFallbackMessage: "En este momento no pudimos acceder al sistema de citas. Te conectamos con recepción.",
      },
    },
    {
      id: "node-closing-cita",
      type: "closing",
      position: { x: 80, y: 810 },
      data: {
        label: "Cierre Cita Agendada",
        nodeType: "closing",
        typificationName: "Cita Agendada Exito",
        typificationDesc: "Reserva completada por el bot",
      },
    },
    {
      id: "node-human-urgencia",
      type: "human",
      position: { x: 550, y: 480 },
      data: {
        label: "Recepción / Urgencias",
        nodeType: "human",
        groupName: "Mesa de Ayuda Médica 24/7",
        schedule: "Lunes a Domingo 24 horas",
        transitionMessage: "Un ejecutivo de atención a pacientes te responderá inmediatamente.",
      },
    },
    {
      id: "node-closing-human",
      type: "closing",
      position: { x: 550, y: 650 },
      data: {
        label: "Cierre Atendido Humano",
        nodeType: "closing",
        typificationName: "Atención Humana Salud",
        typificationDesc: "Atendido por equipo médico/recepción",
      },
    },
  ];

  const edges: CustomCanvasEdge[] = [
    { id: "e1", source: "node-start", target: "node-welcome" },
    { id: "e2", source: "node-welcome", target: "node-orch" },
    { id: "e3", source: "node-orch", target: "node-capture-patient", label: "Agendar Cita" },
    { id: "e4", source: "node-capture-patient", target: "node-http-his" },
    { id: "e5", source: "node-http-his", target: "node-closing-cita", label: "Reserva OK" },
    { id: "e6", source: "node-http-his", target: "node-human-urgencia", label: "Error Sistema" },
    { id: "e7", source: "node-orch", target: "node-human-urgencia", label: "Urgencias / Humano" },
    { id: "e8", source: "node-human-urgencia", target: "node-closing-human" },
  ];

  return { nodes, edges };
};

const getFinancieroTemplate = (clientName: string): DiagramGraph => {
  const nodes: CustomCanvasNode[] = [
    {
      id: "node-start",
      type: "start",
      position: { x: 300, y: 50 },
      data: { label: "Inicio WhatsApp Financiero", nodeType: "start", description: "Asistente Bancario / Fintech" },
    },
    {
      id: "node-welcome",
      type: "message",
      position: { x: 300, y: 160 },
      data: {
        label: "Bienvenida Fintech",
        nodeType: "message",
        messageText: `Hola, soy el asistente virtual de *${clientName}* 🏦. ¿En qué podemos asesorarte?`,
        buttons: [
          { id: "fb1", label: "💳 Solicitar Crédito" },
          { id: "fb2", label: "📊 Consultar Saldo" },
          { id: "fb3", label: "👨💼 Hablar con Asesor" },
        ],
      },
    },
    {
      id: "node-orch",
      type: "orchestrator",
      position: { x: 300, y: 320 },
      data: {
        label: "Orquestador Crédito / Consultas",
        nodeType: "orchestrator",
        noAnswerMinutes: 20,
        intents: [
          { id: "fi1", name: "Solicitud de Crédito", condition: "interesado en préstamo o tarjeta", isSalesBranch: true },
          { id: "fi2", name: "Consulta de Saldos", condition: "quiere saber estado de cuenta", isSalesBranch: false },
          { id: "fi3", name: "Asesor Ejecutivo", condition: "requiere atencion especializada", isSalesBranch: false },
        ],
      },
    },
    {
      id: "node-stage-mql",
      type: "stage",
      position: { x: 50, y: 480 },
      data: { label: "Etapa MQL Crédito", nodeType: "stage", salesStage: "MQL", description: "Solicitud pre-calificación crédito" },
    },
    {
      id: "node-capture-credit",
      type: "capture",
      position: { x: 50, y: 600 },
      data: {
        label: "Captura Scoring Crédito",
        nodeType: "capture",
        fields: [
          { name: "custom_cedula_identidad", type: "custom", prompt: "Ingresa tu número de cédula:" },
          { name: "custom_monto_solicitado", type: "custom", prompt: "¿Qué monto de préstamo estás buscando?" },
        ],
      },
    },
    {
      id: "node-http-bureau",
      type: "integration",
      position: { x: 50, y: 760 },
      data: {
        label: "Scoring en Buró de Crédito",
        nodeType: "integration",
        systemName: "Bureau Score API",
        endpoint: "https://api.bureau.com/v2/evaluate",
        httpMethod: "POST",
        saveVariable: "var_score_credito",
        errorFallbackMessage: "Hubo una pequeña interrupción validando tu score. Te conectamos con un oficial de crédito.",
      },
    },
    {
      id: "node-closing-credit",
      type: "closing",
      position: { x: 50, y: 920 },
      data: {
        label: "Cierre Pre-aprobado",
        nodeType: "closing",
        typificationName: "Credito PreAprobado",
        typificationDesc: "Calificación automática positiva en buró",
      },
    },
    {
      id: "node-human",
      type: "human",
      position: { x: 550, y: 480 },
      data: {
        label: "Oficiales de Crédito",
        nodeType: "human",
        groupName: "Oficiales Banca Personas",
        schedule: "Lunes a Viernes 8:30 AM - 5:30 PM",
        transitionMessage: "Te transferimos con un oficial de crédito que revisará tu solicitud en detalle.",
      },
    },
    {
      id: "node-closing-human",
      type: "closing",
      position: { x: 550, y: 650 },
      data: {
        label: "Cierre Derivado Financiero",
        nodeType: "closing",
        typificationName: "Derivado Oficial Crédito",
        typificationDesc: "Atención personalizada bancaria",
      },
    },
  ];

  const edges: CustomCanvasEdge[] = [
    { id: "fe1", source: "node-start", target: "node-welcome" },
    { id: "fe2", source: "node-welcome", target: "node-orch" },
    { id: "fe3", source: "node-orch", target: "node-stage-mql", label: "Solicitud Crédito" },
    { id: "fe4", source: "node-stage-mql", target: "node-capture-credit" },
    { id: "fe5", source: "node-capture-credit", target: "node-http-bureau" },
    { id: "fe6", source: "node-http-bureau", target: "node-closing-credit", label: "Pre-Aprobado" },
    { id: "fe7", source: "node-http-bureau", target: "node-human", label: "Falló / Revisión Manual" },
    { id: "fe8", source: "node-orch", target: "node-human", label: "Hablar con Asesor" },
    { id: "fe9", source: "node-human", target: "node-closing-human" },
  ];

  return { nodes, edges };
};

const getInmobiliarioTemplate = (clientName: string): DiagramGraph => {
  const nodes: CustomCanvasNode[] = [
    {
      id: "node-start",
      type: "start",
      position: { x: 300, y: 50 },
      data: { label: "Inicio WhatsApp Inmobiliario", nodeType: "start", description: "Proyectos Residenciales & Comercial" },
    },
    {
      id: "node-welcome",
      type: "message",
      position: { x: 300, y: 160 },
      data: {
        label: "Bienvenida Constructora",
        nodeType: "message",
        messageText: `¡Hola! Bienvenido a *${clientName}* 🏗️. ¿Qué tipo de propiedad estás buscando?`,
        buttons: [
          { id: "ib1", label: "🏢 Departamentos" },
          { id: "ib2", label: "🏡 Casas Residenciales" },
          { id: "ib3", label: "📅 Agendar Visita Piloto" },
        ],
      },
    },
    {
      id: "node-orch",
      type: "orchestrator",
      position: { x: 300, y: 320 },
      data: {
        label: "Orquestador Proyectos",
        nodeType: "orchestrator",
        noAnswerMinutes: 45,
        intents: [
          { id: "ii1", name: "Cotización Propiedad", condition: "quiere conocer precios o modelos", isSalesBranch: true },
          { id: "ii2", name: "Agendar Visita Piloto", condition: "quiere agendar visita presencial", isSalesBranch: true },
          { id: "ii3", name: "Agente Inmobiliario", condition: "desea hablar con un asesor", isSalesBranch: false },
        ],
      },
    },
    {
      id: "node-stage-awareness",
      type: "stage",
      position: { x: 50, y: 480 },
      data: { label: "Etapa Awareness Lead", nodeType: "stage", salesStage: "Awareness", description: "Interés inicial en proyectos" },
    },
    {
      id: "node-capture-lead",
      type: "capture",
      position: { x: 50, y: 600 },
      data: {
        label: "Calificación Comprador",
        nodeType: "capture",
        fields: [
          { name: "custom_presupuesto_estimado", type: "custom", prompt: "¿Cuál es tu presupuesto aproximado de inversión?" },
          { name: "custom_zona_interes", type: "custom", prompt: "¿En qué distrito o sector te gustaría ubicarte?" },
        ],
      },
    },
    {
      id: "node-stage-sql",
      type: "stage",
      position: { x: 50, y: 760 },
      data: { label: "Etapa SQL Calificado", nodeType: "stage", salesStage: "SQL", description: "Presupuesto y zona definidos" },
    },
    {
      id: "node-closing-inmueble",
      type: "closing",
      position: { x: 50, y: 900 },
      data: {
        label: "Cierre Lead Calificado",
        nodeType: "closing",
        typificationName: "Lead Inmobiliario SQL",
        typificationDesc: "Comprador con presupuesto listo para cotización",
      },
    },
    {
      id: "node-human",
      type: "human",
      position: { x: 550, y: 480 },
      data: {
        label: "Asesores Inmobiliarios",
        nodeType: "human",
        groupName: "Fuerza de Ventas Proyectos",
        schedule: "Lunes a Domingo 9:00 AM - 7:00 PM",
        transitionMessage: "Te conectamos con un asesor especialista en el proyecto de tu interés.",
      },
    },
    {
      id: "node-closing-human",
      type: "closing",
      position: { x: 550, y: 650 },
      data: {
        label: "Cierre Agente Asignado",
        nodeType: "closing",
        typificationName: "Asignado Agente Venta",
        typificationDesc: "Atención directa por ejecutivo inmobiliario",
      },
    },
  ];

  const edges: CustomCanvasEdge[] = [
    { id: "ie1", source: "node-start", target: "node-welcome" },
    { id: "ie2", source: "node-welcome", target: "node-orch" },
    { id: "ie3", source: "node-orch", target: "node-stage-awareness", label: "Cotizar / Proyectos" },
    { id: "ie4", source: "node-stage-awareness", target: "node-capture-lead" },
    { id: "ie5", source: "node-capture-lead", target: "node-stage-sql" },
    { id: "ie6", source: "node-stage-sql", target: "node-closing-inmueble" },
    { id: "ie7", source: "node-orch", target: "node-human", label: "Hablar con Agente" },
    { id: "ie8", source: "node-human", target: "node-closing-human" },
  ];

  return { nodes, edges };
};
