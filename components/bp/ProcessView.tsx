"use client";
// components/bp/ProcessView.tsx — the flagship screen: drop a PDF invoice,
// see it side-by-side with the extracted fields, checks and property
// allocation; approve to build the multi-line QBO bill.
import { useState } from "react";
import { toast } from "sonner";
import { BpButton, Card, CardBody, MockChip, Mono, StatusChip, TextLink } from "./ui";

interface Line {
  description: string;
  serviceAddress: string | null;
  amount: number;
  propertyCode: string | null;
}
interface Processed {
  invoice: {
    vendor: string;
    invoiceNumber: string;
    invoiceDate: string;
    currency: string;
    tax: number;
    total: number;
    confidence: number;
  };
  lines: Line[];
  status: string;
  reasons: string[];
  mock?: boolean;
  processedAt: string;
}

export default function ProcessView() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Processed | null>(null);
  const [qbo, setQbo] = useState<object | null>(null);

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") return toast.error("PDF files only.");
    setBusy(true);
    setResult(null);
    setQbo(null);
    setFileName(file.name);
    setPdfUrl(URL.createObjectURL(file));
    try {
      const buf = await file.arrayBuffer();
      const base64 = btoa(new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), ""));
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: { data: base64, name: file.name } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setResult(data);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!result) return;
    const res = await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceNumber: result.invoice.invoiceNumber, processedAt: result.processedAt }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? res.statusText);
    setResult({ ...result, status: "approved" });
    setQbo(data.qbo);
    toast.success("Approved — QuickBooks bill built.");
  }

  return (
    <div>
      <Card className="mb-5">
        <CardBody className="flex flex-wrap items-center gap-3">
          <label className="inline-flex h-8 cursor-pointer items-center rounded-md border border-pq-ash bg-white px-3.5 text-[13px] font-medium text-pq-charcoal hover:bg-pq-mist">
            {busy ? "Processing…" : "Choose PDF invoice"}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={busy}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
          <span className="text-[12px] text-pq-fog">
            Extract → validate the math → allocate lines to properties → approve into a QuickBooks bill. Sample
            invoices: <Mono>data/invoices/</Mono> (run <Mono>npm run fixtures</Mono>).
          </span>
        </CardBody>
      </Card>

      {result && (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* left: the document */}
          <Card className="min-h-[480px] overflow-hidden">
            {pdfUrl ? (
              <embed src={pdfUrl} type="application/pdf" className="h-[560px] w-full" />
            ) : (
              <CardBody>PDF preview unavailable.</CardBody>
            )}
          </Card>

          {/* right: extraction + checks */}
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <Mono className="font-medium text-pq-ink">{fileName}</Mono>
              <StatusChip status={result.status} />
              {result.mock && <MockChip />}
              {result.status !== "approved" && (
                <BpButton className="ml-auto" onClick={approve}>
                  Approve → QuickBooks
                </BpButton>
              )}
            </div>

            {result.reasons.length > 0 && (
              <Card className="mb-3 border-[#ca8a04]/50">
                <CardBody className="space-y-1 text-[13px] text-[#854d0e]">
                  {result.reasons.map((r) => (
                    <p key={r}>• {r}</p>
                  ))}
                </CardBody>
              </Card>
            )}

            <Card className="mb-3">
              <CardBody>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
                  <Field label="Vendor" value={result.invoice.vendor} />
                  <Field label="Invoice #" value={<Mono>{result.invoice.invoiceNumber}</Mono>} />
                  <Field label="Date" value={<Mono>{result.invoice.invoiceDate}</Mono>} />
                  <Field
                    label="Confidence"
                    value={<Mono>{result.invoice.confidence.toFixed(2)}</Mono>}
                  />
                  <Field label="Tax" value={<Mono>{fmt(result.invoice.tax, result.invoice.currency)}</Mono>} />
                  <Field label="Total" value={<Mono className="font-medium">{fmt(result.invoice.total, result.invoice.currency)}</Mono>} />
                </dl>
              </CardBody>
            </Card>

            <Card>
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-pq-ash text-[11px] uppercase tracking-wide text-pq-fog">
                  <tr>
                    <th className="px-3 py-2 font-medium">Line</th>
                    <th className="px-3 py-2 font-medium">Property</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lines.map((l, i) => (
                    <tr key={i} className="border-b border-pq-ash last:border-b-0">
                      <td className="px-3 py-2 text-pq-charcoal">{l.description}</td>
                      <td className="px-3 py-2">
                        {l.propertyCode ? (
                          <Mono>{l.propertyCode}</Mono>
                        ) : (
                          <span className="text-[12px] text-[#ca8a04]">unallocated</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Mono>{fmt(l.amount, result.invoice.currency)}</Mono>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {qbo && (
              <details className="mt-3 rounded-lg border border-pq-ash bg-pq-alt p-3 text-[12px]">
                <summary className="cursor-pointer font-medium text-pq-slate">
                  QuickBooks bill payload (multi-line, Class = property)
                </summary>
                <pre className="mt-2 overflow-x-auto font-mono text-[11px] leading-relaxed text-pq-slate">
                  {JSON.stringify(qbo, null, 2)}
                </pre>
              </details>
            )}

            <p className="mt-3 text-[12px] text-pq-fog">
              Processed invoices land in <TextLink href="/invoices">Invoices</TextLink>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-pq-fog">{label}</dt>
      <dd className="mt-0.5 text-pq-charcoal">{value}</dd>
    </div>
  );
}

function fmt(n: number, currency: string) {
  return `${currency === "USD" ? "$" : currency + " "}${n.toFixed(2)}`;
}
