import { notFound } from "next/navigation";
import { updateUser } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { ActiveCheckbox } from "@/components/product-fields";
import { Shell } from "@/components/shell";
import { Field } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { parseId } from "@/lib/format";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { getUser } from "@/lib/queries";
import { rolesBelow } from "@/lib/roles";

export default async function EditUser({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("Admin");
  const manageable = rolesBelow(session.role);
  const id = parseId((await params).id);
  const user = id && (await getUser(id));
  if (!user || !manageable.includes(user.role)) notFound();
  return (
    <Shell session={session} title="Edit user">
      <div className="max-w-md">
        <ActionForm
          action={updateUser.bind(null, user.id)}
          submit="Save changes"
        >
          <p className="text-sm text-slate-500">{user.email}</p>
          <Field label="Name">
            <input
              required
              name="name"
              defaultValue={user.name}
              className="input"
            />
          </Field>
          <Field label="Role">
            <select name="role" defaultValue={user.role} className="input">
              {manageable.map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
          </Field>
          <Field label="New password (blank = keep current)">
            <input
              name="password"
              type="password"
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              className="input"
            />
          </Field>
          <ActiveCheckbox active={user.active} label="Active (can sign in)" />
        </ActionForm>
      </div>
    </Shell>
  );
}
