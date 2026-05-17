import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Éditeur de Documents - Institut Fitra',
  description: 'Éditeur de documents PDF pour créer des livrets islamiques professionnels',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="font-inter antialiased">
        {children}
      </body>
    </html>
  );
}
