import { usersApi } from '@/lib/api/users';

export default async function AboutPage() {
  // Récupérer tous les professeurs
  let teachers = [];
  try {
    const usersResponse = await usersApi.getAll();
    const usersArray = Array.isArray(usersResponse) ? usersResponse : usersResponse.data || [];
    teachers = usersArray.filter((u) => u.role === 'teacher' || u.role === 'admin');
  } catch (error) {
    console.error('Erreur:', error);
  }

  return (
    <div className="py-8 sm:py-10 md:py-12 bg-background min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl font-bold text-secondary mb-3 sm:mb-4">
            À Propos de l'Institut Fitra
          </h1>
          <p className="text-gray-600 max-w-3xl mx-auto text-sm sm:text-base md:text-lg">
            Une institution dédiée à l'enseignement de la langue arabe et des sciences islamiques
          </p>
        </div>

        {/* Mission */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 md:p-8 lg:p-12 mb-8 sm:mb-10 md:mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 items-center">
            <div>
              <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-secondary mb-4 sm:mb-6">
                Notre Mission
              </h2>
              <div className="space-y-3 sm:space-y-4 text-gray-600 text-sm sm:text-base">
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

            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 sm:p-6 md:p-8">
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary mb-0.5 sm:mb-1 text-sm sm:text-base">Qualité Garantie</h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Enseignants diplômés des meilleures universités islamiques
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary mb-0.5 sm:mb-1 text-sm sm:text-base">Flexibilité</h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Cours en ligne accessibles depuis n'importe où
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary mb-0.5 sm:mb-1 text-sm sm:text-base">Communauté</h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Rejoignez une communauté d'apprenants motivés
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Valeurs */}
        <div className="mb-10 sm:mb-12 md:mb-16">
          <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-secondary text-center mb-6 sm:mb-8">
            Nos Valeurs
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="font-playfair text-lg sm:text-xl font-semibold text-secondary mb-1.5 sm:mb-2">
                Authenticité
              </h3>
              <p className="text-gray-600 text-xs sm:text-sm">
                Un enseignement basé sur les sources authentiques et la tradition islamique
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h3 className="font-playfair text-lg sm:text-xl font-semibold text-secondary mb-1.5 sm:mb-2">
                Bienveillance
              </h3>
              <p className="text-gray-600 text-xs sm:text-sm">
                Un accompagnement personnalisé dans une ambiance respectueuse et fraternelle
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 text-center sm:col-span-2 md:col-span-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="font-playfair text-lg sm:text-xl font-semibold text-secondary mb-1.5 sm:mb-2">
                Excellence
              </h3>
              <p className="text-gray-600 text-xs sm:text-sm">
                Des standards élevés d'enseignement pour une formation de qualité optimale
              </p>
            </div>
          </div>
        </div>

        {/* Équipe enseignante */}
        <div>
          <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-secondary text-center mb-6 sm:mb-8">
            Notre Équipe Enseignante
          </h2>

          {/* Direction et Enseignement */}
          <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 mb-8 sm:mb-10 border-l-4 border-primary">
            <h3 className="font-playfair text-xl sm:text-2xl font-semibold text-secondary mb-4">
              Direction et Enseignement
            </h3>
            <p className="text-gray-600 text-sm sm:text-base mb-6 leading-relaxed">
              Le cursus est placé sous la direction d'<strong className="text-secondary">Oustadh Abdelbasset</strong>,
              dont le parcours académique et spirituel allie tradition et rigueur universitaire :
            </p>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-secondary text-sm sm:text-base mb-1">Parcours</h4>
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                    Doctorant en Fondements du Fiqh, titulaire d'un Master en pensée islamique et d'une Licence
                    Oussoul Eddine (Études du Coran et du Hadith).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-secondary text-sm sm:text-base mb-1">Transmission</h4>
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                    Maîtrise du Coran (Warsh) et formé aux sciences de la langue arabe. Il a étudié et continue
                    d'étudier auprès de grands savants (principalement au Maroc), dont il a reçu des{' '}
                    <em>Ijazat</em> (autorisations de transmettre) pour de nombreux ouvrages de référence.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-secondary text-sm sm:text-base mb-1">Approche</h4>
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                    Un enseignant expérimenté privilégiant une pédagogie bienveillante, centrée sur
                    l'accompagnement et la réforme de l'étudiant.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {teachers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow"
                >
                  {/* Avatar */}
                  <div className="bg-gradient-to-br from-primary to-primary/80 h-24 sm:h-32 flex items-center justify-center">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center text-primary font-bold text-xl sm:text-3xl">
                      {teacher.first_name[0]}
                      {teacher.last_name[0]}
                    </div>
                  </div>

                  {/* Informations */}
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
                      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
                        <span className="inline-flex items-center px-2.5 sm:px-3 py-0.5 sm:py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                          Administrateur
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8 sm:py-12 text-sm sm:text-base">
              Informations sur l'équipe enseignante à venir.
            </div>
          )}
        </div>

        {/* Call-to-Action */}
        <div className="mt-10 sm:mt-12 md:mt-16 bg-gradient-to-r from-primary to-primary/80 rounded-xl p-6 sm:p-8 md:p-12 text-white text-center">
          <h2 className="font-playfair text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
            Rejoignez-nous dès aujourd'hui
          </h2>
          <p className="text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto text-sm sm:text-base">
            Commencez votre parcours d'apprentissage avec l'Institut Fitra et bénéficiez
            d'un enseignement de qualité adapté à votre niveau.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <a
              href="/programs"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 bg-white text-primary rounded-lg hover:bg-gray-100 transition-all shadow-lg text-sm sm:text-base font-medium"
            >
              Découvrir nos programmes
            </a>
            <a
              href="/auth/register"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 border-2 border-white text-white rounded-lg hover:bg-white hover:text-primary transition-all text-sm sm:text-base font-medium"
            >
              S'inscrire gratuitement
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
