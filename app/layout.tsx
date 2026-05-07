import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { THEME_STORAGE_KEY } from "@/lib/theme/constants";
import { AppToaster } from "@/components/ui/app-toaster";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Upwork Bid Tracker",
  description: "Agency's Upwork bid tracker",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${nunito.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className={`${nunito.className} min-h-full flex flex-col`}
      >
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){var k=${JSON.stringify(THEME_STORAGE_KEY)};try{var p=localStorage.getItem(k)||"system";function s(){return window.matchMedia("(prefers-color-scheme: dark)").matches}var x=p==="dark"||p==="light"?p:(s()?"dark":"light");var r=document.documentElement;x==="dark"?r.classList.add("dark"):r.classList.remove("dark");r.style.colorScheme=x;}catch(e){}})();`,
          }}
        />
        <ThemeProvider>
          {children}
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
