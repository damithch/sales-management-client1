import Link from "next/link";
import { notFound } from "next/navigation";
import { createCollection, deleteCollection } from "@/app/actions";
import { ActionForm, ConfirmButton } from "@/components/forms";
import { FormPanel } from "@/components/panel";
import { Shell } from "@/components/shell";
import { Badge, Field, ListCard, StatCard, Table, Td } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import {
  listCollections,
  openInvoices,
  shopAccount,
  type Invoice,
} from "@/lib/debtors";
import { money, parseId, today, units } from "@/lib/format";
import { getShop } from "@/lib/queries";
import { hasRole } from "@/lib/roles";

const METHOD_LABEL = { cash: "Cash", cheque: "Cheque", bank: "Bank transfer" };

const product = (invoice: Invoice) =>
  [invoice.brand, invoice.model, invoice.capacity].filter(Boolean).join(" ");

function DueBadge({ invoice }: { invoice: Invoice }) {
  if (invoice.days_overdue > 0) {
    return <Badge tone="red">{invoice.days_overdue} days overdue</Badge>;
  }
  return (
    <Badge tone="slate">
      {invoice.days_overdue === 0 ? "Due today" : `Due ${invoice.due_date}`}
    </Badge>
  );
}

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
    <Shell
      session={session}
      title={shop.name}
      description={
        <>
          <Link href="/debtors" className="link">
            ← Debtors
          </Link>
          {" · "}
          {[
            shop.city,
            shop.contact,
            shop.phone,
            `${shop.credit_days} days credit`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </>
      }
      actions={
        <FormPanel
          label="Record collection"
          title="Record a collection"
          description={`Money collected from ${shop.name}`}
        >
          <ActionForm
            action={createCollection.bind(null, shop.id)}
            submit="Save collection"
            className="space-y-4"
          >
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              Owes <strong>{money(account.outstanding)}</strong>
              {overdue > 0 && (
                <>
                  , of which{" "}
                  <strong className="text-rose-700">{money(overdue)}</strong> is
                  overdue
                </>
              )}
            </div>
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
            <Field
              label="Cheque no. or bank reference"
              hint="Not needed for cash"
            >
              <input name="reference" className="input" />
            </Field>
            <p className="text-xs text-slate-500">
              Pays off the oldest unpaid credit sales first.
              {!isAdmin && " Once saved, only the office can remove it."}
            </p>
          </ActionForm>
        </FormPanel>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
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
              : `of ${money(account.credit_sales)} sold on credit`
          }
          accent="bg-amber-500"
        />
        <div className="col-span-2 sm:col-span-1">
          <StatCard
            label="Collected so far"
            value={money(account.collected)}
            note="All collections from this shop"
            accent="bg-emerald-500"
          />
        </div>
      </div>

      <h2 className="mb-3 mt-8 font-semibold">Unpaid credit sales</h2>
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
        align={{ 2: "right", 4: "right", 5: "right" }}
        empty={
          invoices.length === 0 && "Nothing owed. All credit sales are paid."
        }
        cards={invoices.map((invoice) => (
          <ListCard
            key={invoice.id}
            title={product(invoice)}
            subtitle={`${invoice.sale_date} · ${units(invoice.quantity)} × ${money(invoice.price)}`}
            value={money(invoice.balance)}
            valueNote={
              invoice.paid > 0 ? `of ${money(invoice.amount)}` : "owed"
            }
          >
            <DueBadge invoice={invoice} />
            <span>by {invoice.rep}</span>
          </ListCard>
        ))}
      >
        {invoices.map((invoice) => (
          <tr key={invoice.id} className="hover:bg-slate-50">
            <Td className="whitespace-nowrap text-slate-500">
              {invoice.sale_date}
            </Td>
            <Td>
              <span className="font-medium">{product(invoice)}</span>
              <div className="text-xs text-slate-500">
                {units(invoice.quantity)} × {money(invoice.price)}
              </div>
            </Td>
            <Td right className="font-semibold">
              {money(invoice.balance)}
            </Td>
            <Td>
              <DueBadge invoice={invoice} />
            </Td>
            <Td right className="text-slate-500">
              {money(invoice.amount)}
            </Td>
            <Td right className="text-slate-500">
              {invoice.paid > 0 ? money(invoice.paid) : "–"}
            </Td>
            <Td className="whitespace-nowrap text-slate-500">{invoice.rep}</Td>
          </tr>
        ))}
      </Table>

      <h2 className="mb-3 mt-8 font-semibold">Collections</h2>
      <Table
        head={["Date", "Amount", "Paid by", "Reference", "Entered by", ""]}
        align={{ 1: "right" }}
        empty={collections.length === 0 && "Nothing collected yet."}
        cards={collections.map((collection) => (
          <ListCard
            key={collection.id}
            title={money(collection.amount)}
            subtitle={`${collection.collected_on} · ${METHOD_LABEL[collection.method]}${collection.reference ? ` ${collection.reference}` : ""}`}
          >
            <span>by {collection.entered_by}</span>
            {isAdmin && (
              <ConfirmButton
                action={deleteCollection.bind(null, collection.id)}
                message={`Delete this collection of ${money(collection.amount)}? The shop will owe it again.`}
              >
                Delete
              </ConfirmButton>
            )}
          </ListCard>
        ))}
      >
        {collections.map((collection) => (
          <tr key={collection.id} className="hover:bg-slate-50">
            <Td className="whitespace-nowrap text-slate-500">
              {collection.collected_on}
            </Td>
            <Td right className="font-semibold">
              {money(collection.amount)}
            </Td>
            <Td>{METHOD_LABEL[collection.method]}</Td>
            <Td className="text-slate-500">{collection.reference || "–"}</Td>
            <Td className="whitespace-nowrap text-slate-500">
              {collection.entered_by}
            </Td>
            <Td right>
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
    </Shell>
  );
}
