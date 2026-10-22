/**
 * Reads the text of a PDF inside the visitor's browser, so a large brochure never has to be uploaded.
 * pdf.js is loaded on demand from cdnjs (version pinned) the first time a big file is chosen.
 * Browser only. The text is cleaned and checked on the server by lib/textInput.ts.
 */

const VERSION = "3.11.174";
const BASE = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${VERSION}`;
const MAX_PAGES = 150;

interface PdfJs {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: { data: Uint8Array }) => { promise: Promise<PdfDoc> };
}
interface PdfDoc {
  numPages: number;
  getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: { str?: string; hasEOL?: boolean }[] }> }>;
}

let loading: Promise<PdfJs> | null = null;

function loadPdfJs(): Promise<PdfJs> {
  const w = window as unknown as { pdfjsLib?: PdfJs };
  if (w.pdfjsLib) return Promise.resolve(w.pdfjsLib);
  if (!loading) {
    loading = new Promise<PdfJs>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `${BASE}/pdf.min.js`;
      s.async = true;
      s.onload = () => {
        const lib = w.pdfjsLib;
        if (!lib) return reject(new Error("The PDF reader did not start."));
        lib.GlobalWorkerOptions.workerSrc = `${BASE}/pdf.worker.min.js`;
        resolve(lib);
      };
      s.onerror = () => {
        loading = null;
        reject(new Error("Could not load the PDF reader. Please check your connection and try again, or use a PDF under 4 MB."));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/** Returns the text of up to the first 150 pages, page by page. */
export async function extractPdfText(file: File, onPage?: (done: number, total: number) => void): Promise<string> {
  const lib = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await lib.getDocument({ data }).promise;
  const total = Math.min(doc.numPages, MAX_PAGES);
  const pages: string[] = [];
  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((it) => (it.str ?? "") + (it.hasEOL ? "\n" : " ")).join(""));
    onPage?.(i, total);
  }
  return pages.join("\n\n");
}
