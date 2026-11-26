import type { Metadata } from "next";
import SignUpPage from "../signup/page";

export const metadata: Metadata = {
  title: "For comedians: list your shows free",
  description: "Comedians, groups and managers: get your own page and list your shows and tours on Comedy Radar for free.",
  alternates: { canonical: "/for-comedians" },
};

/** For comedians (spec 11.4 item 1): the same split screen as Sign up. */
export default SignUpPage;
