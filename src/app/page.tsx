import Shell from "@/components/Shell";
import { fetchDashboard } from "@/lib/queries";

export const dynamic = "force-dynamic"; // always render fresh on request

export default async function Page() {
  const initial = await fetchDashboard();
  return <Shell initial={initial} />;
}
