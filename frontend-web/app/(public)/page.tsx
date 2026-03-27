import HeroSection from '@/components/public/HeroSection';
import StudyPathSection from '@/components/public/StudyPathSection';
import PillarsSection from '@/components/public/PillarsSection';
import ProgramsSection from '@/components/public/ProgramsSection';
import MethodologySection from '@/components/public/MethodologySection';
import ProgramYearSection from '@/components/public/ProgramYearSection';
import FAQSection from '@/components/public/FAQSection';
import CTASection from '@/components/public/CTASection';
import ComingSoon from '@/components/public/ComingSoon';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function getComingSoonStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/settings/coming-soon`, {
      cache: 'no-store', // Toujours récupérer la valeur fraîche
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.coming_soon_enabled === true;
  } catch (error) {
    console.error('Error fetching coming soon status:', error);
    return false;
  }
}

export default async function HomePage() {
  const isComingSoon = await getComingSoonStatus();

  // Afficher la page "Coming Soon" si le mode est activé
  if (isComingSoon) {
    return <ComingSoon />;
  }

  return (
    <>
      {/* Hero Section - Présentation principale */}
      <HeroSection />

      {/* Parcours d'Études */}
      <StudyPathSection />

      {/* Les 5 Piliers du Cursus */}
      <PillarsSection />

      {/* Nos Programmes Phares */}
      <ProgramsSection />

      {/* Section Méthodologie */}
      <MethodologySection />

      {/* Programme 1ère Année */}
      <ProgramYearSection />

      {/* FAQ */}
      <FAQSection />

      {/* Call-to-Action finale */}
      <CTASection />
    </>
  );
}
