import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { validateEnv } from "@/lib/env";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

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
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Madrasah OS",
  },
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
        <Providers>
          {children}
        </Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
