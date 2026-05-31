import type { Metadata } from "next";
import { Playfair_Display, Inter, Amiri } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "600"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500"],
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic", "latin"],
  variable: "--font-amiri",
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Institut Fitra",
  description:
    "L'Institut FITRA est un institut d'apprentissage en ligne spécialisé dans l'enseignement des sciences islamiques, pensé pour rendre le savoir accessible à chacun.",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'android-chrome-192x192', url: '/android-chrome-192x192.png' },
      { rel: 'android-chrome-512x512', url: '/android-chrome-512x512.png' },
    ],
  },
  openGraph: {
    title: "Institut Fitra",
    description:
      "L'Institut FITRA est un institut d'apprentissage en ligne spécialisé dans l'enseignement des sciences islamiques, pensé pour rendre le savoir accessible à chacun.",
    url: "https://institut-fitra.com",
    siteName: "Institut Fitra",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "Institut Fitra",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Institut Fitra",
    description:
      "L'Institut FITRA est un institut d'apprentissage en ligne spécialisé dans l'enseignement des sciences islamiques, pensé pour rendre le savoir accessible à chacun.",
    images: ["/android-chrome-512x512.png"],
  },
  verification: {
    google: "JqWBm6av1tgEBtPL63_u2aR6-XwbvL-wYUJew8eSim4",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${playfair.variable} ${inter.variable} ${amiri.variable} font-inter antialiased bg-background text-secondary`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
