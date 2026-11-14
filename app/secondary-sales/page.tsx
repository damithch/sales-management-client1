import { SalesPage } from "@/components/sales";
import type { SearchParams } from "@/lib/filters";

export default function SecondarySales({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return <SalesPage kind="secondary" searchParams={searchParams} />;
}
