import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CmsToastRoot } from "./CmsToastRoot";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRSIC CMS",
  description: "Internal content management for CRSIC Laghouat",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-crs-bg font-sans text-crs-ink antialiased">
        <CmsToastRoot />
        {children}
      </body>
    </html>
  );
}
