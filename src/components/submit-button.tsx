"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

/** The small turning circle shown on a button while it works. Takes the button's text colour. */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

/**
 * A form's Save / Delete / Approve… button that shows it is working:
 * while the form is sending, the button is greyed out and a spinner takes the
 * place of its icon (or sits before its words). Every other button in the same
 * form is greyed out too, so nothing is pressed twice.
 * Use it inside a <form action={…}> in place of a plain <button>.
 */
export function SubmitButton({ children, className = "", disabled, name, value, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending, data } = useFormStatus();
  // With several buttons in one form, only the pressed one spins.
  const pressed = pending && (!name || value === undefined || data?.get(name) === String(value));
  return (
    <button
      type="submit"
      {...rest}
      name={name}
      value={value}
      disabled={disabled || pending}
      aria-busy={pressed || undefined}
      className={`${className} ${pending ? "cursor-wait opacity-70" : ""} ${pressed ? "gap-2 [&_svg]:hidden" : ""}`}
    >
      {pressed && <Spinner />}
      {children}
    </button>
  );
}
