"use client";

import { useId, useState } from "react";
import { PASSWORD_RULES, passwordStrength, STRENGTH_LABELS } from "@/lib/auth-forms";

export const inputCls =
  "min-h-12 w-full rounded-button border-2 border-radar-purple/25 bg-white px-4 text-base text-radar-purple placeholder:text-radar-purple/50 focus:border-radar-purple aria-[invalid=true]:border-laugh-pink-deep";
export const labelCls = "text-[15px] font-extrabold text-radar-purple";
export const errorCls = "border-l-4 border-laugh-pink-deep pl-2 text-sm font-bold text-radar-purple";
export const primaryBtn =
  "flex min-h-12 w-full items-center justify-center rounded-button bg-radar-purple px-6 text-base font-extrabold text-spotlight-yellow hover:bg-radar-plum disabled:opacity-70";

export function Field({
  label,
  name,
  type = "text",
  error,
  autoComplete,
  defaultValue,
  required = true,
  maxLength,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string;
  autoComplete?: string;
  defaultValue?: string;
  required?: boolean;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={inputCls}
      />
      {error && (
        <p id={`${id}-err`} className={errorCls}>
          {error}
        </p>
      )}
    </div>
  );
}

/** Password with show/hide; with `meter`, a strength bar and the rules, updated while typing. */
export function PasswordField({
  label,
  name,
  error,
  autoComplete,
  meter = false,
}: {
  label: string;
  name: string;
  error?: string;
  autoComplete: string;
  meter?: boolean;
}) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const [value, setValue] = useState("");
  const strength = passwordStrength(value);
  const describedBy = [meter ? `${id}-rules` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={shown ? "text" : "password"}
          required
          autoComplete={autoComplete}
          maxLength={72}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${inputCls} pr-20`}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          aria-controls={id}
          className="absolute inset-y-1 right-1 rounded-[9px] px-3 text-sm font-extrabold text-radar-purple hover:bg-lavender"
        >
          {shown ? "Hide" : "Show"}
        </button>
      </div>
      {meter && (
        <div id={`${id}-rules`} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-1" aria-hidden="true">
              {[1, 2, 3, 4].map((n) => (
                <span
                  key={n}
                  className={`h-1.5 flex-1 rounded-full ${
                    strength >= n ? (strength <= 1 ? "bg-laugh-pink-deep" : strength === 2 ? "bg-spotlight-yellow" : "bg-radar-purple") : "bg-radar-purple/15"
                  }`}
                />
              ))}
            </div>
            <span className="w-14 text-right text-sm font-bold text-radar-purple" aria-live="polite">
              {STRENGTH_LABELS[strength]}
            </span>
          </div>
          <ul className="flex flex-col gap-0.5 text-sm text-radar-purple/80">
            {PASSWORD_RULES.map((r) => {
              const ok = r.test(value);
              return (
                <li key={r.id} className={ok ? "font-bold text-radar-purple" : ""}>
                  <span aria-hidden="true">{ok ? "✓ " : "○ "}</span>
                  {r.label}
                  <span className="sr-only">{ok ? " (done)" : " (not yet)"}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {error && (
        <p id={`${id}-err`} className={errorCls}>
          {error}
        </p>
      )}
    </div>
  );
}

export function FormMessage({ message, tone = "error" }: { message?: string; tone?: "error" | "ok" }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-button px-3.5 py-2.5 text-[15px] font-bold text-radar-purple empty:hidden ${
        tone === "error" ? "border-2 border-laugh-pink-deep bg-laugh-pink/10" : "bg-lavender"
      }`}
    >
      {message ?? ""}
    </p>
  );
}
