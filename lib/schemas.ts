import { z } from "zod";

// Invoice extraction schema — what Claude returns for a vendor PDF invoice.
export const lineItemSchema = z.object({
  description: z.string(),
  serviceAddress: z
    .string()
    .nullable()
    .describe("Street address this line refers to, if the invoice states one (e.g. '12 Oakwood Ave')"),
  amount: z.number().describe("Line amount excluding tax"),
});

export const invoiceSchema = z.object({
  vendor: z.string().describe("Vendor / supplier company name as printed"),
  invoiceNumber: z.string(),
  invoiceDate: z.string().describe("ISO date YYYY-MM-DD"),
  currency: z.string().describe("ISO code, e.g. USD"),
  lineItems: z.array(lineItemSchema).min(1),
  tax: z.number().describe("Total tax amount; 0 if none shown"),
  total: z.number().describe("Grand total including tax, as printed"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Self-assessed extraction confidence: 1 = every field clearly legible, lower if anything was guessed"),
});

export type LineItem = z.infer<typeof lineItemSchema>;
export type Invoice = z.infer<typeof invoiceSchema>;

// ---- legacy quiz schema (base repo demo, /api/generate-quiz still uses it) ----
export const questionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  answer: z.enum(["A", "B", "C", "D"]),
});
export type Question = z.infer<typeof questionSchema>;
export const questionsSchema = z.array(questionSchema).length(4);
