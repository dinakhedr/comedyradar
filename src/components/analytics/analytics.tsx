import { GoogleAnalytics } from "@next/third-parties/google";
import { analyticsEnabled, GA_ID } from "@/lib/analytics-events";
import { CookieBanner } from "./cookie-banner";

/** Google Analytics 4 and the cookie banner. Nothing when NEXT_PUBLIC_GA_ID is not set. */
export function Analytics() {
  if (!analyticsEnabled) return null;
  return (
    <>
      <GoogleAnalytics gaId={GA_ID} />
      <CookieBanner />
    </>
  );
}
