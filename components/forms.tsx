"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

/** A form bound to a server action that shows the action's error or success message. */
export function ActionForm({
  action,
  submit,
  className = "card space-y-4 p-5",
  children,
}: {
  action: Action;
  submit: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      {state.error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {state.error}
        </p>
      )}
      {state.ok && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          {state.ok}
        </p>
      )}
      <button
        disabled={pending}
        className="btn-primary w-full disabled:opacity-60"
      >
        {pending ? "Saving…" : submit}
      </button>
    </form>
  );
}

/** A delete button that asks before running its server action. */
export function ConfirmButton({
  action,
  message,
  children,
}: {
  action: () => Promise<void>;
  message: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <button className="btn bg-rose-50 text-rose-700 hover:bg-rose-100">
        {children}
      </button>
    </form>
  );
}
