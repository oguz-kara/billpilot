// lib/store.ts — v1 file store (data/out/invoices.json), Postgres in v2.
import { promises as fs } from "fs";
import path from "path";
import type { ProcessedInvoice } from "./validate";

const OUT_DIR = path.join(process.cwd(), "data", "out");
const FILE = path.join(OUT_DIR, "invoices.json");

export async function listInvoices(): Promise<ProcessedInvoice[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf-8"));
  } catch {
    return [];
  }
}

export async function saveInvoice(inv: ProcessedInvoice): Promise<void> {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const existing = await listInvoices();
  await fs.writeFile(FILE, JSON.stringify([...existing, inv], null, 2));
}
