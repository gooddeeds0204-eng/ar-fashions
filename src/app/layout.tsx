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
  "https://www.asfashionsonline.com";

export const metadata: Metadata = {
  metadataBase: new URL(productionUrl),
  title: {
    default:
      "AS Fashions Online | Retail & Wholesale Fashion",
    template: "%s | AS Fashions Online",
  },
  description:
    "Shop AS Fashions Online for curated women, men and kids fashion, retail shopping and reseller wholesale collections.",
  applicationName: "AS Fashions",
  creator: "AS Fashions",
  publisher: "AS Fashions",
  category: "shopping",
  keywords: [
    "AS Fashions",
    "AS Fashions Online",
    "as fashions online",
    "asfashionsonline",
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
    title:
      "AS Fashions Online | Retail & Wholesale Fashion",
    description:
      "Shop curated women, men and kids fashion from AS Fashions Online for retail and reseller customers.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "AS Fashions Online",
    description:
      "Retail and wholesale fashion from AS Fashions Online.",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${productionUrl}/#organization`,
                  name: "AS Fashions",
                  alternateName: "AS Fashions Online",
                  url: productionUrl,
                },
                {
                  "@type": "WebSite",
                  "@id": `${productionUrl}/#website`,
                  url: productionUrl,
                  name: "AS Fashions",
                  alternateName: "AS Fashions Online",
                  publisher: {
                    "@id": `${productionUrl}/#organization`,
                  },
                  inLanguage: "en-IN",
                },
              ],
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
