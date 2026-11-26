import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin panel", template: "%s | Comedy Radar admin" },
  robots: { index: false, follow: false },
};

export default function AdminRoot({ children }: LayoutProps<"/admin">) {
  return children;
}
