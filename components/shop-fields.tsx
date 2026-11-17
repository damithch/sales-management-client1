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
    </>
  );
}
