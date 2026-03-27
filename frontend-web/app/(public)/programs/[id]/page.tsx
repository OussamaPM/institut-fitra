'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Program, ClassModel } from '@/lib/types';
import checkoutApi from '@/lib/api/checkout';

export default function ProgramDetailPage() {
  const params = useParams();
  const programId = parseInt(params.id as string);

  const [program, setProgram] = useState<Program | null>(null);
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Liste des pays avec indicatifs et drapeaux
  const countryCodes = [
    { code: '+33', country: 'France', flag: '🇫🇷' },
    { code: '+32', country: 'Belgique', flag: '🇧🇪' },
    { code: '+41', country: 'Suisse', flag: '🇨🇭' },
    { code: '+212', country: 'Maroc', flag: '🇲🇦' },
    { code: '+213', country: 'Algérie', flag: '🇩🇿' },
    { code: '+216', country: 'Tunisie', flag: '🇹🇳' },
    { code: '+221', country: 'Sénégal', flag: '🇸🇳' },
    { code: '+223', country: 'Mali', flag: '🇲🇱' },
    { code: '+225', country: 'Côte d\'Ivoire', flag: '🇨🇮' },
    { code: '+44', country: 'Royaume-Uni', flag: '🇬🇧' },
    { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
    { code: '+49', country: 'Allemagne', flag: '🇩🇪' },
    { code: '+34', country: 'Espagne', flag: '🇪🇸' },
    { code: '+39', country: 'Italie', flag: '🇮🇹' },
    { code: '+31', country: 'Pays-Bas', flag: '🇳🇱' },
    { code: '+352', country: 'Luxembourg', flag: '🇱🇺' },
    { code: '+966', country: 'Arabie Saoudite', flag: '🇸🇦' },
    { code: '+971', country: 'Émirats', flag: '🇦🇪' },
    { code: '+974', country: 'Qatar', flag: '🇶🇦' },
    { code: '+90', country: 'Turquie', flag: '🇹🇷' },
  ];

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState(countryCodes[0]); // France par défaut
  const [formData, setFormData] = useState({
    customer_first_name: '',
    customer_last_name: '',
    customer_email: '',
    customer_phone: '',
    customer_gender: '' as 'male' | 'female' | '',
    installments_count: 1,
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

        // Fetch program
        const programResponse = await fetch(`${apiUrl}/programs/${programId}`);
        if (!programResponse.ok) throw new Error('Programme introuvable');
        const programData = await programResponse.json();
        setProgram(programData.program || programData);

        // Fetch classes for this program
        const classesResponse = await fetch(`${apiUrl}/classes?program_id=${programId}`);
        if (classesResponse.ok) {
          const classesData = await classesResponse.json();
          const classesArray = Array.isArray(classesData)
            ? classesData
            : classesData.data || classesData.classes?.data || [];
          setClasses(classesArray.filter((c: ClassModel) => c.program_id === programId));
        }
      } catch (err) {
        console.error('Erreur:', err);
        setError('Programme introuvable.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [programId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'number' ? parseInt(e.target.value) : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.customer_first_name || !formData.customer_last_name || !formData.customer_email || !formData.customer_gender) {
      setFormError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.customer_email)) {
      setFormError('Veuillez entrer une adresse email valide.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Combiner l'indicatif pays avec le numéro de téléphone
      const fullPhoneNumber = formData.customer_phone
        ? `${selectedCountryCode.code} ${formData.customer_phone}`
        : undefined;

      const session = await checkoutApi.createSession({
        program_id: programId,
        customer_email: formData.customer_email,
        customer_first_name: formData.customer_first_name,
        customer_last_name: formData.customer_last_name,
        customer_phone: fullPhoneNumber,
        customer_gender: formData.customer_gender,
        installments_count: formData.installments_count,
      });

      // Redirect to Stripe Checkout
      window.location.href = session.checkout_url;
    } catch (err: any) {
      console.error('Error creating checkout session:', err);
      setFormError(err.response?.data?.message || 'Erreur lors de la création de la session de paiement.');
      setIsSubmitting(false);
    }
  };

  const formatPrice = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(numAmount);
  };

  const formatDay = (day: string) => {
    const days: { [key: string]: string } = {
      lundi: 'Lundi',
      mardi: 'Mardi',
      mercredi: 'Mercredi',
      jeudi: 'Jeudi',
      vendredi: 'Vendredi',
      samedi: 'Samedi',
      dimanche: 'Dimanche',
    };
    return days[day.toLowerCase()] || day;
  };

  if (isLoading) {
    return (
      <div className="py-12 bg-background min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="py-12 bg-background min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="text-error mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="font-playfair text-2xl font-bold text-secondary mb-4">
              Programme introuvable
            </h1>
            <p className="text-gray-600 mb-6">
              Le programme que vous recherchez n'existe pas ou n'est plus disponible.
            </p>
            <Link
              href="/programs"
              className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Voir tous les programmes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const programPrice = typeof program.price === 'string' ? parseFloat(program.price) : program.price;
  const installmentAmount = programPrice / formData.installments_count;

  return (
    <div className="py-6 sm:py-8 md:py-12 bg-background min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 sm:mb-6 md:mb-8 flex items-center space-x-2 text-xs sm:text-sm text-gray-600 overflow-x-auto whitespace-nowrap pb-2">
          <Link href="/" className="hover:text-primary flex-shrink-0">
            Accueil
          </Link>
          <span className="flex-shrink-0">/</span>
          <Link href="/programs" className="hover:text-primary flex-shrink-0">
            Programmes
          </Link>
          <span className="flex-shrink-0">/</span>
          <span className="text-secondary truncate">{program.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Colonne principale - Détails du programme */}
          <div className="lg:col-span-2 space-y-6 lg:space-y-8">
            {/* En-tête du programme */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-primary/80 p-4 sm:p-6 md:p-8 text-white">
                <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
                  <span className="bg-white/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold">
                    {program.subject}
                  </span>
                  {program.active && (
                    <span className="bg-success px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold">
                      Inscriptions ouvertes
                    </span>
                  )}
                </div>
                <h1 className="font-playfair text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">{program.name}</h1>
                <p className="text-white/90 text-sm sm:text-base md:text-lg whitespace-pre-line">{program.description}</p>
              </div>

              <div className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
                {/* Prix */}
                <div>
                  <h3 className="font-semibold text-secondary mb-2 text-sm sm:text-base">Tarif</h3>
                  <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">{formatPrice(program.price)}</div>
                  {program.max_installments > 1 && (
                    <p className="text-xs sm:text-sm text-gray-600">
                      Paiement en {program.max_installments} fois sans frais disponible
                    </p>
                  )}
                </div>

                {/* Professeur */}
                {program.teacher && program.teacher.first_name && program.teacher.last_name && (
                  <div>
                    <h3 className="font-semibold text-secondary mb-2 sm:mb-3 text-sm sm:text-base">Enseignant</h3>
                    <div className="flex items-center space-x-3 p-3 sm:p-4 bg-background rounded-lg">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0">
                        {program.teacher.first_name[0]}
                        {program.teacher.last_name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-secondary text-sm sm:text-base truncate">
                          {program.teacher.first_name} {program.teacher.last_name}
                        </div>
                        {program.teacher.teacher_profile?.specialization && (
                          <div className="text-xs sm:text-sm text-gray-600 truncate">
                            {program.teacher.teacher_profile.specialization}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Horaires */}
                {program.schedule && program.schedule.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-secondary mb-2 sm:mb-3 text-sm sm:text-base">Horaires des cours</h3>
                    <div className="space-y-2">
                      {program.schedule.map((slot, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2.5 sm:p-3 bg-background rounded-lg"
                        >
                          <div className="flex items-center space-x-2">
                            <svg
                              className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="font-medium text-secondary text-sm sm:text-base">
                              {formatDay(slot.day)}
                            </span>
                          </div>
                          <span className="text-gray-600 text-xs sm:text-sm">
                            {slot.start_time} - {slot.end_time}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contenu du programme */}
                {program.subject_description && (
                  <div>
                    <h3 className="font-semibold text-secondary mb-2 sm:mb-3 text-sm sm:text-base">Contenu du programme</h3>
                    <p className="text-gray-600 whitespace-pre-line text-sm sm:text-base">
                      {program.subject_description}
                    </p>
                  </div>
                )}

                {/* Conditions d'inscription */}
                {program.enrollment_conditions && (
                  <div>
                    <h3 className="font-semibold text-secondary mb-2 sm:mb-3 text-sm sm:text-base">Conditions d'inscription</h3>
                    <p className="text-gray-600 whitespace-pre-line text-sm sm:text-base">
                      {program.enrollment_conditions}
                    </p>
                  </div>
                )}

                {/* Classes disponibles */}
                {classes.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-secondary mb-2 sm:mb-3 text-sm sm:text-base">
                      Classes disponibles ({classes.length})
                    </h3>
                    <div className="space-y-2">
                      {classes.slice(0, 3).map((classItem) => (
                        <div
                          key={classItem.id}
                          className="p-2.5 sm:p-3 bg-background rounded-lg border border-gray-200"
                        >
                          <div className="font-medium text-secondary text-xs sm:text-sm">
                            {classItem.name}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {new Date(classItem.start_date).toLocaleDateString('fr-FR')} -{' '}
                            {new Date(classItem.end_date).toLocaleDateString('fr-FR')}
                          </div>
                          {classItem.max_students && (
                            <div className="text-xs text-gray-500 mt-1">
                              {classItem.enrolled_students_count || 0}/{classItem.max_students}{' '}
                              places
                            </div>
                          )}
                        </div>
                      ))}
                      {classes.length > 3 && (
                        <p className="text-xs sm:text-sm text-gray-500">
                          Et {classes.length - 3} autre{classes.length - 3 > 1 ? 's' : ''}{' '}
                          classe{classes.length - 3 > 1 ? 's' : ''}...
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Colonne latérale - Formulaire d'inscription */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 sticky top-20 lg:top-8">
              <h2 className="font-playfair text-xl sm:text-2xl font-semibold text-secondary mb-3 sm:mb-4">
                Je m'inscris
              </h2>

              {!showForm ? (
                // Récapitulatif avant inscription
                <div className="space-y-3 sm:space-y-4">
                  <div className="pb-3 sm:pb-4 border-b border-gray-200">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Programme</p>
                    <p className="font-semibold text-secondary text-sm sm:text-base">{program.name}</p>
                    <p className="text-xs sm:text-sm text-primary">{program.subject}</p>
                  </div>

                  <div className="pb-3 sm:pb-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Prix</span>
                      <span className="text-xl sm:text-2xl font-bold text-primary">{formatPrice(program.price)}</span>
                    </div>
                    {program.max_installments > 1 && (
                      <p className="text-xs text-gray-500 mt-1">
                        ou en {program.max_installments}× {formatPrice(programPrice / program.max_installments)}
                      </p>
                    )}
                  </div>

                  {/* Info box */}
                  <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-xs sm:text-sm text-blue-700">
                        <p className="font-medium mb-1">Ce qui vous attend</p>
                        <ul className="list-disc list-inside text-xs space-y-0.5 sm:space-y-1">
                          <li>Compte élève créé automatiquement</li>
                          <li>Accès immédiat à l'espace élève</li>
                          <li>Inscription à la classe en cours</li>
                          <li>Email de confirmation</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowForm(true)}
                    className="w-full flex items-center justify-center px-4 sm:px-6 py-3 sm:py-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl font-semibold text-sm sm:text-base"
                  >
                    S'inscrire maintenant
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </div>
              ) : (
                // Formulaire d'inscription
                <form onSubmit={handleSubmit} className="space-y-4">
                  {formError && (
                    <div className="p-3 bg-error/10 border border-error rounded-lg">
                      <p className="text-error text-sm">{formError}</p>
                    </div>
                  )}

                  {/* Nom et Prénom */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="customer_first_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Prénom *
                      </label>
                      <input
                        type="text"
                        id="customer_first_name"
                        name="customer_first_name"
                        value={formData.customer_first_name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label htmlFor="customer_last_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Nom *
                      </label>
                      <input
                        type="text"
                        id="customer_last_name"
                        name="customer_last_name"
                        value={formData.customer_last_name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Genre */}
                  <div>
                    <label htmlFor="customer_gender" className="block text-sm font-medium text-gray-700 mb-1">
                      Genre *
                    </label>
                    <select
                      id="customer_gender"
                      name="customer_gender"
                      value={formData.customer_gender}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                      required
                      disabled={isSubmitting}
                    >
                      <option value="">Sélectionner</option>
                      <option value="male">Homme</option>
                      <option value="female">Femme</option>
                    </select>
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="customer_email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="customer_email"
                      name="customer_email"
                      value={formData.customer_email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                      placeholder="votre@email.com"
                      required
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Pour créer votre compte élève
                    </p>
                  </div>

                  {/* Téléphone avec sélecteur d'indicatif */}
                  <div>
                    <label htmlFor="customer_phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone
                    </label>
                    <div className="flex gap-2">
                      {/* Sélecteur d'indicatif pays */}
                      <div className="relative" ref={countryDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                          disabled={isSubmitting}
                          className="flex items-center gap-1 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-gray-50 hover:bg-gray-100 transition-colors min-w-[90px]"
                        >
                          <span className="text-base">{selectedCountryCode.flag}</span>
                          <span className="text-gray-700 text-xs">{selectedCountryCode.code}</span>
                          <svg
                            className={`w-3 h-3 text-gray-500 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Dropdown des pays */}
                        {isCountryDropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 overflow-hidden max-h-48 overflow-y-auto min-w-[180px]">
                            {countryCodes.map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                onClick={() => {
                                  setSelectedCountryCode(country);
                                  setIsCountryDropdownOpen(false);
                                }}
                                className={`w-full px-3 py-2 hover:bg-gray-50 transition-colors text-left flex items-center gap-2 ${
                                  selectedCountryCode.code === country.code ? 'bg-primary/5' : ''
                                }`}
                              >
                                <span className="text-base">{country.flag}</span>
                                <span className="text-sm text-gray-700">{country.country}</span>
                                <span className="text-xs text-gray-500 ml-auto">{country.code}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Champ numéro de téléphone */}
                      <div className="flex-1 flex items-center gap-1">
                        {/* Affichage du (0) si le numéro commence par 0 */}
                        {formData.customer_phone.startsWith('0') && (
                          <span className="text-gray-500 text-sm">(0)</span>
                        )}
                        <input
                          type="tel"
                          id="customer_phone"
                          name="customer_phone"
                          value={formData.customer_phone.startsWith('0') ? formData.customer_phone.slice(1) : formData.customer_phone}
                          onChange={(e) => {
                            const inputValue = e.target.value.replace(/\D/g, '');
                            // Si le champ actuel commence par 0, on garde le 0 + les nouveaux chiffres (max 9)
                            if (formData.customer_phone.startsWith('0')) {
                              setFormData({ ...formData, customer_phone: '0' + inputValue.slice(0, 9) });
                            } else if (inputValue.startsWith('0')) {
                              // Si l'utilisateur tape 0 en premier, on le garde et limite à 9 chiffres après
                              setFormData({ ...formData, customer_phone: inputValue.slice(0, 10) });
                            } else {
                              // Sinon, numéro sans 0, limité à 9 chiffres
                              setFormData({ ...formData, customer_phone: inputValue.slice(0, 9) });
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                          placeholder="6 12 34 56 78"
                          maxLength={9}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      9 chiffres sans l'indicatif pays
                    </p>
                  </div>

                  {/* Options de paiement */}
                  {program.max_installments > 1 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mode de paiement
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Bouton Paiement unique */}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, installments_count: 1 });
                            setIsDropdownOpen(false);
                          }}
                          disabled={isSubmitting}
                          className={`p-3 border-2 rounded-lg transition-all text-left ${
                            formData.installments_count === 1
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-secondary text-xs sm:text-sm">
                              Paiement unique
                            </span>
                            <span className="font-bold text-primary text-sm sm:text-base mt-0.5">
                              {formatPrice(programPrice)}
                            </span>
                          </div>
                        </button>

                        {/* Bouton Paiement plusieurs fois avec dropdown */}
                        <div className="relative" ref={dropdownRef}>
                          <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            disabled={isSubmitting}
                            className={`w-full p-3 border-2 rounded-lg transition-all text-left ${
                              formData.installments_count > 1
                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex flex-col">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-secondary text-xs sm:text-sm">
                                  {formData.installments_count > 1
                                    ? `${formData.installments_count}× sans frais`
                                    : 'Plusieurs fois'}
                                </span>
                                <svg
                                  className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                              <span className="font-bold text-primary text-sm sm:text-base mt-0.5">
                                {formData.installments_count > 1
                                  ? `${formatPrice(programPrice / formData.installments_count)}/mois`
                                  : 'Choisir'}
                              </span>
                            </div>
                          </button>

                          {/* Dropdown menu */}
                          {isDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                              {Array.from({ length: program.max_installments - 1 }, (_, i) => i + 2).map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, installments_count: num });
                                    setIsDropdownOpen(false);
                                  }}
                                  className={`w-full px-3 py-2.5 hover:bg-gray-50 transition-colors text-left ${
                                    formData.installments_count === num ? 'bg-primary/5' : ''
                                  }`}
                                >
                                  <div className="font-medium text-secondary text-sm">
                                    {num}× sans frais
                                  </div>
                                  <div className="font-bold text-primary text-sm">
                                    {formatPrice(programPrice / num)}/mois
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Paiement en plusieurs fois sans frais
                      </p>
                    </div>
                  )}

                  {/* Récapitulatif prix */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-secondary">
                        {formData.installments_count > 1 ? 'Premier paiement' : 'Total'}
                      </span>
                      <span className="text-xl font-bold text-primary">
                        {formatPrice(installmentAmount)}
                      </span>
                    </div>
                    {formData.installments_count > 1 && (
                      <p className="text-xs text-gray-500">
                        Puis {formData.installments_count - 1} paiement(s) de {formatPrice(installmentAmount)}
                      </p>
                    )}
                  </div>

                  {/* Boutons */}
                  <div className="space-y-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Redirection...
                        </>
                      ) : (
                        <>
                          Procéder au paiement
                          <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="w-full px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
                      disabled={isSubmitting}
                    >
                      Retour aux détails
                    </button>
                  </div>

                  {/* Security note */}
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Paiement sécurisé par Stripe</span>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Retour à la liste */}
        <div className="text-center mt-6 sm:mt-8">
          <Link
            href="/programs"
            className="inline-flex items-center text-primary hover:text-primary/80 transition-colors text-sm sm:text-base"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Retour aux programmes
          </Link>
        </div>
      </div>
    </div>
  );
}
