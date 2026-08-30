// lib/validate.ts — the checks that make BillPilot worth paying for:
// sum validation, property allocation, duplicate detection, review routing.
import { promises as fs } from "fs";
import path from "path";
import type { Invoice, LineItem } from "./schemas";
import { listInvoices } from "./store";

const CONFIDENCE_THRESHOLD = 0.85;
const SUM_TOLERANCE = 0.01;

interface PropertyRegistry {
  properties: { code: string; name: string; address: string }[];
  vendorRules: { vendorMatch: string; defaultSplit?: string[]; propertyFromText?: boolean; recoverable?: boolean }[];
}

export interface AllocatedLine extends LineItem {
  propertyCode: string | null;
}

export interface ProcessedInvoice {
  invoice: Invoice;
  lines: AllocatedLine[];
  status: "approved-pending" | "review";
  reasons: string[];
  checks: {
    sumOk: boolean;
    sumDelta: number;
    duplicate: boolean;
    unallocatedLines: number;
  };
  fileName?: string;
  mock?: boolean;
  processedAt: string;
}

async function loadRegistry(): Promise<PropertyRegistry> {
  return JSON.parse(await fs.readFile(path.join(process.cwd(), "data", "properties.json"), "utf-8"));
}

function allocateLines(invoice: Invoice, registry: PropertyRegistry): AllocatedLine[] {
  const rule = registry.vendorRules.find((r) =>
    invoice.vendor.toLowerCase().includes(r.vendorMatch.toLowerCase()),
  );
  return invoice.lineItems.map((line, i) => {
    // 1) explicit service address on the line wins
    if (line.serviceAddress) {
      const prop = registry.properties.find((p) =>
        line.serviceAddress!.toLowerCase().includes(p.address.toLowerCase()),
      );
      if (prop) return { ...line, propertyCode: prop.code };
    }
    // 2) address mentioned inside the description
    const byText = registry.properties.find((p) =>
      line.description.toLowerCase().includes(p.address.toLowerCase()),
    );
    if (byText) return { ...line, propertyCode: byText.code };
    // 3) vendor default split (round-robin over the rule's properties)
    if (rule?.defaultSplit?.length) {
      return { ...line, propertyCode: rule.defaultSplit[i % rule.defaultSplit.length] };
    }
    return { ...line, propertyCode: null };
  });
}

export async function processInvoice(
  extraction: { invoice: Invoice; mock?: boolean },
  fileName?: string,
): Promise<ProcessedInvoice> {
  const { invoice } = extraction;
  const registry = await loadRegistry();
  const reasons: string[] = [];

  // Σ(lines) + tax must equal the printed total — the LLM line-item weak
  // spot gets caught here instead of landing in QuickBooks.
  const lineSum = invoice.lineItems.reduce((a, l) => a + l.amount, 0);
  const sumDelta = Math.round((lineSum + invoice.tax - invoice.total) * 100) / 100;
  const sumOk = Math.abs(sumDelta) <= SUM_TOLERANCE;
  if (!sumOk) reasons.push(`Sum check failed: lines (${lineSum.toFixed(2)}) + tax (${invoice.tax.toFixed(2)}) ≠ total (${invoice.total.toFixed(2)}), Δ ${sumDelta.toFixed(2)}`);

  if (invoice.confidence < CONFIDENCE_THRESHOLD) {
    reasons.push(`Low extraction confidence: ${invoice.confidence.toFixed(2)} < ${CONFIDENCE_THRESHOLD}`);
  }

  // duplicate: same vendor + invoice number + total within 90 days
  const cutoff = Date.now() - 90 * 24 * 3600 * 1000;
  const existing = await listInvoices();
  const duplicate = existing.some(
    (e) =>
      e.invoice.vendor === invoice.vendor &&
      e.invoice.invoiceNumber === invoice.invoiceNumber &&
      e.invoice.total === invoice.total &&
      new Date(e.processedAt).getTime() > cutoff,
  );
  if (duplicate) reasons.push("Possible duplicate: same vendor + invoice number + total in the last 90 days");

  const lines = allocateLines(invoice, registry);
  const unallocatedLines = lines.filter((l) => !l.propertyCode).length;
  if (unallocatedLines > 0) reasons.push(`${unallocatedLines} line(s) could not be mapped to a property`);

  return {
    invoice,
    lines,
    status: reasons.length > 0 ? "review" : "approved-pending",
    reasons,
    checks: { sumOk, sumDelta, duplicate, unallocatedLines },
    fileName,
    mock: extraction.mock,
    processedAt: new Date().toISOString(),
  };
}
