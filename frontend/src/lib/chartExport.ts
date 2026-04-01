import Plotly from 'plotly.js/dist/plotly';
import { jsPDF } from 'jspdf';

let graphDiv: HTMLElement | null = null;

export function registerGraphDiv(el: HTMLElement): void {
  graphDiv = el;
}

export async function exportPng(): Promise<void> {
  if (!graphDiv) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (Plotly as any).downloadImage(graphDiv, {
    format: 'png',
    scale: 3,
    filename: 'psychrometric-chart',
  });
}

export async function exportPdf(): Promise<void> {
  if (!graphDiv) return;
  // Render at the exact PDF print area dimensions (×4 for resolution) so
  // addImage doesn't distort the aspect ratio and shift annotation positions.
  const PDF_W_MM = 277;
  const PDF_H_MM = 190;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataUrl = await (Plotly as any).toImage(graphDiv, {
    format: 'png',
    width: PDF_W_MM * 4,
    height: PDF_H_MM * 4,
  });
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  // A4 landscape: 297mm × 210mm, minus 10mm margins on each side
  pdf.addImage(dataUrl, 'PNG', 10, 10, PDF_W_MM, PDF_H_MM);
  pdf.save('psychrometric-chart.pdf');
}
