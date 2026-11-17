import type { Shop } from "@/lib/queries";
import { Field } from "./ui";

export function ShopFields({ shop }: { shop?: Shop }) {
  return (
    <>
      <Field label="Name">
        <input
          required
          name="name"
          defaultValue={shop?.name}
          placeholder="e.g. A Mobile"
          className="input"
        />
      </Field>
      <Field label="City">
        <input name="city" defaultValue={shop?.city} className="input" />
      </Field>
      <Field label="Contact person">
        <input name="contact" defaultValue={shop?.contact} className="input" />
      </Field>
      <Field label="Phone">
        <input
          name="phone"
          type="tel"
          defaultValue={shop?.phone}
          className="input"
        />
      </Field>
      <Field label="Credit period (days)">
        <input
          name="credit_days"
          type="number"
          min="0"
          max="365"
          step="1"
          inputMode="numeric"
          defaultValue={shop?.credit_days ?? 14}
          className="input"
        />
      </Field>
    </>
  );
}
