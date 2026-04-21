import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import { MainNav } from "@/components/layout/main-nav";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Digital Heroes",
  description: "Subscription, golf scores, monthly draws, and charitable impact.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AppProviders>
          <div className="relative min-h-screen bg-canvas text-ink">
            <MainNav />
            <main>{children}</main>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
