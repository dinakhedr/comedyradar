"use client";

import { useId, useState } from "react";
import { PASSWORD_RULES, passwordStrength, STRENGTH_LABELS } from "@/lib/auth-forms";

export { errorCls, inputCls, labelCls, primaryBtn } from "./field-classes";
import { errorCls, inputCls, labelCls } from "./field-classes";
import { ErrorNote, SuccessNote } from "@/components/status-note";

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

/** A form's result: green text with a tick, or red text with "!" (no box). */
export function FormMessage({ message, tone = "error" }: { message?: string; tone?: "error" | "ok" }) {
  if (!message) return null;
  return tone === "ok" ? (
    <SuccessNote className="text-[15px]">{message}</SuccessNote>
  ) : (
    <ErrorNote className="text-[15px]">{message}</ErrorNote>
  );
}
