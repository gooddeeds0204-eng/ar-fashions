import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const productionUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://ar-fashions.vercel.app");

export const metadata: Metadata = {
  metadataBase: new URL(productionUrl),
  title: {
    default: "AS Fashions | Fashion Retail & Wholesale",
    template: "%s | AS Fashions",
  },
  description:
    "Shop curated fashion from AS Fashions for retail customers and approved resellers.",
  applicationName: "AS Fashions",
  category: "shopping",
  keywords: [
    "AS Fashions",
    "fashion",
    "clothing",
    "women fashion",
    "men fashion",
    "kids fashion",
    "retail fashion",
    "wholesale fashion",
    "reseller clothing",
  ],
  openGraph: {
    type: "website",
    siteName: "AS Fashions",
    title: "AS Fashions | Fashion Retail & Wholesale",
    description:
      "Curated fashion for retail shoppers and approved resellers.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "AS Fashions",
    description:
      "Curated fashion for retail shoppers and approved resellers.",
  },
  robots: {
    index: true,
    follow: true,
  },
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
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
