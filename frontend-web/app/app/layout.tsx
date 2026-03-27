import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Administration - Institut Fitra",
  description: "Interface d'administration de l'Institut Fitra",
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script id="app-favicon" strategy="beforeInteractive">
        {`
          // Force le favicon
          const setFavicon = () => {
            const links = document.querySelectorAll("link[rel*='icon']");
            links.forEach(link => link.remove());

            const link = document.createElement('link');
            link.rel = 'icon';
            link.type = 'image/png';
            link.href = '/favicon.png?v=' + Date.now();
            document.head.appendChild(link);
          };

          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setFavicon);
          } else {
            setFavicon();
          }
        `}
      </Script>
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </>
  );
}
