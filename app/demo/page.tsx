import Link from "next/link";
import DemoDashboard from "@/components/DemoDashboard";
import { DEMO_CAMPAIGN, DEMO_OVERALL } from "@/lib/demoReels";

export default function DemoPage() {
  return (
    <>
      <div className="bg-foreground px-4 py-2 text-center text-[12px] font-medium text-card">
        Local interactive demo · Sample campaign data · No backend required
        <Link href="/" className="ml-3 underline underline-offset-2">
          Back home
        </Link>
        <Link href="/sandbox" className="ml-3 underline underline-offset-2">
          Run live sandbox
        </Link>
      </div>
      <DemoDashboard weeks={DEMO_CAMPAIGN} overall={DEMO_OVERALL} />
    </>
  );
}
