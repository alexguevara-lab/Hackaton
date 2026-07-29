# Especificación de implementación — Motor de preguntas de Onboarding

## 1. Propósito

Implementar dentro de un proyecto existente un motor que convierta la información disponible de un SOW y del workspace actual en una secuencia controlada de preguntas funcionales.

El motor debe:

1. revisar la información ya disponible;
2. detectar contradicciones, vacíos, ambigüedades, dependencias y cambios de alcance;
3. priorizar el hallazgo que más desbloquea la definición funcional;
4. formular una sola pregunta principal a la vez;
5. interpretar la respuesta del OBS;
6. proponer cambios estructurados antes de aplicarlos;
7. aplicar los cambios solo después de una confirmación explícita;
8. volver a auditar el estado actualizado;
9. continuar hasta alcanzar una condición de cierre válida.

El motor no construye el flujo técnico, no selecciona componentes de FlowBuilder y no genera `flow_plan.json`.

---

## 2. Resultado esperado

El resultado del motor no es una conversación libre, sino una definición funcional progresivamente consolidada y trazable.

El ciclo principal es:

```text
Fuentes del proyecto
        ↓
Normalización del contexto
        ↓
Auditoría funcional interna
        ↓
Hallazgos abiertos
        ↓
Priorización por severidad y dependencia
        ↓
Pregunta actual
        ↓
Respuesta del OBS
        ↓
Interpretación estructurada
        ↓
Parche propuesto
        ↓
Confirmación / edición / rechazo
        ↓
Aplicación del parche
        ↓
Nueva auditoría
```

---

## 3. Principios obligatorios

1. El SOW controla el alcance.
2. No preguntar información que ya esté definida de forma suficiente.
3. No ratificar decisiones claras salvo que exista contradicción, riesgo o impacto de alcance.
4. Hacer una sola pregunta principal a la vez.
5. Resolver primero decisiones de las que dependen otras.
6. Mostrar la evidencia que originó la pregunta.
7. No aceptar respuestas vagas cuando se necesita una condición observable.
8. No incorporar solicitudes nuevas como parte de la versión vigente.
9. No completar vacíos mediante supuestos silenciosos.
10. Registrar cada pregunta, respuesta, decisión y cambio propuesto.
11. Proponer cambios antes de aplicarlos.
12. Conservar los pendientes aunque no se resuelvan durante la sesión.
13. Permitir resolver ahora, resolver después, escalar o marcar como no aplicable.
14. La IA recomienda e interpreta; el OBS confirma.

La implementación debe preservar las reglas principales de la skill base: revisar las fuentes antes de preguntar, hacer una pregunta prioritaria a la vez, separar estados funcionales, controlar el alcance y proponer cambios estructurados antes de aplicarlos. fileciteturn0file0L16-L49

---

## 4. Alcance del motor

### Incluido

- revisión de fuentes disponibles;
- extracción o consumo de una definición funcional estructurada;
- auditoría funcional interna;
- detección de hallazgos;
- deduplicación de hallazgos;
- cálculo de prioridad;
- selección de la pregunta actual;
- generación de preguntas;
- interpretación de respuestas;
- generación de parches estructurados;
- vista previa del impacto;
- confirmación antes de aplicar;
- aplicación del parche;
- reauditoría;
- historial y trazabilidad;
- control de solicitudes nuevas;
- condiciones de cierre.

### Fuera de alcance

- construcción técnica del flujo;
- selección de Smartons o componentes Atom;
- generación de JSON de FlowBuilder;
- generación de `flow_plan.json`;
- diseño visual del canvas;
- posicionamiento de nodos;
- QA técnico del flujo implementado;
- integraciones reales con sistemas externos;
- generación obligatoria de Markdown final;
- versionado avanzado;
- comparación visual entre versiones.

---

## 5. Fuentes de entrada

Antes de generar una pregunta, el motor debe revisar las fuentes disponibles:

- SOW;
- baseline;
- funnel;
- handoff comercial o técnico;
- evidencia técnica disponible;
- estado actual del workspace;
- respuestas anteriores del OBS;
- pendientes existentes;
- elementos marcados como fuera de alcance.

No todas las fuentes son obligatorias para iniciar. Su ausencia debe transformarse en un hallazgo únicamente cuando sea relevante para el caso.

### Contrato de entrada sugerido

```ts
type QuestionEngineInput = {
  projectId: string;
  sourceDocuments: SourceDocument[];
  workspace: FunctionalWorkspace;
  previousAnswers: AnswerRecord[];
  openPendingItems: PendingItem[];
  engineConfig?: EngineConfig;
};

type SourceDocument = {
  id: string;
  type:
    | "sow"
    | "baseline"
    | "funnel"
    | "handoff"
    | "technical_evidence"
    | "other";
  title?: string;
  content: string;
  status?: "draft" | "in_review" | "approved" | "unknown";
};
```

