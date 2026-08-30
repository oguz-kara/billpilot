// scripts/make-fixtures.mts — generates fictional vendor-invoice PDFs +
// ground truth (data/invoices/truth.json) for the labeled test set.
// All vendors/amounts are fictional (Northgate persona, docs/spec.md).
// One fixture has a deliberately broken sum, one a low mock-confidence,
// and one is a duplicate of another — so every check path is exercised.
import { promises as fs } from "fs";
import path from "path";
import { PDFDocument, StandardFonts } from "pdf-lib";

interface FixtureLine {
  description: string;
  serviceAddress: string | null;
  amount: number;
}
interface Fixture {
  file: string;
  vendor: string;
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  lineItems: FixtureLine[];
  tax: number;
  total: number; // printed total — may deliberately mismatch the sum
  _mockConfidence?: number;
}

const fixtures: Fixture[] = [
  {
    file: "greenscape-2081.pdf",
    vendor: "GreenScape Landscaping LLC",
    invoiceNumber: "GS-2081",
    invoiceDate: "2026-08-04",
    currency: "USD",
    lineItems: [
      { description: "Monthly grounds maintenance — 12 Oakwood Ave", serviceAddress: "12 Oakwood Ave", amount: 640 },
      { description: "Monthly grounds maintenance — 8 Elm St", serviceAddress: "8 Elm St", amount: 580 },
      { description: "Hedge trimming — 23 Maple Ct", serviceAddress: "23 Maple Ct", amount: 210 },
    ],
    tax: 114.4,
    total: 1544.4,
  },
  {
    file: "citypower-448213.pdf",
    vendor: "City Power & Utilities",
    invoiceNumber: "CP-448213",
    invoiceDate: "2026-08-09",
    currency: "USD",
    lineItems: [
      { description: "Electricity service 07/01–07/31, meter 4471 — 5 Pinehill Rd", serviceAddress: "5 Pinehill Rd", amount: 1284.5 },
    ],
    tax: 0,
    total: 1284.5,
  },
  {
    file: "aquaflow-771.pdf",
    vendor: "AquaFlow Plumbing Co",
    invoiceNumber: "AF-771",
    invoiceDate: "2026-08-12",
    currency: "USD",
    lineItems: [
      { description: "Emergency leak repair, unit 3B — 17 Cedar Park Ln", serviceAddress: "17 Cedar Park Ln", amount: 425 },
      { description: "Water heater inspection — 30 Birchview Dr", serviceAddress: "30 Birchview Dr", amount: 150 },
    ],
    tax: 46,
    // DELIBERATE: printed total is wrong (should be 621.00) → Σ check must catch it
    total: 641.0,
  },
  {
    file: "brightclean-1190.pdf",
    vendor: "BrightClean Janitorial",
    invoiceNumber: "BC-1190",
    invoiceDate: "2026-08-15",
    currency: "USD",
    lineItems: [
      { description: "Common area cleaning, weekly x4", serviceAddress: null, amount: 880 },
    ],
    tax: 70.4,
    total: 950.4,
    // No address anywhere and no vendor rule → unallocated line → review
    _mockConfidence: 0.72, // also exercises the low-confidence path in mock
  },
  {
    file: "citypower-448213-copy.pdf",
    vendor: "City Power & Utilities",
    invoiceNumber: "CP-448213",
    invoiceDate: "2026-08-09",
    currency: "USD",
    lineItems: [
      { description: "Electricity service 07/01–07/31, meter 4471 — 5 Pinehill Rd", serviceAddress: "5 Pinehill Rd", amount: 1284.5 },
    ],
    tax: 0,
    total: 1284.5,
    // duplicate of citypower-448213 → duplicate check must catch it
  },
];

async function renderPdf(f: Fixture): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 740;
  const draw = (text: string, opts: { size?: number; b?: boolean; x?: number } = {}) => {
    page.drawText(text, { x: opts.x ?? 50, y, size: opts.size ?? 11, font: opts.b ? bold : font });
    y -= (opts.size ?? 11) + 8;
  };
  draw(f.vendor, { size: 16, b: true });
  draw("INVOICE", { size: 12, b: true });
  y -= 6;
  draw(`Invoice #: ${f.invoiceNumber}`);
  draw(`Date: ${f.invoiceDate}`);
  draw(`Bill to: Northgate Property Management, 400 Commerce Blvd`);
  y -= 10;
  draw("Description", { b: true });
  for (const l of f.lineItems) {
    draw(`${l.description}`);
    page.drawText(`$${l.amount.toFixed(2)}`, { x: 480, y: y + 19, size: 11, font });
  }
  y -= 10;
  draw(`Subtotal: $${f.lineItems.reduce((a, l) => a + l.amount, 0).toFixed(2)}`, { x: 380 });
  draw(`Tax: $${f.tax.toFixed(2)}`, { x: 380 });
  draw(`TOTAL: $${f.total.toFixed(2)}`, { x: 380, b: true });
  return doc.save();
}

async function main() {
  const dir = path.join(process.cwd(), "data", "invoices");
  await fs.mkdir(dir, { recursive: true });
  const truth: Record<string, object> = {};
  for (const f of fixtures) {
    await fs.writeFile(path.join(dir, f.file), await renderPdf(f));
    const { file, ...rest } = f;
    truth[file] = rest;
  }
  await fs.writeFile(path.join(dir, "truth.json"), JSON.stringify(truth, null, 2));
  console.log(`${fixtures.length} fixture PDFs + truth.json → data/invoices/`);
}

main();
