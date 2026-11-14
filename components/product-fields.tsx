import type { Product } from "@/lib/queries";
import { Field } from "./ui";

export function ProductFields({ product }: { product?: Product }) {
  return (
    <>
      <Field label="Name">
        <input
          required
          name="name"
          defaultValue={product?.name}
          className="input"
        />
      </Field>
      <Field label="SKU">
        <input
          required
          name="sku"
          defaultValue={product?.sku}
          className="input"
        />
      </Field>
      <Field label="Category">
        <input
          name="category"
          defaultValue={product?.category}
          className="input"
        />
      </Field>
      <Field label="Unit (case, box…)">
        <input name="unit" defaultValue={product?.unit} className="input" />
      </Field>
      <Field label="List price">
        <input
          required
          name="price"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          defaultValue={product?.price}
          className="input"
        />
      </Field>
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
