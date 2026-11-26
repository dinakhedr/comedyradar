"use client";

import { useFormStatus } from "react-dom";
import { ChevronDown } from "@/components/icons";

type Option = { value: string; label: string };

function Select({ id, name, status, options }: { id: string; name: string; status: string; options: readonly Option[] }) {
  const { pending } = useFormStatus();
  return (
    <span className="relative inline-flex items-center">
      <label htmlFor={id} className="sr-only">
        Status of {name}
      </label>
      <select
        id={id}
        name="status"
        defaultValue={status}
        disabled={pending}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="min-h-11 appearance-none rounded-button border-2 border-radar-purple/25 bg-white py-0 pr-9 pl-3 text-sm font-bold text-radar-purple disabled:opacity-60"
      >
        {options.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {pending ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 h-4 w-4 animate-spin rounded-full border-2 border-radar-purple/30 border-t-radar-purple"
        />
      ) : (
        <ChevronDown className="pointer-events-none absolute right-3" />
      )}
      <span role="status" className="sr-only">
        {pending ? "Saving…" : ""}
      </span>
    </span>
  );
}

/** A status menu that saves as soon as a new status is picked (no Save button). */
export function StatusSelect({
  action,
  hidden,
  id,
  name,
  status,
  options,
}: {
  action: (form: FormData) => Promise<void>;
  hidden: Record<string, string>;
  id: string;
  name: string;
  status: string;
  options: readonly Option[];
}) {
  return (
    <form action={action} className="flex items-center justify-end">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Select id={id} name={name} status={status} options={options} />
    </form>
  );
}
