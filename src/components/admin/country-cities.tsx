import { addCity } from "@/app/actions/admin-settings";
import { CityChip } from "@/components/admin/city-chip";
import { inputCls } from "@/components/auth/field-classes";
import { PlusIcon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { flagOf } from "@/lib/countries";
import type { AdminSettings } from "@/lib/data/admin";

type Country = AdminSettings["countries"][number];

const purpleBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-button bg-radar-purple px-4 text-[15px] font-extrabold text-spotlight-yellow hover:bg-radar-plum disabled:bg-radar-plum disabled:opacity-90";

/** Settings > Countries and cities: each country opens to show its cities (each with a pencil to rename it) and a form to add one. Venues live on /admin/venues. */
export function CountryCities({ countries, open }: { countries: Country[]; open: string }) {
  return (
    <ul className="flex flex-col gap-2 text-radar-purple">
      {countries.map((c) => (
        <li key={c.id}>
          <details
            open={open ? open === c.code : c.is_market}
            className="group overflow-hidden rounded-button border-2 border-radar-purple/15 open:border-radar-purple/40"
          >
            <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 [&::-webkit-details-marker]:hidden">
              <span
                aria-hidden="true"
                className="inline-block text-xl leading-none font-extrabold transition-transform group-open:rotate-90"
              >
                ›
              </span>
              <span className="text-lg font-extrabold">
                {flagOf(c.code)} {c.name}
              </span>
              {c.is_market && (
                <span className="rounded-md bg-spotlight-yellow px-2 py-0.5 text-[11px] font-extrabold tracking-wider uppercase">
                  Market
                </span>
              )}
              <span className="text-xs text-radar-purple/70">
                {c.cities.length === 1 ? "1 city" : `${c.cities.length} cities`}
                {c.region ? ` · ${c.region}` : ""}
              </span>
            </summary>
            <div className="flex flex-col gap-3 border-t border-radar-purple/15 p-3">
              {c.cities.length === 0 ? (
                <p className="text-sm text-radar-purple/70">No cities yet. Add the first one below.</p>
              ) : (
                <ul className="flex flex-wrap gap-2" aria-label={`Cities in ${c.name}`}>
                  {c.cities.map((x) => (
                    <CityChip key={x.id} id={x.id} name={x.name} countryCode={c.code} />
                  ))}
                </ul>
              )}
              <form action={addCity} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input type="hidden" name="country_id" value={c.id} />
                <input type="hidden" name="open" value={c.code} />
                <label htmlFor={`nc-${c.id}`} className="sr-only">
                  New city in {c.name}
                </label>
                <input
                  id={`nc-${c.id}`}
                  name="name"
                  required
                  minLength={2}
                  maxLength={60}
                  placeholder={`New city in ${c.name}`}
                  className={`${inputCls} min-h-11! flex-1`}
                />
                <SubmitButton className={purpleBtn}>
                  <PlusIcon /> Add city
                </SubmitButton>
              </form>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
