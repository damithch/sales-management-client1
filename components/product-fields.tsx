import type { Brand, Product } from "@/lib/queries";
import { Field } from "./ui";

function PriceInput({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: number | null | undefined;
}) {
  return (
    <Field label={label}>
      <input
        name={name}
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        defaultValue={value ?? ""}
        className="input"
      />
    </Field>
  );
}

/** Brand → model → capacity, then the prices and opening stock. */
export function ProductFields({
  product,
  brands,
}: {
  product?: Product;
  brands: Brand[];
}) {
  return (
    <>
      <Field label="Brand">
        <select
          required
          name="brand_id"
          defaultValue={product?.brand_id ?? ""}
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
      </Field>
      <Field label="Model">
        <input
          required
          name="model"
          defaultValue={product?.model}
          placeholder="e.g. A5"
          className="input"
        />
      </Field>
      <Field label="Capacity">
        <input
          name="capacity"
          defaultValue={product?.capacity}
          placeholder="e.g. 3+8GB/64GB (blank if none)"
          className="input"
        />
      </Field>

      <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3">
        <legend className="px-1 text-xs font-semibold text-slate-500">
          RD price (what the distributor pays)
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <PriceInput name="rd_cash" label="Cash" value={product?.rd_cash} />
          <PriceInput
            name="rd_credit"
            label="14-day credit"
            value={product?.rd_credit}
          />
        </div>
      </fieldset>
      <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3">
        <legend className="px-1 text-xs font-semibold text-slate-500">
          Dealer price (what shops pay)
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <PriceInput
            name="dealer_cash"
            label="Cash"
            value={product?.dealer_cash}
          />
          <PriceInput
            name="dealer_credit"
            label="14-day credit"
            value={product?.dealer_credit}
          />
        </div>
      </fieldset>
      <p className="text-xs text-slate-400">
        Leave a credit price blank if it is the same as cash.
      </p>
      <PriceInput name="mrp" label="MRP (retail price)" value={product?.mrp} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Opening stock">
          <input
            name="opening_qty"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            defaultValue={product?.opening_qty || ""}
            placeholder="0"
            className="input"
          />
        </Field>
        <Field label="Opening stock date">
          <input
            name="opening_date"
            type="date"
            defaultValue={product?.opening_date ?? ""}
            className="input"
          />
        </Field>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-slate-500">
          More (code, unit)
        </summary>
        <div className="mt-3 space-y-4">
          <Field label="Product code (SKU)">
            <input
              name="sku"
              defaultValue={product?.sku}
              placeholder="Blank = made from brand, model and capacity"
              className="input"
            />
          </Field>
          <Field label="Unit">
            <input
              name="unit"
              defaultValue={product?.unit || "Piece"}
              className="input"
            />
          </Field>
        </div>
      </details>
    </>
  );
}

export function ActiveCheckbox({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name="active" defaultChecked={active} />
      {label}
    </label>
  );
}
