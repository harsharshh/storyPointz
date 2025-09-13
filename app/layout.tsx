// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./components/theme-provider";
import Analytics from "./components/analytics";

export const metadata: Metadata = {
  metadataBase: new URL("https://story-pointz.vercel.app/"), // change to your domain later
  title: {
    default: "StoryPointz",
    template: "%s | StoryPointz",
  },
  description:
    "Agile planning poker that makes estimation fast, fun, and aligned. Plan sprints with StoryPointz.",
  keywords: [
    "planning poker",
    "agile estimation",
    "scrum",
    "story points",
    "sprint planning",
    "StoryPointz",
  ],
  openGraph: {
    title: "StoryPointz",
    description:
      "Agile planning poker that makes estimation fast, fun, and aligned.",
    url: "https://story-pointz.vercel.app/",
    siteName: "StoryPointz",
    images: [
      { url: "/og.png", width: 1200, height: 630, alt: "StoryPointz" },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StoryPointz",
    description:
      "Agile planning poker that makes estimation fast, fun, and aligned.",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" }
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          {/* Background accents (switch with theme) */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            {/* Light mode gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-300 via-emerald-100 to-white dark:hidden" />
            {/* Dark mode gradient background */}
            <div className="absolute inset-0 hidden dark:block bg-[radial-gradient(60%_40%_at_50%_0%,rgba(109,93,246,0.35),transparent_70%),radial-gradient(40%_40%_at_100%_60%,rgba(34,197,94,0.25),transparent_70%),linear-gradient(to_bottom,#0B0B10,rgba(11,11,16,0.85))]" />
          </div>
          {children}
          <Analytics />
        </ThemeProvider>
        </body>
    </html>
  );
}
