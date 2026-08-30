// app/(preview)/page.tsx — BillPilot product entry: process an invoice.
// (The base repo's quiz demo was replaced; see git history for the original.)
import { Shell } from "@/components/bp/ui";
import ProcessView from "@/components/bp/ProcessView";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <Shell
      active="/"
      wide
      title="Process an invoice"
      subtitle="Drop a vendor PDF. BillPilot extracts the fields with Claude, checks that lines + tax equal the printed total, maps every line to a property, flags duplicates — and turns approval into a QuickBooks multi-line bill."
      hasMockData={process.env.BILLPILOT_MOCK === "1"}
    >
      <ProcessView />
    </Shell>
  );
}
