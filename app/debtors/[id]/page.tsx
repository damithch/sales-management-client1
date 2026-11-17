import Link from "next/link";
import { notFound } from "next/navigation";
import { createCollection, deleteCollection } from "@/app/actions";
import { ActionForm, ConfirmButton } from "@/components/forms";
import { Shell } from "@/components/shell";
import { Badge, Field, StatCard, Table, Td } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { listCollections, openInvoices, shopAccount } from "@/lib/debtors";
import { money, parseId, today, units } from "@/lib/format";
import { getShop } from "@/lib/queries";
import { hasRole } from "@/lib/roles";

const METHOD_LABEL = { cash: "Cash", cheque: "Cheque", bank: "Bank transfer" };

export default async function ShopDebt({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("Sales Rep");
  const isAdmin = hasRole(session.role, "Admin");
  const id = parseId((await params).id);
  const shop = id && (await getShop(id));
  if (!shop) notFound();
  const asOf = today();

  const [account, invoices, collections] = await Promise.all([
    shopAccount(shop.id, asOf),
    openInvoices({ asOf, shopId: shop.id }),
    listCollections({ shopId: shop.id }),
  ]);
  const overdue = invoices
    .filter((invoice) => invoice.days_overdue > 0)
    .reduce((sum, invoice) => sum + invoice.balance, 0);

  return (
    <Shell session={session} title={shop.name}>
      <p className="mb-4 text-sm text-slate-500">
        <Link href="/debtors" className="text-brand hover:underline">
          Debtors
        </Link>{" "}
        · {[shop.city, shop.contact, shop.phone].filter(Boolean).join(" · ")} ·{" "}
        {shop.credit_days} days credit
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Overdue"
          value={money(overdue)}
          note="Past the credit period"
          accent="bg-rose-500"
        />
        <StatCard
          label="Total owed"
          value={money(account.outstanding)}
          note={
            account.advance > 0
              ? `${money(account.advance)} paid in advance`
              : `${money(account.credit_sales)} sold on credit, ${money(account.collected)} collected`
          }
          accent="bg-amber-500"
        />
        <StatCard
          label="Collected so far"
          value={money(account.collected)}
          note="All collections from this shop"
          accent="bg-emerald-500"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <ActionForm
          action={createCollection.bind(null, shop.id)}
          submit="Save collection"
        >
          <h2 className="font-bold">Record a collection</h2>
          <Field label="Amount collected">
            <input
              required
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              className="input"
            />
          </Field>
          <Field label="Date collected">
            <input
              required
              name="date"
              type="date"
              max={asOf}
              defaultValue={asOf}
              className="input"
            />
          </Field>
          <Field label="Paid by">
            <select name="method" defaultValue="cash" className="input">
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="bank">Bank transfer</option>
            </select>
          </Field>
          <Field label="Cheque no. or bank reference">
            <input
              name="reference"
              className="input"
              placeholder="Not needed for cash"
            />
          </Field>
          <p className="text-xs text-slate-400">
            Pays off the oldest unpaid credit sales first.
            {!isAdmin && " Once saved, only the office can remove it."}
          </p>
        </ActionForm>

        <div className="min-w-0 space-y-8">
          <section>
            <h2 className="mb-3 font-bold">Unpaid credit sales</h2>
            <Table
              head={[
                "Sale date",
                "Product",
                "Still owed",
                "Due",
                "Amount",
                "Paid",
                "Rep",
              ]}
              empty={
                invoices.length === 0 &&
                "Nothing owed. All credit sales are paid."
              }
            >
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <Td className="whitespace-nowrap text-slate-500">
                    {invoice.sale_date}
                  </Td>
                  <Td>
                    {[invoice.brand, invoice.model, invoice.capacity]
                      .filter(Boolean)
                      .join(" ")}
                    <div className="text-xs text-slate-400">
                      {units(invoice.quantity)} × {money(invoice.price)}
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap font-semibold">
                    {money(invoice.balance)}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {invoice.days_overdue > 0 ? (
                      <Badge tone="red">
                        {invoice.days_overdue} days overdue
                      </Badge>
                    ) : (
                      <span className="text-slate-500">
                        {invoice.due_date}
                        {invoice.days_overdue === 0 ? " (today)" : ""}
                      </span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap">{money(invoice.amount)}</Td>
                  <Td className="whitespace-nowrap">
                    {invoice.paid > 0 ? money(invoice.paid) : "–"}
                  </Td>
                  <Td className="text-slate-500">{invoice.rep}</Td>
                </tr>
              ))}
            </Table>
          </section>

          <section>
            <h2 className="mb-3 font-bold">Collections</h2>
            <Table
              head={[
                "Date",
                "Amount",
                "Paid by",
                "Reference",
                "Entered by",
                "",
              ]}
              empty={collections.length === 0 && "Nothing collected yet."}
            >
              {collections.map((collection) => (
                <tr key={collection.id}>
                  <Td className="whitespace-nowrap text-slate-500">
                    {collection.collected_on}
                  </Td>
                  <Td className="whitespace-nowrap font-semibold">
                    {money(collection.amount)}
                  </Td>
                  <Td>{METHOD_LABEL[collection.method]}</Td>
                  <Td className="text-slate-500">
                    {collection.reference || "–"}
                  </Td>
                  <Td className="text-slate-500">{collection.entered_by}</Td>
                  <Td>
                    {isAdmin && (
                      <ConfirmButton
                        action={deleteCollection.bind(null, collection.id)}
                        message={`Delete this collection of ${money(collection.amount)}? The shop will owe it again.`}
                      >
                        Delete
                      </ConfirmButton>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
          </section>
        </div>
      </div>
    </Shell>
  );
}
