import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function getComingSoonStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/settings/coming-soon`, {
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.coming_soon_enabled === true;
  } catch (error) {
    console.error('Error fetching coming soon status:', error);
    return false;
  }
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isComingSoon = await getComingSoonStatus();

  // Mode Coming Soon : affichage plein écran sans header/footer
  if (isComingSoon) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-grow">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
