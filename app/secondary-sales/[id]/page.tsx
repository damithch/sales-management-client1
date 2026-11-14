import { SaleEditPage } from "@/components/sales";

export default function EditSecondarySale({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <SaleEditPage kind="secondary" params={params} />;
}
