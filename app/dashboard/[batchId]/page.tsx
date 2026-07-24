import { redirect } from "next/navigation";

// Legacy HookLoop route — kept as a redirect during the HypoCycle migration
// (PRD §19.1). A batch is a cycle in the new model, so the id carries over.
export default function DashboardRedirect({
  params,
}: {
  params: { batchId: string };
}) {
  redirect(`/cycles/${params.batchId}`);
}