---

## 6. Modelo funcional mínimo

El motor necesita trabajar sobre un modelo funcional estable. No debe depender directamente de la interfaz visual.

```ts
type FunctionalWorkspace = {
  source: {
    status:
      | "draft"
      | "commercial_review"
      | "technical_review"
      | "onboarding_review"
      | "approved"
      | "approved_with_pending";
  };

  businessContext: {
    company?: string;
    useCase?: string;
    objective?: string;
  };

  scope: {
    included: ScopeItem[];
    excluded: ScopeItem[];
    newRequests: ScopeItem[];
  };

  activation: {
    channel?: string;
    trafficType?: string;
    trigger?: string;
    entryConditions?: Rule[];
  };

  paths: FunctionalPath[];

  qualification: {
    criteria: Rule[];
  };

  dataRequirements: DataRequirement[];
  integrations: IntegrationDefinition[];
  transfers: TransferDefinition[];
  recoveries: RecoveryDefinition[];
  exceptions: ExceptionDefinition[];
  closures: ClosureDefinition[];

  measurement: {
    funnelStages: FunnelStage[];
    baseline?: string;
    kpis: KPI[];
  };

  pendingItems: PendingItem[];
  outOfScopeItems: ScopeItem[];
};
```

Las entidades internas pueden adaptarse al modelo del proyecto existente. Lo indispensable es que cada elemento tenga un identificador estable y pueda ser modificado mediante operaciones estructuradas.

---

## 7. Estados semánticos que el motor debe diferenciar

El motor no debe reducir toda la información a “definido” o “no definido”. Debe distinguir:

- `sold`: fue vendido o prometido comercialmente;
- `confirmed`: fue confirmado por una fuente válida o por el OBS;
- `needs_definition`: está acordado, pero falta aterrizar su funcionamiento;
- `ambiguous`: admite más de una interpretación;
- `contradictory`: entra en conflicto con otra definición;
- `pending`: no puede resolverse todavía;
- `new_request`: apareció después o no tiene respaldo en el alcance;
- `out_of_scope`: fue clasificado expresamente fuera del alcance;
- `not_applicable`: no aplica al proyecto.

Ejemplo:

```ts
type FunctionalItemStatus =
  | "sold"
  | "confirmed"
  | "needs_definition"
  | "ambiguous"
  | "contradictory"
  | "pending"
  | "new_request"
  | "out_of_scope"
  | "not_applicable";
```

---

## 8. La auditoría interna sí es necesaria

La auditoría no debe implementarse necesariamente como una pantalla o reporte independiente. Sin embargo, sí es necesaria como capa interna porque produce los hallazgos que alimentan el motor de preguntas.

Sin auditoría, la IA tendría que decidir libremente qué preguntar y tendería a:

- repetir preguntas;
- preguntar información ya disponible;
- omitir dependencias;
- priorizar detalles de copy antes que la lógica;
- aceptar términos vagos;
- incorporar cambios de alcance sin control.

La relación correcta es:

```text
Reglas de auditoría
        ↓
Hallazgos estructurados
        ↓
Priorizador
        ↓
Pregunta actual
```

No es necesario implementar en esta fase:

- dashboard de auditoría;
- puntaje global;
- score 90/100;
- readiness visual;
- auditoría técnica de FlowBuilder;
- auditoría visual del canvas.

---

## 9. Modelo de hallazgo

```ts
type FindingType =
  | "contradiction"
  | "new_request"
  | "missing_information"
  | "ambiguity"
  | "incomplete_rule"
  | "dependency"
  | "out_of_scope_conflict";

type FindingCategory =
  | "scope"
  | "activation"
  | "paths"
  | "qualification"
  | "data"
  | "integration"
  | "transfer"
  | "recovery"
  | "exception"
  | "closure"
  | "measurement"
  | "copy";

type FindingSeverity = "blocking" | "high" | "medium" | "low";

type Finding = {
  id: string;
  fingerprint: string;
  type: FindingType;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  description: string;
  evidence: Evidence[];
  affectedElements: EntityReference[];
  dependsOnFindingIds: string[];
  blocksFindingIds: string[];
  status:
    | "open"
    | "questioned"
    | "answered"
    | "resolved"
    | "dismissed"
    | "pending"
    | "escalated";
  priorityScore?: number;
  suggestedQuestion?: QuestionDraft;
  createdAt: string;
  updatedAt: string;
};

type Evidence = {
  sourceId: string;
  sourceType: SourceDocument["type"] | "workspace" | "user_answer";
  section?: string;
  quote?: string;
  summary?: string;
};
```

### Fingerprint

El `fingerprint` debe permitir deduplicar hallazgos equivalentes. Puede construirse con:

