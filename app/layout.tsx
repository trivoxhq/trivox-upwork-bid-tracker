import type { Metadata } from "next";
import { Nunito } from "next/font/google";
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
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
