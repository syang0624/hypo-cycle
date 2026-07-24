import Link from "next/link";
import SandboxRunner from "@/components/SandboxRunner";

export default function SandboxPage() {
  return (
    <>
      <div className="bg-foreground px-4 py-2 text-center text-[12px] font-medium text-card">
        Live experiment · Real provider calls · Ephemeral isolated runtime
        <Link href="/demo" className="ml-3 underline underline-offset-2">
          View static demo
        </Link>
        <Link href="/" className="ml-3 underline underline-offset-2">
          Back home
        </Link>
      </div>
      <SandboxRunner />
    </>
  );
}
