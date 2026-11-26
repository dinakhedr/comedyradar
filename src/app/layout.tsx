import type { Metadata, Viewport } from "next";
import { Luckiest_Guy, Nunito } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Stand-up comedy in Cairo this month | Comedy Radar",
    template: "%s | Comedy Radar",
  },
  description:
    "If it's live and it's funny, it's on the radar. Every stand-up show in Egypt, Egyptian comedians on tour and visiting comedians, in one place.",
  manifest: "/site.webmanifest",
  openGraph: {
    siteName: "Comedy Radar",
    type: "website",
    locale: "en",
  },
};

export const viewport: Viewport = {
  themeColor: "#2B0B4F",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${luckiestGuy.variable} ${nunito.variable} antialiased`}>
      <body className="min-h-screen bg-radar-purple text-white">{children}</body>
    </html>
  );
}
