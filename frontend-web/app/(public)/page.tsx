import Link from 'next/link';
import HeroSection from '@/components/public/HeroSection';
import PillarsSection from '@/components/public/PillarsSection';
import ComingSoon from '@/components/public/ComingSoon';
import { usersApi } from '@/lib/api/users';

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

async function getTeachers() {
  try {
    const usersResponse = await usersApi.getAll();
    const usersArray = Array.isArray(usersResponse) ? usersResponse : usersResponse.data || [];
    return usersArray.filter((u: { role: string }) => u.role === 'teacher' || u.role === 'admin');
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [isComingSoon, teachers] = await Promise.all([
    getComingSoonStatus(),
    getTeachers(),
  ]);

  if (isComingSoon) {
    return <ComingSoon />;
  }

  return (
    <>
      {/* 1. Hero */}
      <HeroSection />

      {/* 2. Notre Mission */}
      <section className="py-10 sm:py-12 md:py-13 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="font-playfair text-2xl sm:text-3xl md:text-4xl font-bold text-secondary mb-5">
              Notre Mission
            </h2>
            <div className="w-16 sm:w-20 h-0.5 sm:h-1 bg-primary mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
            <div>
              <div className="space-y-4 text-gray-600 text-sm sm:text-base leading-relaxed">
                <p>
                  L'Institut Fitra est une plateforme d'apprentissage en ligne qui offre des cours
                  de qualité en langue arabe et sciences islamiques, accessibles à tous, partout
                  dans le monde.
                </p>
                <p>
                  Notre mission est de rendre l'apprentissage de la langue arabe et des sciences
                  islamiques accessible, efficace et enrichissant pour chaque étudiant, quel que
                  soit son niveau ou sa localisation.
                </p>
                <p>
                  Nous croyons fermement que l'éducation est la clé du développement personnel et
                  spirituel, et nous nous engageons à fournir un enseignement authentique basé sur
                  les sources traditionnelles.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 sm:p-8">
              <div className="space-y-5 sm:space-y-6">
                {[
                  {
                    icon: (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ),
                    titre: 'Qualité Garantie',
                    desc: 'Enseignants diplômés des meilleures universités islamiques',
                  },
                  {
                    icon: (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ),
                    titre: 'Flexibilité',
                    desc: "Cours en ligne accessibles depuis n'importe où",
                  },
                  {
                    icon: (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    ),
                    titre: 'Communauté',
                    desc: "Rejoignez une communauté d'apprenants motivés",
                  },
                ].map((item) => (
                  <div key={item.titre} className="flex items-start space-x-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {item.icon}
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-secondary mb-1 text-sm sm:text-base">{item.titre}</h3>
                      <p className="text-xs sm:text-sm text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Nos Valeurs */}
      <section className="py-10 sm:py-12 md:py-13 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="font-playfair text-2xl sm:text-3xl md:text-4xl font-bold text-secondary text-center mb-5">
            Nos Valeurs
          </h2>
          <div className="w-16 sm:w-20 h-0.5 sm:h-1 bg-primary mx-auto rounded-full mb-8 sm:mb-10"></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
            {[
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
                titre: 'Authenticité',
                desc: 'Un enseignement basé sur les sources authentiques et la tradition islamique',
              },
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />,
                titre: 'Bienveillance',
                desc: 'Un accompagnement personnalisé dans une ambiance respectueuse et fraternelle',
              },
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />,
                titre: 'Excellence',
                desc: 'Des standards élevés d\'enseignement pour une formation de qualité optimale',
              },
            ].map((valeur) => (
              <div key={valeur.titre} className="bg-white rounded-xl shadow-md p-5 sm:p-6 text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {valeur.icon}
                  </svg>
                </div>
                <h3 className="font-playfair text-lg sm:text-xl font-semibold text-secondary mb-2">
                  {valeur.titre}
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm">{valeur.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Les 5 Piliers du Cursus */}
      <PillarsSection />

      {/* 6. Notre Équipe Enseignante */}
      <section className="py-10 sm:py-12 md:py-13 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="font-playfair text-2xl sm:text-3xl md:text-4xl font-bold text-secondary text-center mb-5">
            Notre Équipe Enseignante
          </h2>
          <div className="w-16 sm:w-20 h-0.5 sm:h-1 bg-primary mx-auto rounded-full mb-8 sm:mb-10"></div>

          {/* Direction */}
          <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 mb-8 border-l-4 border-primary">
            <h3 className="font-playfair text-xl sm:text-2xl font-semibold text-secondary mb-4">
              Direction et Enseignement
            </h3>
            <p className="text-gray-600 text-sm sm:text-base mb-6 leading-relaxed">
              Le cursus est placé sous la direction de <strong className="text-secondary">Cheikh Abdelbasset</strong>,
              dont le parcours académique et spirituel allie tradition et rigueur universitaire :
            </p>
            <div className="space-y-5">
              {[
                {
                  icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />,
                  titre: 'Parcours',
                  desc: "Doctorant en Fondements du Fiqh, titulaire d'un Master en pensée islamique et d'une Licence Oussoul Eddine (Études du Coran et du Hadith).",
                },
                {
                  icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
                  titre: 'Transmission',
                  desc: "Maîtrise du Coran (Warsh) et formé aux sciences de la langue arabe. Il a étudié et continue d'étudier auprès de grands savants (principalement au Maroc), dont il a reçu des Ijazat (autorisations de transmettre) pour de nombreux ouvrages de référence.",
                },
                {
                  icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />,
                  titre: 'Approche',
                  desc: "Un enseignant expérimenté privilégiant une pédagogie bienveillante, centrée sur l'accompagnement et la réforme de l'étudiant.",
                },
              ].map((item) => (
                <div key={item.titre} className="flex items-start gap-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {item.icon}
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-secondary text-sm sm:text-base mb-1">{item.titre}</h4>
                    <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grille enseignants */}
          {teachers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
              {teachers.map((teacher: { id: number; first_name: string; last_name: string; role: string; teacher_profile?: { specialization?: string; bio?: string } }) => (
                <div key={teacher.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="bg-gradient-to-br from-primary to-primary/80 h-24 sm:h-32 flex items-center justify-center">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center text-primary font-bold text-xl sm:text-3xl">
                      {teacher.first_name[0]}{teacher.last_name[0]}
                    </div>
                  </div>
                  <div className="p-4 sm:p-6">
                    <h3 className="font-playfair text-lg sm:text-xl font-semibold text-secondary mb-1">
                      {teacher.first_name} {teacher.last_name}
                    </h3>
                    {teacher.teacher_profile?.specialization && (
                      <p className="text-primary font-medium text-xs sm:text-sm mb-2 sm:mb-3">
                        {teacher.teacher_profile.specialization}
                      </p>
                    )}
                    {teacher.teacher_profile?.bio && (
                      <p className="text-gray-600 text-xs sm:text-sm line-clamp-3">
                        {teacher.teacher_profile.bio}
                      </p>
                    )}
                    {teacher.role === 'admin' && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <span className="inline-flex items-center px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                          Administrateur
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 7. Teaser Séminaire */}
      <section className="pt-5 sm:pt-6 pb-16 sm:pb-20 md:pb-24 bg-background">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-playfair text-2xl sm:text-3xl md:text-4xl font-bold text-secondary mb-5">
            Les Séminaires Intensifs
          </h2>
          <div className="w-16 sm:w-20 h-0.5 sm:h-1 bg-primary mx-auto rounded-full mb-8"></div>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            Des immersions de plusieurs jours pour approfondir un domaine des sciences islamiques
            en compagnie de savants et d'une communauté d'apprenants motivés. Accessible en ligne,
            depuis n'importe où dans le monde.
          </p>
          <Link
            href="/seminaire"
            className="inline-flex items-center gap-2 px-7 py-3 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors font-semibold text-sm sm:text-base shadow-md"
          >
            Découvrir les séminaires →
          </Link>
        </div>
      </section>
    </>
  );
}
