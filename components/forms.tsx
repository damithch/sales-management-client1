"use client";

import { startTransition, useActionState } from "react";
import type { FormState } from "@/app/actions";

type Action = (state: FormState, form: FormData) => Promise<FormState>;
type Counted = FormState & { saves: number };

/**
 * A form bound to a server action that shows the action's error or success
 * message. On an error everything the user entered stays as it was; after a
 * successful save the fields start again from their defaults.
 */
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
  const [state, formAction, pending] = useActionState<Counted, FormData>(
    async (previous, form) => {
      const result = await action(previous, form);
      return { ...result, saves: previous.saves + (result.ok ? 1 : 0) };
    },
    { saves: 0 },
  );
  return (
    <form
      // Submitting through onSubmit (not the action prop) stops React from
      // clearing the form after every submission, including failed ones.
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(() => formAction(form));
      }}
      className={className}
    >
      <div key={state.saves} className="space-y-4">
        {children}
      </div>
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
      <button className="btn px-2.5 py-1 text-rose-700 hover:bg-rose-50">
        {children}
      </button>
    </form>
  );
}
