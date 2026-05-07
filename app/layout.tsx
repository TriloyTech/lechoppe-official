import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import { LangProvider } from "@/context/LangContext";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://lechoppe.vercel.app"),
  title: "L'Échoppe de Paris — Bistronomy",
  description: "Artisan buns, 12-hour bacon, 100% French beef. Experience bistronomy at its finest in the heart of Paris.",
  keywords: ["restaurant", "bistronomy", "Paris", "burger", "artisanal"],
  icons: {
    icon: [
      { url: "/favicon.ico",    sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "icon", url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  openGraph: {
    title: "L'Échoppe de Paris",
    description: "Artisan buns. 12-Hour Bacon. 100% French Beef.",
    url: "https://lechoppe.vercel.app",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/images/logo-transparent.png", width: 1024, height: 1024, alt: "L'Échoppe de Paris" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "L'Échoppe de Paris — Bistronomy",
    description: "Artisan buns, 12-hour bacon, 100% French beef. Experience bistronomy in the heart of Paris.",
    images: ["/images/logo-transparent.png"],
  },
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#050505",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#050505" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Restaurant",
            "name": "L'Échoppe de Paris",
            "description": "Artisan buns, 12-hour bacon, 100% French beef. Bistronomy at its finest.",
            "url": "https://lechoppe.vercel.app",
            "telephone": "+33153279539",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "16 Rue Léon Frot",
              "addressLocality": "Paris",
              "postalCode": "75011",
              "addressCountry": "FR"
            },
            "geo": { "@type": "GeoCoordinates", "latitude": 48.8527, "longitude": 2.3804 },
            "openingHoursSpecification": [
              { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday"], "opens": "12:00", "closes": "22:30" },
              { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Friday","Saturday"], "opens": "12:00", "closes": "23:00" }
            ],
            "servesCuisine": "French",
            "priceRange": "€€",
            "image": "https://lechoppe.vercel.app/images/logo-transparent.png",
            "sameAs": ["https://deliveroo.fr/fr/menu/paris/saint-ambroise/l-echoppe-de-paris"]
          }) }}
        />
      </head>
      <body style={{ "--font-bebas": "'Bebas Neue'", "--font-inter": "'Inter'" } as React.CSSProperties}>
        <ThemeProvider>
          <LangProvider>
            <SmoothScrollProvider>
              {children}
            </SmoothScrollProvider>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
