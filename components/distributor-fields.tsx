import type { Distributor } from "@/lib/queries";
import { Field } from "./ui";

export function DistributorFields({
  distributor,
}: {
  distributor?: Distributor;
}) {
  return (
    <>
      <Field label="Name">
        <input
          required
          name="name"
          defaultValue={distributor?.name}
          className="input"
        />
      </Field>
      <Field label="City">
        <input name="city" defaultValue={distributor?.city} className="input" />
      </Field>
      <Field label="Contact person">
        <input
          name="contact"
          defaultValue={distributor?.contact}
          className="input"
        />
      </Field>
      <Field label="Phone">
        <input
          name="phone"
          type="tel"
          defaultValue={distributor?.phone}
          className="input"
        />
      </Field>
    </>
  );
}
