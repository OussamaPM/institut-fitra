import StudyPathSection from '@/components/public/StudyPathSection';
import FAQSection from '@/components/public/FAQSection';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getSoleProgramId(): Promise<number | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';
    const res = await fetch(`${apiUrl}/programs`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const programs = Array.isArray(data) ? data : data.data || [];
    return programs.length === 1 ? programs[0].id : null;
  } catch {
    return null;
  }
}

export default async function CursusPage() {
  const programId = await getSoleProgramId();
  const inscriptionHref = programId ? `/programs/${programId}` : '/programs';

  return (
    <>
      <StudyPathSection />

      <section className="pt-0 pb-14 sm:pb-16" style={{ backgroundColor: '#FAF9F6' }}>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <Link
            href={inscriptionHref}
            className="group inline-flex items-center gap-3 px-8 sm:px-10 py-4 bg-primary text-white rounded-xl hover:bg-primary/90 active:scale-95 transition-all font-semibold text-base sm:text-lg shadow-lg shadow-primary/30 ring-2 ring-primary/20 hover:ring-primary/40"
          >
            Je m&apos;inscris en 1ère année
            <svg className="w-5 h-5 flex-shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      <FAQSection />
    </>
  );
}
