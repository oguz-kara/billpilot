// lib/extract.ts — core extraction: PDF (base64) → Invoice via Claude's
// native PDF input. Mock mode (BILLPILOT_MOCK=1) returns fixture ground
// truth so the pipeline runs without API credits; mock output is labeled
// and never feeds measured numbers.
import { promises as fs } from "fs";
import path from "path";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { invoiceSchema, type Invoice } from "./schemas";

export const isMock = () => process.env.BILLPILOT_MOCK === "1";

export interface Extraction {
  invoice: Invoice;
  usage: { inputTokens: number; outputTokens: number };
  durationMs: number;
  mock?: boolean;
}

async function mockExtract(fileName?: string): Promise<Extraction> {
  // If the file is one of our fixtures, return its ground truth (with a
  // deliberate imperfection: confidence comes from the truth file so the
  // review-queue path stays exercisable).
  if (fileName) {
    try {
      const truth = JSON.parse(
        await fs.readFile(path.join(process.cwd(), "data", "invoices", "truth.json"), "utf-8"),
      ) as Record<string, Invoice & { _mockConfidence?: number }>;
      const t = truth[fileName];
      if (t) {
        const { _mockConfidence, ...inv } = t;
        return {
          invoice: { ...(inv as Invoice), confidence: _mockConfidence ?? 0.95 },
          usage: { inputTokens: 0, outputTokens: 0 },
          durationMs: 30,
          mock: true,
        };
      }
    } catch {
      /* fall through to generic fake */
    }
  }
  return {
    invoice: {
      vendor: "[MOCK] Unknown Vendor",
      invoiceNumber: "MOCK-0000",
      invoiceDate: "2026-08-01",
      currency: "USD",
      lineItems: [{ description: "[MOCK] Service", serviceAddress: null, amount: 100 }],
      tax: 8,
      total: 108,
      confidence: 0.5,
    },
    usage: { inputTokens: 0, outputTokens: 0 },
    durationMs: 30,
    mock: true,
  };
}

export async function extractInvoice(pdfBase64: string, fileName?: string): Promise<Extraction> {
  if (isMock()) return mockExtract(fileName);

  const started = Date.now();
  const { object, usage } = await generateObject({
    model: anthropic(process.env.BILLPILOT_MODEL ?? "claude-sonnet-5"),
    schema: invoiceSchema,
    system:
      "You extract structured data from vendor invoices for an accounting pipeline. " +
      "Copy values exactly as printed; never invent line items or round totals. " +
      "If a field is unreadable, choose the most likely value and lower your confidence score.",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Extract this invoice." },
          { type: "file", data: pdfBase64, mimeType: "application/pdf" },
        ],
      },
    ],
  });

  return {
    invoice: object,
    usage: {
      inputTokens: usage?.promptTokens ?? 0,
      outputTokens: usage?.completionTokens ?? 0,
    },
    durationMs: Date.now() - started,
  };
}
