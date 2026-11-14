import { SalesPage } from "@/components/sales";
import type { SearchParams } from "@/lib/filters";

export default function PrimarySales({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return <SalesPage kind="primary" searchParams={searchParams} />;
}
