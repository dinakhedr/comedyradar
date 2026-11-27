"use client";

import { Luckiest_Guy, Nunito } from "next/font/google";
import { useEffect } from "react";
import { ErrorScreen } from "@/components/error-screen";
import { reportBrowserError } from "@/lib/report-browser-error";
import "./globals.css";

const luckiestGuy = Luckiest_Guy({
  variable: "--font-luckiest-guy",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const nunito = Nunito({
  variable: "--font-nunito",
  weight: ["400", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

/** Error page when the whole layout fails (spec 7.6 item 2). It replaces the root layout, so it brings its own html and body. */
export default function GlobalError({
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
    <html
      lang="en"
      className={`${luckiestGuy.variable} ${nunito.variable} antialiased`}
    >
      <body className="min-h-screen bg-radar-purple text-white">
        <title>Something went wrong | Comedy Radar</title>
        <ErrorScreen error={error} retry={retry} />
      </body>
    </html>
  );
}
