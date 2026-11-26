"use client";

import type { ReactNode } from "react";
import { useLinkStatus } from "next/link";
import { Spinner } from "@/components/submit-button";

/**
 * Put inside a <Link> (e.g. around an Edit icon): while the next page is loading,
 * a spinner takes the icon's place so the click visibly does something.
 */
export function LinkPending({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner /> : <>{children}</>;
}
