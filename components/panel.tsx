"use client";

import { useRef, useState } from "react";
import { Plus, SlidersHorizontal, X } from "lucide-react";

/**
 * A button that opens a form in a panel: slides in from the right on a
 * computer, fills the screen on a phone. The panel stays open after a save so
 * several entries can be made in a row; the X or Esc closes it.
 */
export function FormPanel({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="btn-primary"
      >
        <Plus size={16} />
        {label}
      </button>
      <dialog
        ref={dialog}
        aria-label={title}
        onClick={(event) => {
          // A click on the backdrop (outside the panel) closes it.
          if (event.target === dialog.current) dialog.current?.close();
        }}
        className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-full bg-white p-0 shadow-2xl sm:max-w-md"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold">{title}</h2>
              {description && (
                <p className="mt-0.5 text-sm text-slate-500">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close"
              className="-mr-2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        </div>
      </dialog>
    </>
  );
}

/** Filters that fold away behind a button on phones and always show on a computer. */
export function FilterToggle({
  active,
  children,
}: {
  active: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="btn-secondary lg:hidden"
      >
        <SlidersHorizontal size={16} />
        Filters
        {active > 0 && (
          <span className="rounded-full bg-brand px-1.5 text-xs text-white">
            {active}
          </span>
        )}
      </button>
      <div className={`${open ? "mt-3" : "hidden"} lg:mt-0 lg:block`}>
        {children}
      </div>
    </div>
  );
}