```text
category + type + affectedEntityType + affectedEntityId + normalizedRuleKey
```

Ejemplo:

```text
transfer|missing_information|path|path_sales|destination
```

---

## 10. Reglas mínimas de auditoría

### 10.1 Alcance

Detectar:

- solicitud sin evidencia en el alcance incluido;
- elemento presente tanto en alcance incluido como excluido;
- solicitud nueva incorporada como confirmada;
- dependencia sin responsable;
- requisito atribuido al SOW sin evidencia trazable.

### 10.2 Activación

Detectar:

- canal no definido;
- origen o tipo de tráfico no definido cuando afecta el flujo;
- trigger ambiguo;
- activación incompatible con el alcance;
- activación que depende de una integración no definida.

### 10.3 Caminos

Detectar:

- caso de uso sin caminos principales;
- decisión sin opciones;
- decisión sin criterio observable;
- caminos solapados;
- rama sin destino;
- camino sin cierre;
- escenario mencionado en el SOW pero no representado;
- fallback ausente cuando ninguna condición coincide.

### 10.4 Calificación

Detectar:

- criterio comercial ambiguo;
- condición que usa términos subjetivos;
- resultado de calificación sin acción asociada;
- datos requeridos para calificar que no están definidos.

### 10.5 Datos

Detectar:

- dato utilizado por una regla pero no capturado ni disponible;
- dato requerido sin finalidad;
- dato sin momento de captura;
- dato obligatorio sin comportamiento ante rechazo o ausencia;
- dato duplicado con nombres o significados diferentes.

### 10.6 Integraciones

Detectar:

- integración sin momento de ejecución;
- integración sin datos de entrada;
- integración sin resultado esperado;
- integración sin comportamiento ante error;
- integración sin responsable;
- dependencia externa no confirmada.

### 10.7 Transferencias

Detectar:

- transferencia sin condición;
- transferencia sin destino;
- transferencia sin información de contexto;
- transferencia sin comportamiento fuera de horario cuando aplique;
- diferentes ramas que transfieren al mismo destino sin una regla clara;
- destino descrito de forma vaga.

### 10.8 Recuperos y excepciones

Detectar:

- falta de respuesta sin tratamiento;
- recupero sin cantidad máxima o condición de agotamiento;
- error funcional sin fallback;
- excepción sin destino;
- reintento infinito o sin criterio de salida.

### 10.9 Cierres

Detectar:

- camino sin condición de cierre;
- cierre contradictorio con transferencia;
- conversación que puede quedar abierta sin siguiente acción;
- cierre que no distingue resolución, abandono, error o transferencia.

### 10.10 Medición

Detectar:

- KPI sin definición operativa;
- baseline pendiente;
- evento del funnel sin forma de identificación;
- métrica que depende de un dato no capturado;
- etapa del funnel sin criterio de entrada o salida.

### 10.11 Copy

Debe auditarse al final. Detectar solo cuando la lógica ya esté suficientemente definida:

- mensaje obligatorio inexistente;
- copy contradictorio con la regla funcional;
- uso de términos internos frente al usuario;
- CTA que no tiene una ruta funcional asociada.

---

## 11. Ambigüedades prohibidas

El motor debe detectar expresiones no observables, por ejemplo:

- “cuando esté interesado”;
- “cuando corresponda”;
- “al equipo adecuado”;
- “datos relevantes”;
- “validar”;
- “sincronizar”;
- “hacer seguimiento”;
- “si es necesario”.

Ante estas expresiones debe solicitar:

1. condición observable;
2. dato utilizado;
3. resultado esperado;
4. destino o acción concreta;
5. fallback cuando no se cumpla la condición.

Ejemplo:

```text
Expresión vaga:
“Transferir cuando el cliente esté interesado”.

Pregunta correcta:
“¿Qué acción o respuesta observable confirma que el cliente debe ser transferido: solicitar precio, pedir cotización, pedir una demo o indicar expresamente que quiere hablar con un asesor?”
```

---

## 12. Priorización

La prioridad funcional base es:

1. contradicciones;
2. cambios de alcance;
3. activación;
4. caminos;
5. calificación;
6. datos;
7. integraciones;
8. transferencias;
9. errores, recuperos y excepciones;
10. cierres;
11. medición;
12. copy.

Esta prioridad está alineada con la skill original. fileciteturn0file0L52-L65

### 12.1 Factores de cálculo

Cada hallazgo debe recibir un `priorityScore` a partir de:

- severidad;
- tipo de hallazgo;
- categoría;
- cantidad de elementos que bloquea;
- dependencia con otros hallazgos;
- impacto en alcance;
- capacidad de ser resuelto por el OBS;
- antigüedad o repetición opcional.

### 12.2 Fórmula sugerida

