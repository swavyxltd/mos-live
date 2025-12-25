import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { validateEnv } from "@/lib/env";
import { PWASetup } from "@/components/pwa-setup";

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Madrasah OS",
  description: "Complete management system for Islamic schools and madrasahs",
  metadataBase: new URL(process.env.NEXTAUTH_URL || process.env.APP_BASE_URL || 'https://app.madrasah.io'),
  openGraph: {
    title: "Madrasah OS",
    description: "Complete management system for Islamic schools and madrasahs",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Madrasah OS",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Validate environment on startup
  if (process.env.NODE_ENV === 'development') {
    validateEnv();
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <PWASetup />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
