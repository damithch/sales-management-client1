import { redirect } from "next/navigation";
import { login } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { Field } from "@/components/ui";
import { getSession } from "@/lib/auth";

export default async function Login() {
  if (await getSession()) redirect("/");
  return (
    <main className="grid min-h-screen place-items-center p-5">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-bold">Sales dashboard</h1>
        <ActionForm
          action={login}
          submit="Sign in"
          className="card space-y-4 p-6"
        >
          <Field label="Email">
            <input
              required
              name="email"
              type="email"
              autoComplete="username"
              className="input"
            />
          </Field>
          <Field label="Password">
            <input
              required
              name="password"
              type="password"
              autoComplete="current-password"
              className="input"
            />
          </Field>
        </ActionForm>
      </div>
    </main>
  );
}