```ts
priorityScore =
  severityScore +
  typeScore +
  categoryScore +
  dependencyScore +
  scopeImpactScore +
  resolvabilityScore;
```

Valores sugeridos:

```ts
const severityScore = {
  blocking: 1000,
  high: 700,
  medium: 400,
  low: 100,
};

const typeScore = {
  contradiction: 500,
  new_request: 450,
  out_of_scope_conflict: 425,
  dependency: 300,
  ambiguity: 250,
  incomplete_rule: 200,
  missing_information: 150,
};

const categoryScore = {
  scope: 120,
  activation: 110,
  paths: 100,
  qualification: 90,
  data: 80,
  integration: 70,
  transfer: 60,
  recovery: 50,
  exception: 50,
  closure: 40,
  measurement: 20,
  copy: 10,
};
```

### 12.3 Dependencias

Un hallazgo debe aumentar su prioridad cuando su resolución desbloquea otros.

Ejemplo:

```text
Definir caminos principales
        ↓ desbloquea
Definir datos por camino
        ↓ desbloquea
Definir transferencias
        ↓ desbloquea
Definir cierres y medición
```

No se debe preguntar por el nombre técnico de un campo si todavía no se sabe si ese dato forma parte del proceso.

---

## 13. Selección de la siguiente pregunta

El selector debe:

1. excluir hallazgos resueltos, descartados o pendientes sin posibilidad de acción;
2. excluir hallazgos que dependen de otro hallazgo abierto;
3. ordenar por `priorityScore` descendente;
4. evitar repetir una pregunta ya respondida;
5. combinar hallazgos únicamente cuando forman una misma unidad de decisión;
6. seleccionar un único hallazgo principal;
7. adjuntar hallazgos secundarios relacionados como contexto, no como preguntas independientes.

### Pseudocódigo

```ts
function selectNextFinding(findings: Finding[]): Finding | null {
  return findings
    .filter((finding) => finding.status === "open")
    .filter((finding) =>
      finding.dependsOnFindingIds.every((id) => isResolved(id))
    )
    .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))[0] ?? null;
}
```

---

## 14. Generación de la pregunta

La IA no debe recibir todo el proyecto sin orientación. Debe recibir un contexto reducido y suficiente.

### Contexto mínimo para generar una pregunta

```ts
type QuestionGenerationContext = {
  finding: Finding;
  evidence: Evidence[];
  affectedWorkspaceFragment: unknown;
  relatedConfirmedRules: Rule[];
  relatedPreviousAnswers: AnswerRecord[];
  allowedAnswerFormats: QuestionFormat[];
};
```

### Reglas de redacción

La pregunta debe:

- resolver el hallazgo principal;
- ser comprensible para un OBS;
- evitar lenguaje técnico de FlowBuilder;
- mostrar brevemente por qué se pregunta;
- incluir evidencia cuando exista;
- pedir una condición observable;
- no mezclar decisiones independientes;
- recomendar opciones solo después de explicar el vacío;
- permitir “resolver después”, “escalar” o “no aplica” cuando corresponda.

### Una pregunta principal no significa un solo dato

Una pregunta puede resolver una unidad funcional completa si los elementos dependen de la misma decisión.

Correcto:

> Cuando el usuario solicite un asesor, ¿a qué equipo debe transferirse y qué información debe acompañar esa transferencia?

Esto es válido si destino y contexto forman parte de la misma definición de transferencia.

Incorrecto:

> ¿Cuál es el destino, qué KPIs usaremos y qué mensaje final enviaremos?

Son decisiones independientes y deben separarse.

---

## 15. Formatos de pregunta

```ts
type QuestionFormat =
  | "free_text"
  | "single_select"
  | "multi_select"
  | "yes_no"
  | "mapping"
  | "rule_builder"
  | "entity_form";
```

### Uso recomendado

- `free_text`: contradicciones o explicaciones complejas;
- `single_select`: elegir una alternativa excluyente;
- `multi_select`: seleccionar varios caminos o datos;
- `yes_no`: confirmar una condición explícita;
- `mapping`: relacionar intención, camino, equipo o resultado;
- `rule_builder`: definir condición, acción y fallback;
- `entity_form`: completar una integración o transferencia.

El motor debe preferir respuestas estructuradas cuando sean suficientes. Las respuestas abiertas deben reservarse para decisiones que no puedan representarse con opciones o formularios.

---

## 16. Contrato de la pregunta

```ts
type Question = {
  id: string;
  findingId: string;
  title: string;
  question: string;
  reason: string;
  evidence: Evidence[];
  format: QuestionFormat;
  options?: QuestionOption[];
  fields?: QuestionField[];
  allowResolveLater: boolean;
  allowEscalate: boolean;
  allowNotApplicable: boolean;
  createdAt: string;
};
```

Ejemplo:

