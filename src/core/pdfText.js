// Turns pdf.js text items into plain text lines.
//
// The bank parsers were written against Apache PDFBox output (PDFTextStripper with
// sortByPosition = false). To stay close to it, items are kept in content stream
// order, a new line starts when an item does not vertically overlap the previous one,
// and a space is inserted when the horizontal gap between two items is wide enough.

const SAME_BASELINE_TOLERANCE = 0.1;
const SPACE_GAP_RATIO = 0.15;

function within(first, second, tolerance) {
  return Math.abs(first - second) <= tolerance;
}

// Port of PDFBox PDFTextStripper#overlap, with y growing upwards (PDF user space).
function overlaps(previous, next) {
  return within(previous.y, next.y, SAME_BASELINE_TOLERANCE)
    || (next.y >= previous.y && next.y <= previous.y + previous.height)
    || (previous.y >= next.y && previous.y <= next.y + next.height);
}

function geometry(item) {
  const [a = 0, b = 0, c = 0, d = 0, x = 0, y = 0] = item.transform || [];
  const fontSize = Math.hypot(c, d) || Math.hypot(a, b) || item.height || 1;
  return {
    x,
    y,
    height: item.height || fontSize,
    fontSize,
    endX: x + (item.width || 0)
  };
}

/**
 * @param {Array<{str: string, transform: number[], width: number, height: number}>} items
 * @returns {string[]} text lines of one page
 */
export function itemsToLines(items) {
  const lines = [];
  let line = '';
  let previous = null;

  for (const item of items) {
    const str = item.str || '';
    if (!str) continue;

    if (!str.trim()) {
      // Whitespace-only items carry no reliable position; treat them as a word break.
      if (line && !line.endsWith(' ')) line += ' ';
      continue;
    }

    const current = geometry(item);
    if (previous && !overlaps(previous, current)) {
      lines.push(line);
      line = '';
      previous = null;
    }

    if (previous && line && !line.endsWith(' ') && !str.startsWith(' ')) {
      const gap = current.x - previous.endX;
      const threshold = Math.max(previous.fontSize, current.fontSize) * SPACE_GAP_RATIO;
      if (gap > threshold || gap < -current.fontSize) line += ' ';
    }

    line += str;
    previous = current;
  }

  if (line) lines.push(line);
  return lines.map((value) => value.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/**
 * Extracts the text of every page of a PDF.
 * @param {ArrayBuffer|Uint8Array} data
 * @param {object} pdfjs the pdf.js module (injected so it can be loaded lazily)
 * @param {object} [documentOptions] extra getDocument options (cMapUrl, ...)
 */
export async function extractPdfText(data, pdfjs, documentOptions = {}) {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const loadingTask = pdfjs.getDocument({ data: bytes, ...documentOptions });
  try {
    const document = await loadingTask.promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(itemsToLines(content.items).join('\n'));
      page.cleanup();
    }
    return pages.join('\n');
  } finally {
    // Releases the document and its worker, also when loading failed.
    await loadingTask.destroy();
  }
}
