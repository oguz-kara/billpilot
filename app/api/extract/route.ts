// app/api/extract/route.ts — POST { file: { data: base64, name? } }
// → extraction + validation result. HOT path for both the UI and n8n.
import { NextResponse } from "next/server";
import { extractInvoice } from "@/lib/extract";
import { processInvoice } from "@/lib/validate";
import { saveInvoice } from "@/lib/store";

export const maxDuration = 100;

export async function POST(req: Request) {
  try {
    const { file } = await req.json();
    if (!file?.data) {
      return NextResponse.json({ error: "file.data (base64 PDF) is required" }, { status: 400 });
    }

    const extraction = await extractInvoice(file.data, file.name);
    const processed = await processInvoice(extraction, file.name);
    await saveInvoice(processed);

    return NextResponse.json({ ...processed, usage: extraction.usage, durationMs: extraction.durationMs });
  } catch (error) {
    return NextResponse.json({ error: `Failed to extract invoice | ${error}` }, { status: 500 });
  }
}