```json
{
  "id": "q_transfer_destination_001",
  "findingId": "finding_transfer_destination_001",
  "title": "Destino de transferencia",
  "question": "Cuando el usuario solicite hablar con un asesor, ¿a qué equipo o grupo debe enviarse la conversación?",
  "reason": "El SOW define que debe existir una transferencia, pero no identifica el equipo receptor.",
  "evidence": [
    {
      "sourceId": "sow_001",
      "sourceType": "sow",
      "section": "Transferencias",
      "quote": "El usuario podrá ser transferido a un asesor."
    }
  ],
  "format": "free_text",
  "allowResolveLater": true,
  "allowEscalate": true,
  "allowNotApplicable": false,
  "createdAt": "2026-07-29T12:00:00-05:00"
}
```

---

## 17. Interpretación de la respuesta

La respuesta no debe modificar directamente el workspace.

Debe pasar por cuatro etapas:

1. normalización;
2. clasificación de decisión;
3. clasificación de alcance;
4. generación de un parche propuesto.

### Contrato de salida de interpretación

```ts
type AnswerInterpretation = {
  questionId: string;
  answerSummary: string;
  decisionStatus: "confirmed" | "pending" | "escalated" | "not_applicable";
  scopeClassification:
    | "within_scope"
    | "new_request"
    | "contradiction"
    | "unknown";
  affectedElements: EntityReference[];
  proposedPatch?: WorkspacePatch;
  warnings: string[];
  unresolvedAmbiguities: string[];
  nextQuestionReason?: string;
};
```

La forma original de respuesta estructurada de la skill debe mantenerse conceptualmente: resumen, estado de decisión, clasificación de alcance, elementos afectados, cambios propuestos, advertencias y razón de la siguiente pregunta. fileciteturn0file0L80-L100

### Validaciones obligatorias

Antes de generar un parche, comprobar:

- que la respuesta realmente responde la pregunta;
- que no contiene una ambigüedad prohibida;
- que no contradice una decisión confirmada;
- que no introduce una solicitud nueva sin clasificar;
- que los elementos referenciados existen;
- que la operación propuesta es válida para el esquema actual.

---

## 18. Control de alcance

Toda respuesta debe clasificarse como:

- `within_scope`: desarrolla o aclara algo ya incluido;
- `new_request`: agrega una capacidad no respaldada por el alcance;
- `contradiction`: contradice el SOW o una decisión confirmada;
- `unknown`: no existe evidencia suficiente para clasificar.

### Comportamiento ante solicitud nueva

Una solicitud nueva no debe aplicarse directamente al workspace principal.

Debe proponerse una de estas acciones:

- registrar como fuera de alcance;
- registrar como pendiente comercial;
- solicitar evidencia de que estaba incluida;
- reemplazar una definición anterior solo con confirmación explícita;
- escalar la decisión.

Ejemplo:

```json
{
  "scopeClassification": "new_request",
  "warnings": [
    "La nutrición automática no aparece en el alcance incluido del SOW."
  ],
  "proposedPatch": {
    "summary": "Registrar nutrición automática como solicitud nueva fuera de v1.",
    "scopeImpact": "out_of_scope",
    "operations": [
      {
        "op": "mark_out_of_scope",
        "path": "/scope/newRequests/-",
        "value": {
          "name": "Nutrición automática",
          "reason": "No existe evidencia en el alcance incluido."
        }
      }
    ]
  }
}
```

---

## 19. WorkspacePatch

El parche debe ser legible, validable y reversible.

```ts
type WorkspacePatch = {
  id: string;
  questionId: string;
  findingId: string;
  summary: string;
  scopeImpact:
    | "none"
    | "within_scope"
    | "potential_change"
    | "out_of_scope";
  operations: PatchOperation[];
  resolvesFindingIds: string[];
  mayCreateFindingCategories: FindingCategory[];
  requiresConfirmation: true;
};

type PatchOperation =
  | {
      op: "add";
      path: string;
      value: unknown;
    }
  | {
      op: "replace";
      path: string;
      value: unknown;
    }
  | {
      op: "remove";
      path: string;
    }
  | {
      op: "mark_pending";
      path: string;
      value: PendingItem;
    }
  | {
      op: "mark_out_of_scope";
      path: string;
      value: ScopeItem;
    };
```

### Ejemplo

```json
{
  "id": "patch_001",
  "questionId": "q_transfer_destination_001",
  "findingId": "finding_transfer_destination_001",
  "summary": "Definir el equipo receptor y el contexto de la transferencia comercial.",
  "scopeImpact": "within_scope",
  "operations": [
    {
      "op": "replace",
      "path": "/transfers/0/destination",
      "value": "Equipo comercial"
    },
    {
      "op": "add",
      "path": "/transfers/0/contextData",
      "value": ["nombre", "empresa", "motivo"]
    }
  ],
  "resolvesFindingIds": ["finding_transfer_destination_001"],
  "mayCreateFindingCategories": ["data"],
  "requiresConfirmation": true
}
```

