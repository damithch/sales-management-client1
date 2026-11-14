import { SaleEditPage } from "@/components/sales";

export default function EditPrimarySale({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <SaleEditPage kind="primary" params={params} />;
}
