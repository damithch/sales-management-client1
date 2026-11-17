// Pure pricing rules, shared by the server and the sale form in the browser.

export type SaleKind = "primary" | "secondary";
export type PaymentTerms = "cash" | "credit";

export type PriceTiers = {
  rd_cash: number | null;
  rd_credit: number | null;
  dealer_cash: number | null;
  dealer_credit: number | null;
};

/**
 * The price a sale defaults to: RD price on primary sales (what the
 * distributor pays), Dealer price on secondary sales (what shops pay).
 * A missing credit price falls back to the cash price.
 */
export function defaultPrice(
  product: PriceTiers,
  kind: SaleKind,
  terms: PaymentTerms,
): number | null {
  const [cash, credit] =
    kind === "primary"
      ? [product.rd_cash, product.rd_credit]
      : [product.dealer_cash, product.dealer_credit];
  return terms === "credit" ? (credit ?? cash) : cash;
}
