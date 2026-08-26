import type { Metadata } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Lazy Crazy — Batch Stickers",
  description: "Kitchen prep-batch labeling and traceability",
};

const inter = Inter({
  variable: "--font-sans",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-heading",
  display: "swap",
  subsets: ["latin"],
  weight: ["600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${barlowCondensed.variable} ${ibmPlexMono.variable}`}
    >
      <body className="antialiased">
        {/* Fixed dark theme — see CLAUDE.md's "Visual direction": this is a
            kitchen-ticket-inspired dark palette, not adapted to OS
            light/dark preference. `enableSystem={false}` keeps the `.dark`
            class always applied, so `dark:` variants in shadcn components
            (e.g. Select) render consistently regardless of OS settings. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
