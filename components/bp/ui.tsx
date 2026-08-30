// components/bp/ui.tsx — BillPilot UI primitives, same "ledger" language as
// Prequal: white ground, 1px #e5e5e5 lines, near-black text, data in mono.
import NextLink from "next/link";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-pq-ash bg-white ${className}`}>{children}</div>;
}

export function CardBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

export function BpButton({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  const styles =
    variant === "primary"
      ? "bg-pq-charcoal text-white hover:bg-pq-ink disabled:opacity-40"
      : "border border-pq-ash bg-white text-pq-charcoal hover:bg-pq-mist disabled:opacity-40";
  return (
    <button
      className={`h-8 rounded-md px-3.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pq-blue/40 ${styles} ${className}`}
      {...props}
    />
  );
}

export function Mono({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono text-[12.5px] ${className}`}>{children}</span>;
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <NextLink href={href} className="text-[13px] text-pq-sapphire hover:underline">
      {children}
    </NextLink>
  );
}

const statusColor: Record<string, string> = {
  "approved-pending": "bg-[#16a34a]",
  approved: "bg-[#16a34a]",
  review: "bg-[#ca8a04]",
};
const statusLabel: Record<string, string> = {
  "approved-pending": "Ready",
  approved: "Approved",
  review: "Review",
};

export function StatusChip({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-pq-charcoal">
      <span className={`h-1.5 w-1.5 rounded-[1px] ${statusColor[status] ?? "bg-pq-silver"}`} />
      {statusLabel[status] ?? status}
    </span>
  );
}

export function MockChip() {
  return (
    <span className="inline-flex items-center rounded border border-pq-ash px-1 text-[10px] font-medium uppercase tracking-wide text-pq-fog">
      mock
    </span>
  );
}

const tabs = [
  ["Process", "/"],
  ["Invoices", "/invoices"],
] as const;

export function Shell({
  title,
  subtitle,
  hasMockData,
  active,
  wide,
  children,
}: {
  title: string;
  subtitle: string;
  hasMockData: boolean;
  active?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-white font-app text-pq-charcoal">
      <div className="border-b border-pq-ash">
        <nav className={`mx-auto flex h-12 items-stretch gap-5 px-4 sm:px-6 ${wide ? "max-w-6xl" : "max-w-5xl"}`}>
          <NextLink href="/" className="flex items-center font-mono text-[13px] font-semibold tracking-tight text-pq-ink">
            billpilot
          </NextLink>
          <div className="flex items-stretch gap-4">
            {tabs.map(([label, href]) => (
              <NextLink
                key={href}
                href={href}
                className={`flex items-center border-b-2 px-0.5 text-[13px] ${
                  active === href ? "border-pq-ink font-medium text-pq-ink" : "border-transparent text-pq-fog hover:text-pq-ink"
                }`}
              >
                {label}
              </NextLink>
            ))}
          </div>
          {hasMockData && (
            <span className="ml-auto flex items-center gap-1.5 text-[11px] text-pq-fog">
              <span className="h-1.5 w-1.5 rounded-[1px] bg-pq-lavender" />
              mock data — not measured results
            </span>
          )}
        </nav>
      </div>
      <div className={`mx-auto px-4 py-8 sm:px-6 ${wide ? "max-w-6xl" : "max-w-5xl"}`}>
        <header className="mb-6">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-pq-ink">{title}</h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-pq-fog">{subtitle}</p>
        </header>
        {children}
      </div>
    </main>
  );
}
