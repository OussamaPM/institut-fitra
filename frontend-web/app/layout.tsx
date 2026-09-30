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
  manifest: "/site.webmanifest",
  // Google n'affiche un favicon dans ses résultats que si le site en déclare un
  // carré d'au moins 48 px, et dont le côté est un multiple de 48. Les icônes de
  // 16 et 32 px sont ignorées, d'où le globe générique affiché jusqu'ici.
  //
  // Les URL sont laissées telles quelles : changer l'adresse d'un favicon oblige
  // Google à tout réapprendre. Seuls le contenu du .ico (qui embarque désormais
  // une frame 48×48) et les balises changent.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    // Les anciennes entrées `other` déclaraient rel="android-chrome-192x192",
    // qui n'est pas une valeur de rel valide : ni les navigateurs ni Google n'y
    // voyaient une icône. Android lit le manifeste, c'est suffisant.
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
