/**
 * Form field classes. Kept apart from fields.tsx ("use client") so server
 * components can use them as plain strings.
 */

export const inputCls =
  "min-h-12 w-full rounded-button border-2 border-radar-purple/25 bg-white px-4 text-base text-radar-purple placeholder:text-radar-purple/50 focus:border-radar-purple aria-[invalid=true]:border-laugh-pink-deep";
export const labelCls = "text-[15px] font-extrabold text-radar-purple";
export const errorCls = "border-l-4 border-laugh-pink-deep pl-2 text-sm font-bold text-radar-purple";
export const primaryBtn =
  "flex min-h-12 w-full items-center justify-center rounded-button bg-radar-purple px-6 text-base font-extrabold text-spotlight-yellow hover:bg-radar-plum disabled:opacity-70";
