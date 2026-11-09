import type { Bbox, Page } from "tesseract.js";

type Fragment = { text: string; bbox: Bbox };

// Separate OCR blocks may contain a label and its right-hand amount. Rejoin fragments
// on the same printed row before parsing, rather than losing that relationship.
export function receiptTextFromLayout(page: Pick<Page, "text" | "blocks">): string {
  const fragments: Fragment[] = (page.blocks ?? [])
    .flatMap((block) =>
      block.paragraphs.flatMap((paragraph) =>
        paragraph.lines.map(({ text, bbox }) => ({ text: text.trim(), bbox })),
      ),
    )
    .filter((line) => line.text);
  if (!fragments.length) return page.text;
  fragments.sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
  const rows: Fragment[][] = [];
  for (const fragment of fragments) {
    const row = rows.at(-1);
    const anchor = row?.[0];
    const overlap = anchor
      ? Math.min(anchor.bbox.y1, fragment.bbox.y1) - Math.max(anchor.bbox.y0, fragment.bbox.y0)
      : 0;
    const height = anchor
      ? Math.min(anchor.bbox.y1 - anchor.bbox.y0, fragment.bbox.y1 - fragment.bbox.y0)
      : 0;
    if (row && height > 0 && overlap / height >= 0.6) row.push(fragment);
    else rows.push([fragment]);
  }
  return rows
    .map((row) =>
      row
        .sort((a, b) => a.bbox.x0 - b.bbox.x0)
        .map((line) => line.text)
        .join("  "),
    )
    .join("\n");
}