---

## 20. Confirmación del parche

La interfaz debe ofrecer cuatro acciones:

- `apply`: aplicar exactamente el parche;
- `edit`: editar la propuesta antes de aplicarla;
- `reject`: rechazar el parche y conservar el hallazgo abierto;
- `resolve_later`: convertir el hallazgo en pendiente.

No se debe aplicar ningún cambio por el simple hecho de que la IA haya interpretado la respuesta.

### Estado sugerido

```ts
type PatchDecision =
  | "proposed"
  | "applied"
  | "edited_and_applied"
  | "rejected"
  | "deferred";
```

---

## 21. Reauditoría

Después de aplicar un parche:

1. actualizar el workspace;
2. registrar el cambio en el historial;
3. ejecutar nuevamente todas las reglas relevantes;
4. cerrar hallazgos que ya no existan;
5. crear hallazgos nuevos cuando corresponda;
6. recalcular dependencias y prioridades;
7. seleccionar la siguiente pregunta.

No se debe marcar un hallazgo como resuelto únicamente porque fue respondido. Debe cerrarse cuando la reauditoría confirme que el problema dejó de existir.

---

## 22. Control de tiempo y pendientes

Cada pregunta debe permitir clasificar la decisión como:

- resolver ahora;
- resolver después;
- escalar;
- no aplica.

Esto evita convertir la sesión en una entrevista técnica interminable, principio explícito de la skill original. fileciteturn0file0L103-L112

### Pendiente mínimo

```ts
type PendingItem = {
  id: string;
  title: string;
  description: string;
  sourceFindingId?: string;
  owner?: string;
  dueDate?: string;
  status: "open" | "resolved" | "cancelled";
  blocking: boolean;
  escalationTarget?: string;
};
```

Un pendiente crítico sin responsable debe generar un nuevo hallazgo.

---

## 23. Condiciones de cierre

El motor puede declarar la definición suficientemente completa cuando:

- no existen hallazgos bloqueantes abiertos;
- las contradicciones están resueltas o escaladas;
- las solicitudes nuevas están separadas del alcance vigente;
- cada camino principal tiene destino;
- cada camino principal tiene cierre o transferencia;
- las integraciones críticas tienen momento, entradas, resultado y fallback;
- las transferencias tienen condición y destino;
- los pendientes bloqueantes tienen responsable o escalamiento;
- no existe una solicitud nueva incorporada como parte confirmada de la versión vigente.

No debe declarar cierre cuando se cumpla cualquiera de las condiciones negativas definidas en la skill base: bloqueos sin clasificar, ramas principales sin destino, alcance sin separar, pendientes sin responsable o solicitudes nuevas tratadas como incluidas. fileciteturn0file0L114-L122

### Resultado del cierre

```ts
type EngineCompletion = {
  status: "ready" | "ready_with_pending" | "blocked";
  unresolvedBlockingFindings: string[];
  openPendingItems: string[];
  outOfScopeItems: string[];
  summary: string;
};
```

---

## 24. Separación entre lógica determinística e IA

### Debe resolverse con código

- detección de campos ausentes;
- decisión sin ramas;
- transferencia sin destino;
- integración sin fallback;
- camino sin cierre;
- deduplicación de hallazgos;
- priorización;
- manejo de dependencias;
- aplicación de parches;
- validación de rutas del parche;
- control de estados;
- comparación entre alcance incluido y excluido;
- control del historial;
- cierre de hallazgos mediante reauditoría.

### Puede resolverse con IA

- extracción semántica del SOW;
- detección de contradicciones semánticas;
- identificación de expresiones vagas;
- redacción de preguntas;
- interpretación de respuestas abiertas;
- propuesta inicial de parches;
- resumen de decisiones.

### La IA no debe decidir por sí sola

- si una solicitud nueva entra al alcance;
- si un parche se aplica;
- si una contradicción queda resuelta;
- si la versión está aprobada;
- si una fuente tiene prioridad sobre otra cuando esto no está configurado;
- si un supuesto debe convertirse en definición oficial.

---

## 25. Fallback sin IA

El motor debe seguir funcionando cuando:

- no existe clave de IA;
- la IA devuelve timeout;
- la respuesta no cumple el esquema;
- el modelo produce un parche inválido.

Fallbacks mínimos:

- formularios estructurados por categoría;
- selección manual del hallazgo;
- creación manual de reglas;
- añadir o actualizar camino;
- completar integración;
- completar transferencia;
- añadir pendiente;
- marcar fuera de alcance;
- editar directamente el fragmento funcional afectado.

La IA es una capa de asistencia, no un requisito para mantener operativo el motor.

