// Extracción de texto en el navegador para los documentos requeridos del análisis
// inicial (SOW .docx y Baseline .xlsx), además de archivos de texto plano.

import mammoth from "mammoth";
import * as XLSX from "xlsx";

const TEXT_EXTENSIONS = ["txt", "md", "csv", "json", "html"];
const MAX_CHARS = 60000; // tope para no saturar el prompt de la IA
const LARGE_FILE_BYTES = 12 * 1024 * 1024; // 12 MB → xlsx pesado (ej. Baseline)

const MAX_PDF_PAGES = 100;

export interface ExtractResult {
  text: string;
  note?: string; // aviso cuando la extracción fue parcial
}

function ext(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

async function extractDocx(file: File): Promise<ExtractResult> {
  const buffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
  return { text: value.slice(0, MAX_CHARS) };
}

async function extractXlsx(file: File): Promise<ExtractResult> {
  const buffer = await file.arrayBuffer();
  const isLarge = file.size > LARGE_FILE_BYTES;

  // El Baseline real trae 250+ hojas (una por cliente). Para archivos pesados
  // limitamos filas y solo tomamos las primeras hojas: basta la plantilla de
  // funnel/KPIs (Awareness→Lead→MQL→SQL→Opportunity), no todas las cuentas.
  const wb = XLSX.read(buffer, {
    type: "array",
    sheetRows: isLarge ? 40 : 200,
  });

  const sheetNames = wb.SheetNames;
  const sheetsToRead = isLarge ? sheetNames.slice(0, 2) : sheetNames.slice(0, 12);

  const parts: string[] = [];
  for (const name of sheetsToRead) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
    if (csv.trim()) parts.push(`### Hoja: ${name}\n${csv.slice(0, 8000)}`);
  }

  let text = parts.join("\n\n");
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);

  const note = isLarge
    ? `Archivo grande (${(file.size / 1024 / 1024).toFixed(0)} MB, ${sheetNames.length} hojas). Se extrajo solo la plantilla de funnel/KPIs de las primeras hojas; el detalle por cuenta se omite del análisis.`
    : undefined;

  return { text, note };
}

async function extractText(file: File): Promise<ExtractResult> {
  const text = await file.text();
  return { text: text.slice(0, MAX_CHARS) };
}

async function extractPdf(file: File): Promise<ExtractResult> {
  const [{ getDocument, GlobalWorkerOptions }, { default: pdfWorkerUrl }] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const pagesToRead = Math.min(pdf.numPages, MAX_PDF_PAGES);
  const parts: string[] = [];
  let extractedChars = 0;

  for (let pageNumber = 1; pageNumber <= pagesToRead && extractedChars < MAX_CHARS; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ")
      .trim();

    if (pageText) {
      const remaining = MAX_CHARS - extractedChars;
      const section = `### Página ${pageNumber}\n${pageText.slice(0, remaining)}`;
      parts.push(section);
      extractedChars += section.length;
    }
  }

  const text = parts.join("\n\n");
  if (!text) {
    return {
      text: "",
      note: "El PDF no contiene texto seleccionable. Si es un escaneo, aplícale OCR o pega el contenido manualmente.",
    };
  }

  const note =
    pdf.numPages > pagesToRead
      ? `PDF de ${pdf.numPages} páginas. Se analizaron las primeras ${pagesToRead} para mantener el contexto de IA manejable.`
      : extractedChars >= MAX_CHARS
      ? `El texto del PDF se recortó a ${MAX_CHARS.toLocaleString()} caracteres para el análisis de IA.`
      : undefined;

  return { text, note };
}

/** Devuelve el texto analizable de un archivo, o cadena vacía si el formato no se soporta. */
export async function extractDocumentText(file: File): Promise<ExtractResult> {
  const e = ext(file.name);
  try {
    if (e === "docx") return await extractDocx(file);
    if (e === "xlsx" || e === "xlsm" || e === "xls") return await extractXlsx(file);
    if (e === "pdf" || file.type === "application/pdf") return await extractPdf(file);
    if (TEXT_EXTENSIONS.includes(e) || file.type.startsWith("text/")) return await extractText(file);
  } catch (err) {
    console.error("extractDocumentText failed for", file.name, err);
    return { text: "", note: "No se pudo extraer texto de este archivo." };
  }
  return { text: "", note: "Formato sin extracción automática. Pega su contenido manualmente." };
}

// --- Documentos requeridos para el análisis inicial ---

export interface RequiredDoc {
  key: string;
  label: string;
  hint: string;
  match: (fileName: string) => boolean;
}

export const REQUIRED_DOCS: RequiredDoc[] = [
  {
    key: "sow",
    label: "SOW (Statement of Work)",
    hint: "Alcance prometido al cliente: casos de uso, integraciones, fases, límites.",
    match: (n) => /\bsow\b|statement of work/i.test(n),
  },
  {
    key: "baseline",
    label: "Baseline Onboarding",
    hint: "Funnel y KPIs: calificación de leads (Awareness→Lead→MQL→SQL→Opportunity).",
    match: (n) => /baseline/i.test(n),
  },
];

export function detectRequiredDoc(fileName: string): string | null {
  const found = REQUIRED_DOCS.find((r) => r.match(fileName));
  return found ? found.key : null;
}
