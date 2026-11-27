"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/error-screen";
import { reportBrowserError } from "@/lib/report-browser-error";

/** Error page for any page of the site (spec 7.6 item 2). */
export default function Error({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
    reportBrowserError(error);
  }, [error]);
  return (
    <>
      <title>Something went wrong | Comedy Radar</title>
      <ErrorScreen error={error} retry={retry} />
    </>
  );
}