---

## 26. Historial y trazabilidad

Registrar como mínimo:

```ts
type QuestionHistoryRecord = {
  id: string;
  projectId: string;
  findingId: string;
  question: Question;
  rawAnswer: unknown;
  interpretation: AnswerInterpretation;
  patch?: WorkspacePatch;
  patchDecision?: PatchDecision;
  workspaceVersionBefore: string;
  workspaceVersionAfter?: string;
  answeredBy: string;
  createdAt: string;
  answeredAt?: string;
};
```

Cada cambio debe poder responder:

- qué problema lo originó;
- qué evidencia lo sustentó;
- qué se preguntó;
- qué respondió el OBS;
- qué interpretó la IA;
- qué parche se propuso;
- quién lo confirmó;
- qué elementos fueron modificados.

---

## 27. Endpoints o servicios sugeridos

La arquitectura concreta puede adaptarse al proyecto existente.

```ts
auditWorkspace(input: QuestionEngineInput): Promise<Finding[]>;

prioritizeFindings(
  findings: Finding[],
  workspace: FunctionalWorkspace
): Promise<Finding[]>;

generateQuestion(
  finding: Finding,
  context: QuestionGenerationContext
): Promise<Question>;

interpretAnswer(
  question: Question,
  answer: unknown,
  workspace: FunctionalWorkspace
): Promise<AnswerInterpretation>;

validatePatch(
  patch: WorkspacePatch,
  workspace: FunctionalWorkspace
): PatchValidationResult;

applyPatch(
  patch: WorkspacePatch,
  workspace: FunctionalWorkspace
): FunctionalWorkspace;

reauditAfterPatch(
  previousFindings: Finding[],
  updatedWorkspace: FunctionalWorkspace
): Promise<Finding[]>;

getNextQuestion(
  input: QuestionEngineInput
): Promise<Question | EngineCompletion>;
```

### API HTTP sugerida

```text
POST /api/question-engine/audit
POST /api/question-engine/next-question
POST /api/question-engine/interpret-answer
POST /api/question-engine/validate-patch
POST /api/question-engine/apply-patch
POST /api/question-engine/defer-finding
GET  /api/question-engine/history/:projectId
```

---

## 28. Orquestador principal

```ts
async function runQuestionEngine(
  input: QuestionEngineInput
): Promise<Question | EngineCompletion> {
  const findings = await auditWorkspace(input);
  const prioritized = await prioritizeFindings(findings, input.workspace);
  const nextFinding = selectNextFinding(prioritized);

  if (!nextFinding) {
    return evaluateCompletion(input.workspace, prioritized);
  }

  const context = buildQuestionContext(nextFinding, input);
  return generateQuestion(nextFinding, context);
}
```

### Procesamiento de respuesta

```ts
async function processAnswer(params: {
  question: Question;
  answer: unknown;
  workspace: FunctionalWorkspace;
}): Promise<AnswerInterpretation> {
  const interpretation = await interpretAnswer(
    params.question,
    params.answer,
    params.workspace
  );

  if (interpretation.proposedPatch) {
    const validation = validatePatch(
      interpretation.proposedPatch,
      params.workspace
    );

    if (!validation.valid) {
      return {
        ...interpretation,
        proposedPatch: undefined,
        warnings: [
          ...interpretation.warnings,
          ...validation.errors,
        ],
      };
    }
  }

  return interpretation;
}
```

---

## 29. Prompt recomendado para generar preguntas

```text
Eres el motor de preguntas funcionales de Onboarding.

Tu objetivo es formular una sola pregunta principal que permita resolver el hallazgo recibido.

Reglas:
- No preguntes información ya confirmada.
- No inventes información.
- No uses términos técnicos de FlowBuilder.
- Muestra brevemente la evidencia que origina la pregunta.
- Pide condiciones observables, destinos concretos, datos concretos o resultados verificables.
- No mezcles decisiones independientes.
- No incorpores solicitudes nuevas como parte del alcance.
- Permite resolver después o escalar cuando el dato no esté disponible.
- Recomienda opciones únicamente cuando ayuden a resolver el hallazgo.

Devuelve exclusivamente un objeto compatible con el esquema Question.
```

### Payload recomendado

```json
{
  "finding": {},
  "evidence": [],
  "affectedWorkspaceFragment": {},
  "relatedConfirmedRules": [],
  "relatedPreviousAnswers": [],
  "allowedAnswerFormats": ["free_text", "single_select", "mapping"]
}
```

---

## 30. Prompt recomendado para interpretar respuestas

