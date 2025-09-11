// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./component/theme-provider";

export const metadata: Metadata = {
  metadataBase: new URL("https://storypointz.app"), // change to your domain later
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
    url: "https://storypointz.app",
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
          {children}
        </ThemeProvider>
        </body>
    </html>
  );
}