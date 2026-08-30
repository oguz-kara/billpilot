// lib/qbo.ts — QuickBooks Online bill payload. The differentiator: a
// MULTI-LINE Bill with Class = property code per line (n8n's stock QBO node
// writes single-line bills only; Hubdoc posts header-level docs).
// Real posting needs an Intuit sandbox + OAuth (v2 backlog); until then the
// payload is built for real and the POST is simulated.
import { isMock } from "./extract";
import type { ProcessedInvoice } from "./validate";

export interface QboOutcome {
  action: "posted" | "simulated" | "skipped-no-creds";
  detail: string;
  payload: object;
}

export function buildBillPayload(p: ProcessedInvoice): object {
  return {
    VendorRef: { name: p.invoice.vendor },
    DocNumber: p.invoice.invoiceNumber,
    TxnDate: p.invoice.invoiceDate,
    CurrencyRef: { value: p.invoice.currency },
    PrivateNote: `BillPilot — ${p.fileName ?? "upload"}; checks: sum=${p.checks.sumOk ? "ok" : "FAIL"}, dup=${p.checks.duplicate ? "FLAGGED" : "no"}`,
    Line: [
      ...p.lines.map((l) => ({
        DetailType: "AccountBasedExpenseLineDetail",
        Amount: l.amount,
        Description: l.description,
        AccountBasedExpenseLineDetail: {
          AccountRef: { name: "Repairs & Maintenance" },
          ClassRef: { name: l.propertyCode ?? "UNALLOCATED" },
        },
      })),
      ...(p.invoice.tax > 0
        ? [
            {
              DetailType: "AccountBasedExpenseLineDetail",
              Amount: p.invoice.tax,
              Description: "Tax",
              AccountBasedExpenseLineDetail: { AccountRef: { name: "Sales Tax Paid" } },
            },
          ]
        : []),
    ],
  };
}

export async function postBill(p: ProcessedInvoice): Promise<QboOutcome> {
  const payload = buildBillPayload(p);
  if (isMock() || p.mock) {
    return { action: "simulated", detail: `[MOCK] would POST multi-line Bill (${p.lines.length} lines + tax) to QBO`, payload };
  }
  if (!process.env.QBO_CLIENT_ID || !process.env.QBO_REALM_ID) {
    return { action: "skipped-no-creds", detail: "QBO sandbox credentials not set", payload };
  }
  // Real Intuit API call lands with the sandbox integration (docs/spec.md v2 backlog).
  return { action: "skipped-no-creds", detail: "QBO OAuth flow not wired yet", payload };
}