```text
Eres el intérprete de respuestas del motor de Onboarding.

Debes convertir la respuesta del OBS en una decisión estructurada y, cuando corresponda, en un WorkspacePatch propuesto.

Reglas:
- No modifiques directamente el workspace.
- Resume fielmente la respuesta.
- Clasifica la decisión como confirmed, pending, escalated o not_applicable.
- Clasifica el alcance como within_scope, new_request, contradiction o unknown.
- No incorpores una solicitud nueva al alcance vigente.
- No cierres un hallazgo solo porque fue respondido.
- No completes datos que el usuario no proporcionó.
- Detecta términos vagos y repórtalos en unresolvedAmbiguities.
- Genera únicamente operaciones válidas para el esquema entregado.
- Todo parche requiere confirmación.

Devuelve exclusivamente un objeto compatible con AnswerInterpretation.
```

---

## 31. Pruebas mínimas

### Auditoría

- detecta decisión sin ramas;
- detecta transferencia sin destino;
- detecta integración sin error o fallback;
- detecta camino sin cierre;
- detecta solicitud nueva;
- detecta contradicción entre incluido y excluido;
- no genera hallazgo cuando la información ya está completa.

### Priorización

- contradicción antes que copy;
- alcance antes que datos;
- activación antes que caminos dependientes;
- hallazgo desbloqueador antes que hallazgo bloqueado;
- no selecciona un hallazgo con dependencia abierta.

### Preguntas

- genera una sola pregunta principal;
- muestra evidencia;
- no pregunta información ya confirmada;
- rechaza lenguaje vago;
- utiliza formato estructurado cuando es posible.

### Respuestas y parches

- no aplica cambios automáticamente;
- clasifica solicitudes nuevas;
- detecta contradicciones;
- genera rutas de parche válidas;
- rechaza parches con entidades inexistentes;
- conserva respuestas pendientes.

### Reauditoría

- cierra un hallazgo resuelto;
- mantiene abierto un hallazgo parcialmente resuelto;
- crea un hallazgo nuevo derivado del parche;
- recalcula prioridades.

### Cierre

- no declara `ready` con una rama principal sin destino;
- no declara `ready` con solicitud nueva incorporada;
- permite `ready_with_pending` cuando los pendientes no son bloqueantes;
- devuelve `blocked` cuando existen hallazgos bloqueantes.

---

## 32. Criterios de aceptación

La implementación se considera funcional cuando:

1. recibe fuentes y workspace;
2. produce hallazgos trazables;
3. deduplica hallazgos equivalentes;
4. prioriza contradicciones y alcance antes que detalles secundarios;
5. formula una pregunta principal a la vez;
6. no pregunta información ya definida;
7. interpreta la respuesta en un contrato estructurado;
8. detecta solicitudes nuevas y contradicciones;
9. propone un parche sin aplicarlo automáticamente;
10. permite confirmar, editar, rechazar o diferir;
11. reaudita después de aplicar cambios;
12. conserva historial completo;
13. funciona con fallback manual cuando la IA falla;
14. no declara cierre con bloqueos críticos;
15. mantiene separada la lógica funcional de la implementación técnica del flujo.

---

## 33. Orden recomendado de implementación

### Fase 1 — Base determinística

- definir el esquema del workspace;
- implementar hallazgos;
- implementar reglas de auditoría básicas;
- implementar deduplicación;
- implementar prioridad y dependencias;
- implementar selección de siguiente hallazgo.

### Fase 2 — Preguntas

- implementar contrato `Question`;
- crear plantillas determinísticas por categoría;
- integrar IA para mejorar la redacción;
- agregar formatos de respuesta estructurada.

### Fase 3 — Respuestas y parches

- implementar `AnswerInterpretation`;
- implementar clasificación de alcance;
- implementar `WorkspacePatch`;
- validar rutas y operaciones;
- implementar confirmación y aplicación.

### Fase 4 — Reauditoría y cierre

- reejecutar reglas tras cada parche;
- cerrar o crear hallazgos;
- recalcular prioridad;
- implementar condiciones de cierre.

### Fase 5 — Robustez

- historial;
- fallbacks manuales;
- manejo de timeout;
- validación estricta de esquemas;
- pruebas unitarias y de integración.

---

## 34. Resumen operativo para la IA implementadora

La IA que implemente este módulo debe entender el motor como una máquina de estados y no como un chatbot libre.

La unidad central no es la pregunta, sino el hallazgo.

```text
Hallazgo detectado
      ↓
Hallazgo priorizado
      ↓
Pregunta diseñada para resolverlo
      ↓
Respuesta clasificada
      ↓
Parche propuesto
      ↓
Confirmación humana
      ↓
Workspace actualizado
      ↓
Hallazgo revalidado
```

La auditoría interna es necesaria porque determina qué falta y evita preguntas arbitrarias. La IA debe utilizarse para comprender lenguaje natural y proponer cambios, mientras que las reglas, la prioridad, el control de alcance, la confirmación y la aplicación de cambios deben permanecer controlados por código.
