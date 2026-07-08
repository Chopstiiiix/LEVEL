import type { Metadata } from "next";
import { Chivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

const chivo = Chivo({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-chivo",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "LEVEL — Oil & Gas Delivery Intelligence · West Africa",
  description:
    "Real-time delivery, tank farm, vessel and pricing intelligence across Nigeria & West Africa.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080b0f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${chivo.variable} ${plexMono.variable} h-full`}>
      <body className="min-h-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
