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

interface QueueItem {
  name: string;
  url: string;
  state: "pending" | "processing" | "done" | "error";
  result?: Processed;
  error?: string;
}

export default function ProcessView() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [qbo, setQbo] = useState<object | null>(null);

  const patch = (i: number, p: Partial<QueueItem>) =>
    setQueue((q) => q.map((item, idx) => (idx === i ? { ...item, ...p } : item)));

  async function handleFiles(files: FileList) {
    const pdfs = [...files].filter((f) => f.type === "application/pdf");
    if (pdfs.length === 0) return toast.error("PDF files only.");
    const start = queue.length;
    const items: QueueItem[] = pdfs.map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f),
      state: "pending",
    }));
    setQueue((q) => [...q, ...items]);
    setBusy(true);
    for (let i = 0; i < pdfs.length; i++) {
      const idx = start + i;
      patch(idx, { state: "processing" });
      try {
        const buf = await pdfs[i].arrayBuffer();
        const base64 = btoa(new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), ""));
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: { data: base64, name: pdfs[i].name } }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? res.statusText);
        patch(idx, { state: "done", result: data });
        setSelected(idx);
        setQbo(null);
      } catch (err) {
        patch(idx, { state: "error", error: String(err) });
      }
    }
    setBusy(false);
  }

  const current = selected !== null ? queue[selected] : null;
  const result = current?.result ?? null;
  const doneCount = queue.filter((q) => q.state === "done").length;
  const reviewCount = queue.filter((q) => q.result?.status === "review").length;

  async function approve() {
    if (!result || selected === null) return;
    const res = await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceNumber: result.invoice.invoiceNumber, processedAt: result.processedAt }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? res.statusText);
    patch(selected, { result: { ...result, status: "approved" } });
    setQbo(data.qbo);
    toast.success("Approved — QuickBooks bill built.");
  }

  return (
    <div>
      <Card className="mb-5">
        <CardBody className="flex flex-wrap items-center gap-3">
          <label className="inline-flex h-8 cursor-pointer items-center rounded-md border border-pq-ash bg-white px-3.5 text-[13px] font-medium text-pq-charcoal hover:bg-pq-mist">
            {busy ? `Processing ${doneCount + 1}/${queue.length}…` : "Choose PDF invoices"}
            <input
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              disabled={busy}
              onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
            />
          </label>
          <span className="text-[12px] text-pq-fog">
            Select a whole month of invoices at once — they queue up, each one extracted, validated and allocated.
            In production the same pipeline runs off the ap@ inbox via n8n. Samples: <Mono>data/invoices/</Mono>.
          </span>
        </CardBody>
      </Card>

      {queue.length > 0 && (
        <Card className="mb-5">
          <div className="flex items-center justify-between border-b border-pq-ash px-4 py-2 text-[12px] text-pq-fog">
            <span>
              <Mono>{doneCount}</Mono>/<Mono>{queue.length}</Mono> processed
              {reviewCount > 0 && (
                <>
                  {" "}· <Mono>{reviewCount}</Mono> need review
                </>
              )}
            </span>
          </div>
          <table className="w-full text-left text-[13px]">
            <tbody>
              {queue.map((item, i) => (
                <tr
                  key={`${item.name}-${i}`}
                  onClick={() => item.state === "done" && (setSelected(i), setQbo(null))}
                  className={`border-b border-pq-ash last:border-b-0 ${
                    item.state === "done" ? "cursor-pointer hover:bg-pq-alt" : ""
                  } ${selected === i ? "bg-pq-alt" : ""}`}
                >
                  <td className="px-4 py-1.5">
                    <Mono className="text-pq-ink">{item.name}</Mono>
                  </td>
                  <td className="px-4 py-1.5">
                    {item.state === "done" && item.result ? (
                      <StatusChip status={item.result.status} />
                    ) : item.state === "error" ? (
                      <span className="text-[12px] text-[#c2410c]">{item.error}</span>
                    ) : (
                      <span className="text-[12px] text-pq-fog">{item.state}…</span>
                    )}
                  </td>
                  <td className="px-4 py-1.5 text-right text-[12px] text-pq-fog">
                    {item.result ? <Mono>${item.result.invoice.total.toFixed(2)}</Mono> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {result && (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* left: the document */}
          <Card className="min-h-[480px] overflow-hidden">
            {current?.url ? (
              <embed src={current.url} type="application/pdf" className="h-[560px] w-full" />
            ) : (
              <CardBody>PDF preview unavailable.</CardBody>
            )}
          </Card>

          {/* right: extraction + checks */}
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <Mono className="font-medium text-pq-ink">{current?.name}</Mono>
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
