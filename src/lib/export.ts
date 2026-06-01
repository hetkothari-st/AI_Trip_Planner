"use client";

/**
 * Lightweight, dependency-free exports.
 * - Excel: an HTML-table workbook that Excel opens natively as .xls.
 * - PDF: handled via window.print() against a print stylesheet (see globals.css).
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface Sheet {
  name: string;
  headers: string[];
  rows: (string | number)[][];
}

export function downloadExcel(filename: string, sheets: Sheet[]) {
  // Inline styles so Excel/Sheets render a clean, formatted workbook rather than
  // a bare grid: shaded header band, banded rows, sane column padding.
  const styles = `
    body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; }
    h3 { font-size: 15px; text-transform: uppercase; letter-spacing: 1px;
         border-bottom: 3px solid #1a1a1a; padding-bottom: 4px; margin: 18px 0 6px; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th { background: #1a1a1a; color: #fff; text-align: left; padding: 8px 10px;
         text-transform: uppercase; font-size: 11px; letter-spacing: .5px;
         border: 1px solid #1a1a1a; }
    td { padding: 6px 10px; border: 1px solid #c8c8c8; vertical-align: top; }
    tr:nth-child(even) td { background: #f2f2f2; }`;

  const tables = sheets
    .map(
      (s) => `
      <h3>${escapeHtml(s.name)}</h3>
      <table>
        <thead><tr>${s.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
        <tbody>
          ${s.rows
            .map(
              (r) =>
                `<tr>${r
                  .map((c) => `<td>${escapeHtml(String(c))}</td>`)
                  .join("")}</tr>`,
            )
            .join("")}
        </tbody>
      </table>`,
    )
    .join("");

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"/><style>${styles}</style></head><body>${tables}</body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  triggerDownload(blob, filename.endsWith(".xls") ? filename : `${filename}.xls`);
}

export function downloadPdf() {
  // Browser print dialog → "Save as PDF". Print CSS keeps only the itinerary.
  window.print();
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
