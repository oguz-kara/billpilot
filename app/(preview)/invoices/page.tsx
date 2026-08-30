// app/invoices/page.tsx — the invoice ledger over the store.
import { listInvoices } from "@/lib/store";
import { MockChip, Mono, Shell, StatusChip } from "@/components/bp/ui";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const invoices = (await listInvoices()).sort((a, b) => b.processedAt.localeCompare(a.processedAt));
  return (
    <Shell
      active="/invoices"
      title="Invoices"
      subtitle={`${invoices.length} processed invoices. Review items carry the reason they were flagged.`}
      hasMockData={invoices.some((i) => i.mock)}
    >
      <div className="overflow-x-auto rounded-lg border border-pq-ash">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-pq-ash text-[11px] uppercase tracking-wide text-pq-fog">
            <tr>
              <th className="px-3 py-2 font-medium">Vendor</th>
              <th className="px-3 py-2 font-medium">Invoice #</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
              <th className="px-3 py-2 font-medium">Lines</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Flags</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={`${inv.invoice.invoiceNumber}-${inv.processedAt}`} className="border-b border-pq-ash last:border-b-0 hover:bg-pq-alt">
                <td className="px-3 py-2 text-pq-charcoal">
                  {inv.invoice.vendor}
                  {inv.mock && (
                    <span className="ml-2 align-middle">
                      <MockChip />
                    </span>
                  )}
                </td>
                <td className="px-3 py-2"><Mono>{inv.invoice.invoiceNumber}</Mono></td>
                <td className="px-3 py-2"><Mono>{inv.invoice.invoiceDate}</Mono></td>
                <td className="px-3 py-2 text-right"><Mono className="font-medium text-pq-ink">${inv.invoice.total.toFixed(2)}</Mono></td>
                <td className="px-3 py-2">
                  <Mono>{inv.lines.length}</Mono>{" "}
                  <span className="text-[11px] text-pq-fog">
                    → {[...new Set(inv.lines.map((l) => l.propertyCode ?? "?"))].join(", ")}
                  </span>
                </td>
                <td className="px-3 py-2"><StatusChip status={inv.status} /></td>
                <td className="px-3 py-2 text-[12px] text-pq-fog">{inv.reasons.join(" | ") || "—"}</td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-[13px] text-pq-fog">
                  Nothing processed yet — run <Mono>npm run batch</Mono> or drop a PDF on the Process page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
