// app/api/approve/route.ts — POST { invoiceNumber, processedAt }
// Marks a processed invoice approved and builds/simulates the QBO bill.
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { listInvoices } from "@/lib/store";
import { postBill } from "@/lib/qbo";

export async function POST(req: Request) {
  try {
    const { invoiceNumber, processedAt } = await req.json();
    const all = await listInvoices();
    const idx = all.findIndex((i) => i.invoice.invoiceNumber === invoiceNumber && i.processedAt === processedAt);
    if (idx === -1) {
      return NextResponse.json({ error: "invoice not found" }, { status: 404 });
    }

    const qbo = await postBill(all[idx]);
    all[idx] = { ...all[idx], status: "approved" as never, ...( { qbo } as object) };
    await fs.writeFile(path.join(process.cwd(), "data", "out", "invoices.json"), JSON.stringify(all, null, 2));

    return NextResponse.json({ status: "approved", qbo });
  } catch (error) {
    return NextResponse.json({ error: `Failed to approve | ${error}` }, { status: 500 });
  }
}
