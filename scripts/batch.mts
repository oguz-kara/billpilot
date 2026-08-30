// scripts/batch.mts — measurement run over data/invoices/*.pdf.
// Usage: npm run batch
// Compares extraction against truth.json, reports field accuracy and which
// checks fired. Only real (non-mock) runs may feed README "Measured".
import { promises as fs } from "fs";
import path from "path";
import { extractInvoice, isMock } from "../lib/extract";
import { processInvoice } from "../lib/validate";
import { saveInvoice } from "../lib/store";
import type { Invoice } from "../lib/schemas";

function fieldAccuracy(got: Invoice, want: Invoice): { correct: number; total: number } {
  let correct = 0;
  let total = 0;
  const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const scalar: (keyof Invoice)[] = ["vendor", "invoiceNumber", "invoiceDate", "currency", "tax", "total"];
  for (const k of scalar) {
    total++;
    if (eq(got[k], want[k])) correct++;
  }
  total++;
  if (got.lineItems.length === want.lineItems.length) correct++;
  for (let i = 0; i < Math.min(got.lineItems.length, want.lineItems.length); i++) {
    total++;
    if (Math.abs(got.lineItems[i].amount - want.lineItems[i].amount) < 0.01) correct++;
  }
  return { correct, total };
}

async function main() {
  const dir = path.join(process.cwd(), "data", "invoices");
  const truth = JSON.parse(await fs.readFile(path.join(dir, "truth.json"), "utf-8")) as Record<string, Invoice>;
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".pdf"));

  let acc = { correct: 0, total: 0 };
  let sumCaught = 0;
  let dupCaught = 0;
  let reviewCount = 0;
  let ms = 0;
  const tokens = { in: 0, out: 0 };

  console.log(`Processing ${files.length} invoices...\n`);
  for (const file of files) {
    const pdf = await fs.readFile(path.join(dir, file));
    const extraction = await extractInvoice(pdf.toString("base64"), file);
    const processed = await processInvoice(extraction, file);
    await saveInvoice(processed);

    const want = truth[file];
    if (want) {
      const a = fieldAccuracy(processed.invoice, want);
      acc = { correct: acc.correct + a.correct, total: acc.total + a.total };
    }
    if (!processed.checks.sumOk) sumCaught++;
    if (processed.checks.duplicate) dupCaught++;
    if (processed.status === "review") reviewCount++;
    ms += extraction.durationMs;
    tokens.in += extraction.usage.inputTokens;
    tokens.out += extraction.usage.outputTokens;

    console.log(
      `${processed.status === "review" ? "REVIEW " : "OK     "}${file.padEnd(28)} ${processed.invoice.vendor.padEnd(28)} $${processed.invoice.total.toFixed(2).padStart(9)}  ${processed.reasons.join(" | ") || "-"}`,
    );
  }

  console.log(
    isMock()
      ? `\n--- MOCK RUN (${new Date().toISOString().slice(0, 10)}) — NOT for portfolio numbers ---`
      : `\n--- Measured (${new Date().toISOString().slice(0, 10)}) ---`,
  );
  console.log(`invoices processed:   ${files.length}`);
  console.log(`field accuracy:       ${acc.total ? ((acc.correct / acc.total) * 100).toFixed(1) : "-"}% (${acc.correct}/${acc.total})`);
  console.log(`sum-check catches:    ${sumCaught}`);
  console.log(`duplicate catches:    ${dupCaught}`);
  console.log(`sent to review:       ${reviewCount}/${files.length}`);
  console.log(`avg time per invoice: ${(ms / files.length / 1000).toFixed(1)}s`);
  console.log(`tokens (in/out):      ${tokens.in} / ${tokens.out}`);
}

main();
