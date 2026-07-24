import { redirect } from "next/navigation";

// Legacy HookLoop route — kept as a redirect during the HypoCycle migration
// (PRD §19.1).
export default function SetupRedirect() {
  redirect("/programs/new");
}
