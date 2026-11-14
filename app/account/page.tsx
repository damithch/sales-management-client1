import { changeOwnPassword } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { Shell } from "@/components/shell";
import { Field } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";

export default async function Account() {
  const session = await requireRole("Sales Rep");
  return (
    <Shell session={session} title="My account">
      <div className="max-w-md">
        <ActionForm action={changeOwnPassword} submit="Change password">
          <p className="text-sm text-slate-500">
            {session.name} · {session.email} · {session.role}
          </p>
          <Field label="Current password">
            <input
              required
              name="current"
              type="password"
              autoComplete="current-password"
              className="input"
            />
          </Field>
          <Field label="New password">
            <input
              required
              name="password"
              type="password"
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              className="input"
            />
          </Field>
        </ActionForm>
      </div>
    </Shell>
  );
}
