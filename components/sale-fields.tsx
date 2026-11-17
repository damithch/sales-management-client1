"use client";

import { useState } from "react";
import {
  defaultPrice,
  type PaymentTerms,
  type PriceTiers,
  type SaleKind,
} from "@/lib/pricing";

export type SaleProductOption = PriceTiers & {
  id: string;
  brandId: string | null;
  label: string;
};

type Option = { id: string; name: string };

const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="label">{children}</span>
);

/**
 * Date → (shop) → brand → model → quantity → cash/credit → unit price.
 * Picking a model or changing cash/credit fills in the list price for that
 * tier. Admins can then type a different price; Sales Reps cannot.
 */
export function SaleFields({
  kind,
  today,
  brands,
  products,
  shops,
  canEditPrice,
  initial,
}: {
  kind: SaleKind;
  today: string;
  brands: Option[];
  products: SaleProductOption[];
  shops?: Option[];
  canEditPrice: boolean;
  initial?: {
    date: string;
    shopId: string | null;
    brandId: string | null;
    productId: string;
    quantity: number;
    terms: PaymentTerms;
    price: number;
  };
}) {
  const [brandId, setBrandId] = useState(initial?.brandId ?? "");
  const [productId, setProductId] = useState(initial?.productId ?? "");
  const [terms, setTerms] = useState<PaymentTerms>(initial?.terms ?? "cash");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  // Once someone types a price, picking terms no longer overwrites it.
  const [priceTyped, setPriceTyped] = useState(Boolean(initial));

  const models = products.filter((product) => product.brandId === brandId);
  const product = products.find((option) => option.id === productId);
  const listPrice = product ? defaultPrice(product, kind, terms) : null;
  const tier = kind === "primary" ? "RD" : "Dealer";

  const refill = (
    next: SaleProductOption | undefined,
    nextTerms: PaymentTerms,
  ) => {
    if (priceTyped && canEditPrice) return;
    const value = next ? defaultPrice(next, kind, nextTerms) : null;
    setPrice(value === null ? "" : String(value));
  };

  return (
    <>
      <label className="block">
        <Label>Date</Label>
        <input
          required
          name="date"
          type="date"
          max={today}
          defaultValue={initial?.date ?? today}
          className="input"
        />
      </label>
      {shops && (
        <label className="block">
          <Label>Shop</Label>
          <select
            required
            name="shop_id"
            defaultValue={initial?.shopId ?? ""}
            className="input"
          >
            <option value="" disabled>
              Choose…
            </option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block">
        <Label>Brand</Label>
        <select
          required
          value={brandId}
          onChange={(event) => {
            setBrandId(event.target.value);
            setProductId("");
            refill(undefined, terms);
          }}
          className="input"
        >
          <option value="" disabled>
            Choose…
          </option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <Label>Model and capacity</Label>
        <select
          required
          name="product_id"
          value={productId}
          disabled={!brandId}
          onChange={(event) => {
            setProductId(event.target.value);
            refill(
              products.find((option) => option.id === event.target.value),
              terms,
            );
          }}
          className="input disabled:bg-slate-50"
        >
          <option value="" disabled>
            {brandId ? "Choose…" : "Choose a brand first"}
          </option>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <Label>Quantity</Label>
        <input
          required
          name="quantity"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          defaultValue={initial?.quantity}
          className="input"
        />
      </label>
      <fieldset>
        <Label>Payment</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["cash", "credit"] as const).map((option) => (
            <label
              key={option}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                terms === option
                  ? "border-brand bg-indigo-50 text-brand"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              <input
                type="radio"
                name="payment_terms"
                value={option}
                checked={terms === option}
                onChange={() => {
                  setTerms(option);
                  refill(product, option);
                }}
                className="sr-only"
              />
              {option === "cash" ? "Cash" : "Credit (14 days)"}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <Label>Unit price ({tier})</Label>
        <input
          name="price"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={price}
          readOnly={!canEditPrice}
          onChange={(event) => {
            setPrice(event.target.value);
            setPriceTyped(true);
          }}
          placeholder={
            product && listPrice === null ? `No ${tier} price set` : ""
          }
          className="input read-only:bg-slate-50"
        />
        {canEditPrice &&
          priceTyped &&
          listPrice !== null &&
          Number(price) !== listPrice && (
            <button
              type="button"
              onClick={() => {
                setPrice(String(listPrice));
                setPriceTyped(false);
              }}
              className="mt-1 text-xs font-semibold text-brand"
            >
              Use list price ({listPrice.toLocaleString("en-US")})
            </button>
          )}
      </label>
    </>
  );
}
