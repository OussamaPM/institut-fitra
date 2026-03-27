'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { enrollmentsApi, studentProfileApi } from '@/lib/api';
import { reinscriptionApi, LevelsHistory } from '@/lib/api/reinscription';
import failedPaymentsApi from '@/lib/api/failed-payments';
import { Enrollment, AvailableReinscription, OrderPaymentHistory } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Camera, Trash2, Mail, Phone, MapPin, Calendar, User, AlertCircle, Loader2, TrendingUp, History, CreditCard, Pencil, X, Check } from 'lucide-react';
import apiClient from '@/lib/api/client';
import { UpdateProfileData } from '@/lib/api/studentProfile';

export default function StudentProfile() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [availableReinscriptions, setAvailableReinscriptions] = useState<AvailableReinscription[]>([]);
  const [levelsHistory, setLevelsHistory] = useState<LevelsHistory>({});
  const [paymentHistory, setPaymentHistory] = useState<OrderPaymentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edition infos personnelles
  const [editingInfo, setEditingInfo] = useState(false);
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [infoError, setInfoError] = useState('');
  const [infoForm, setInfoForm] = useState<UpdateProfileData>({
    email: '', first_name: '', last_name: '', gender: '', phone: '', date_of_birth: '', emergency_contact: '',
    address: '', city: '', country: '',
  });

  // Edition adresse
  const [editingAddress, setEditingAddress] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [enrollmentsData, reinscriptionsData, historyData, paymentsData] = await Promise.all([
        enrollmentsApi.getMyEnrollments(),
        reinscriptionApi.getAvailable().catch(() => []),
        reinscriptionApi.getHistory().catch(() => ({})),
        failedPaymentsApi.getPaymentHistory().catch(() => ({ payment_history: [] })),
      ]);
      setEnrollments(enrollmentsData);
      setAvailableReinscriptions(reinscriptionsData);
      setLevelsHistory(historyData);
      setPaymentHistory(paymentsData.payment_history || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('La photo ne doit pas depasser 2 Mo.');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setPhotoError('Veuillez selectionner une image valide.');
      return;
    }

    setPhotoError('');
    setIsUploadingPhoto(true);

    try {
      await studentProfileApi.updatePhoto(file);
      // Refresh user data to get updated photo
      if (refreshUser) {
        await refreshUser();
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      setPhotoError('Impossible de mettre a jour la photo.');
    } finally {
      setIsUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm('Etes-vous sur de vouloir supprimer votre photo de profil ?')) {
      return;
    }

    setPhotoError('');
    setIsUploadingPhoto(true);

    try {
      await studentProfileApi.removePhoto();
      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }
    } catch (err) {
      console.error('Error removing photo:', err);
      setPhotoError('Impossible de supprimer la photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleStripePortal = async () => {
    setIsLoadingPortal(true);
    try {
      const response = await apiClient.post('/student/stripe-portal');
      window.location.href = response.data.portal_url;
    } catch {
      alert('Impossible d\'accéder au portail de paiement. Vérifiez que vous avez au moins une commande payée.');
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const profile = user?.student_profile;

  const openEditInfo = () => {
    setInfoForm({
      email: user?.email || '',
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      gender: profile?.gender || '',
      phone: profile?.phone || '',
      date_of_birth: profile?.date_of_birth ? profile.date_of_birth.substring(0, 10) : '',
      emergency_contact: profile?.emergency_contact || '',
      address: profile?.address || '',
      city: profile?.city || '',
      country: profile?.country || '',
    });
    setInfoError('');
    setEditingInfo(true);
  };

  const openEditAddress = () => {
    setInfoForm(prev => ({
      ...prev,
      address: profile?.address || '',
      city: profile?.city || '',
      country: profile?.country || '',
    }));
    setAddressError('');
    setEditingAddress(true);
  };

  const saveInfo = async () => {
    if (!infoForm.email.trim() || !infoForm.first_name.trim() || !infoForm.last_name.trim()) {
      setInfoError('L\'email, le prénom et le nom sont obligatoires.');
      return;
    }
    setIsSavingInfo(true);
    setInfoError('');
    try {
      await studentProfileApi.update(infoForm);
      if (refreshUser) await refreshUser();
      setEditingInfo(false);
    } catch (err: any) {
      setInfoError(err?.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setIsSavingInfo(false);
    }
  };

  const saveAddress = async () => {
    setIsSavingAddress(true);
    setAddressError('');
    try {
      await studentProfileApi.update({
        email: user?.email || '',
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        address: infoForm.address,
        city: infoForm.city,
        country: infoForm.country,
      });
      if (refreshUser) await refreshUser();
      setEditingAddress(false);
    } catch (err: any) {
      setAddressError(err?.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-playfair font-semibold text-secondary">Mon Profil</h1>
        <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">Consultez vos informations personnelles</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Carte Profil Principal */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
            {/* Avatar */}
            <div className="text-center mb-4 md:mb-6">
              {/* Photo container centre */}
              <div className="flex justify-center mb-3 md:mb-4">
                <div className="relative">
                  {/* Photo de profil */}
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-4 border-white shadow-lg">
                    {profile?.profile_photo ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/storage/${profile.profile_photo}`}
                        alt="Photo de profil"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center text-white text-xl md:text-2xl font-semibold ${
                        profile?.gender === 'female' ? 'bg-pink-400' : 'bg-blue-400'
                      }`}>
                        {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                      </div>
                    )}
                  </div>

                  {/* Input file cache */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    id="profile-photo-input"
                    disabled={isUploadingPhoto}
                  />

                  {/* Bouton d'ajout/modification (en bas a droite) */}
                  <label
                    htmlFor="profile-photo-input"
                    className={`absolute -bottom-1 -right-1 w-8 h-8 md:w-9 md:h-9 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 active:bg-primary/80 transition-colors shadow-md border-2 border-white ${
                      isUploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title={profile?.profile_photo ? 'Modifier la photo' : 'Ajouter une photo'}
                  >
                    {isUploadingPhoto ? (
                      <Loader2 size={16} className="text-white animate-spin" />
                    ) : (
                      <Camera size={16} className="text-white" />
                    )}
                  </label>

                  {/* Bouton de suppression (en bas a gauche, seulement si photo existe) */}
                  {profile?.profile_photo && !isUploadingPhoto && (
                    <button
                      onClick={handleRemovePhoto}
                      className="absolute -bottom-1 -left-1 w-8 h-8 md:w-9 md:h-9 bg-white rounded-full flex items-center justify-center cursor-pointer hover:bg-error hover:text-white active:bg-error/90 transition-colors shadow-md border-2 border-gray-200 text-gray-400"
                      title="Supprimer la photo"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Photo error message */}
              {photoError && (
                <p className="text-xs text-error mb-2">{photoError}</p>
              )}

              <h2 className="text-lg md:text-xl font-semibold text-secondary">
                {profile?.first_name} {profile?.last_name}
              </h2>
              <p className="text-gray-500 text-xs md:text-sm truncate">{user?.email}</p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2 md:mt-3">
                <span className="inline-block px-2.5 py-1 bg-green-100 text-green-600 text-xs md:text-sm rounded-full font-medium">
                  Eleve
                </span>
                {profile?.gender && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs md:text-sm rounded-full font-medium ${
                    profile.gender === 'male'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-pink-100 text-pink-600'
                  }`}>
                    <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${
                      profile.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'
                    }`}></span>
                    {profile.gender === 'male' ? 'Homme' : 'Femme'}
                  </span>
                )}
              </div>
            </div>

            {/* Info rapides */}
            <div className="space-y-3 md:space-y-4 pt-3 md:pt-4 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-gray-400 flex-shrink-0" />
                <span className="text-xs md:text-sm text-secondary truncate">{user?.email}</span>
              </div>
              {profile?.phone && (
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-gray-400 flex-shrink-0" />
                  <span className="text-xs md:text-sm text-secondary">{profile.phone}</span>
                </div>
              )}
              {profile?.city && (
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-gray-400 flex-shrink-0" />
                  <span className="text-xs md:text-sm text-secondary">
                    {profile.city}{profile.country ? `, ${profile.country}` : ''}
                  </span>
                </div>
              )}
              {profile?.date_of_birth && (
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-gray-400 flex-shrink-0" />
                  <span className="text-xs md:text-sm text-secondary">
                    {format(parseISO(profile.date_of_birth), 'd MMMM yyyy', { locale: fr })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Mes inscriptions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 md:p-6 border-b border-gray-100">
              <h3 className="text-base md:text-lg font-semibold text-secondary">Mes inscriptions</h3>
            </div>
            <div className="p-4 md:p-6">
              {isLoading ? (
                <div className="animate-pulse space-y-3 md:space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="h-16 md:h-20 bg-gray-100 rounded-lg"></div>
                  ))}
                </div>
              ) : enrollments.length === 0 ? (
                <div className="text-center py-6 md:py-8">
                  <User size={40} className="text-gray-300 mx-auto mb-3 md:mb-4" />
                  <p className="text-gray-500 text-sm md:text-base">Aucune inscription</p>
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {enrollments.map((enrollment) => (
                    <div key={enrollment.id} className="p-3 border border-gray-100 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-secondary text-sm truncate">
                            {enrollment.class?.program?.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{enrollment.class?.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Inscrit le {format(parseISO(enrollment.enrolled_at), 'd MMM yyyy', { locale: fr })}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${
                          enrollment.status === 'active' ? 'bg-green-100 text-green-600'
                          : enrollment.status === 'completed' ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                        }`}>
                          {enrollment.status === 'active' ? 'Actif' : enrollment.status === 'completed' ? 'Terminé' : 'Annulé'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Historique des niveaux */}
          {Object.keys(levelsHistory).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-4 md:p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <History size={20} className="text-gray-500" />
                  <h3 className="text-base md:text-lg font-semibold text-secondary">Historique des niveaux</h3>
                </div>
              </div>
              <div className="p-4 md:p-6">
                <div className="space-y-4">
                  {Object.entries(levelsHistory).map(([programId, levels]) => (
                    <div key={programId}>
                      <h4 className="font-medium text-secondary text-sm mb-2">{levels[0]?.program?.name}</h4>
                      <div className="space-y-2">
                        {levels.map((entry) => (
                          <div key={`${programId}-${entry.order_id}`} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="w-7 h-7 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                                {entry.level_number}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-secondary truncate">
                                  {entry.level?.name || `Niveau ${entry.level_number}`}
                                </p>
                                {entry.class && (
                                  <p className="text-xs text-gray-500 truncate">{entry.class.name}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <p className="text-xs font-medium text-secondary">
                                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(entry.amount)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {format(parseISO(entry.paid_at), 'd MMM yyyy', { locale: fr })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Informations detaillees */}
        <div className="lg:col-span-2 space-y-4">
          {/* Informations personnelles */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base md:text-lg font-semibold text-secondary">Informations personnelles</h3>
              {!editingInfo ? (
                <button onClick={openEditInfo} className="flex items-center gap-1.5 text-xs md:text-sm text-primary hover:underline">
                  <Pencil size={14} /> Modifier
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditingInfo(false)} disabled={isSavingInfo} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200">
                    <X size={13} /> Annuler
                  </button>
                  <button onClick={saveInfo} disabled={isSavingInfo} className="flex items-center gap-1 text-xs text-white bg-primary hover:bg-primary/90 px-3 py-1 rounded">
                    {isSavingInfo ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Sauvegarder
                  </button>
                </div>
              )}
            </div>
            <div className="p-4 md:p-6">
              {infoError && <p className="text-xs text-red-500 mb-4">{infoError}</p>}
              {!editingInfo ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Prénom</label>
                    <p className="text-secondary text-sm md:text-base">{profile?.first_name || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Nom</label>
                    <p className="text-secondary text-sm md:text-base">{profile?.last_name || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Email</label>
                    <p className="text-secondary text-sm md:text-base truncate">{user?.email || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Téléphone</label>
                    <p className="text-secondary text-sm md:text-base">{profile?.phone || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Genre</label>
                    <p className="text-secondary text-sm md:text-base">
                      {profile?.gender === 'male' ? 'Homme' : profile?.gender === 'female' ? 'Femme' : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Date de naissance</label>
                    <p className="text-secondary text-sm md:text-base">
                      {profile?.date_of_birth ? format(parseISO(profile.date_of_birth), 'd MMMM yyyy', { locale: fr }) : '-'}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Contact d&apos;urgence</label>
                    <p className="text-secondary text-sm md:text-base">{profile?.emergency_contact || '-'}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Prénom <span className="text-red-400">*</span></label>
                    <input type="text" value={infoForm.first_name} onChange={e => setInfoForm(p => ({ ...p, first_name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-secondary focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Nom <span className="text-red-400">*</span></label>
                    <input type="text" value={infoForm.last_name} onChange={e => setInfoForm(p => ({ ...p, last_name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-secondary focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Email <span className="text-red-400">*</span></label>
                    <input type="email" value={infoForm.email} onChange={e => setInfoForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-secondary focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Téléphone</label>
                    <input type="tel" value={infoForm.phone || ''} onChange={e => setInfoForm(p => ({ ...p, phone: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-secondary focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Genre</label>
                    <select value={infoForm.gender || ''} onChange={e => setInfoForm(p => ({ ...p, gender: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-secondary focus:outline-none focus:border-primary bg-white">
                      <option value="">—</option>
                      <option value="male">Homme</option>
                      <option value="female">Femme</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Date de naissance</label>
                    <input type="date" value={infoForm.date_of_birth || ''} onChange={e => setInfoForm(p => ({ ...p, date_of_birth: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-secondary focus:outline-none focus:border-primary" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Contact d&apos;urgence</label>
                    <input type="text" value={infoForm.emergency_contact || ''} onChange={e => setInfoForm(p => ({ ...p, emergency_contact: e.target.value }))}
                      placeholder="Nom et téléphone d'un proche"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-secondary focus:outline-none focus:border-primary" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Adresse */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base md:text-lg font-semibold text-secondary">Adresse</h3>
              {!editingAddress ? (
                <button onClick={openEditAddress} className="flex items-center gap-1.5 text-xs md:text-sm text-primary hover:underline">
                  <Pencil size={14} /> Modifier
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditingAddress(false)} disabled={isSavingAddress} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200">
                    <X size={13} /> Annuler
                  </button>
                  <button onClick={saveAddress} disabled={isSavingAddress} className="flex items-center gap-1 text-xs text-white bg-primary hover:bg-primary/90 px-3 py-1 rounded">
                    {isSavingAddress ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Sauvegarder
                  </button>
                </div>
              )}
            </div>
            <div className="p-4 md:p-6">
              {addressError && <p className="text-xs text-red-500 mb-4">{addressError}</p>}
              {!editingAddress ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="sm:col-span-2">
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Adresse</label>
                    <p className="text-secondary text-sm md:text-base">{profile?.address || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Ville</label>
                    <p className="text-secondary text-sm md:text-base">{profile?.city || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Pays</label>
                    <p className="text-secondary text-sm md:text-base">{profile?.country || '-'}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="sm:col-span-2">
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Adresse</label>
                    <input type="text" value={infoForm.address || ''} onChange={e => setInfoForm(p => ({ ...p, address: e.target.value }))}
                      placeholder="12 rue des Lilas"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-secondary focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Ville</label>
                    <input type="text" value={infoForm.city || ''} onChange={e => setInfoForm(p => ({ ...p, city: e.target.value }))}
                      placeholder="Paris"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-secondary focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-500 mb-1">Pays</label>
                    <input type="text" value={infoForm.country || ''} onChange={e => setInfoForm(p => ({ ...p, country: e.target.value }))}
                      placeholder="France"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-secondary focus:outline-none focus:border-primary" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Réinscriptions disponibles */}
          {availableReinscriptions.length > 0 && (
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
              <div className="p-4 md:p-6 border-b border-primary/10">
                <div className="flex items-center gap-3">
                  <TrendingUp size={20} className="text-primary" />
                  <h3 className="text-base md:text-lg font-semibold text-secondary">
                    Niveaux disponibles
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Continuez votre progression avec ces niveaux
                </p>
              </div>
              <div className="p-4 md:p-6">
                <div className="space-y-3 md:space-y-4">
                  {availableReinscriptions.map((reinscription) => (
                    <div
                      key={`${reinscription.program.id}-${reinscription.level.id}`}
                      className="bg-white p-3 md:p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-secondary text-sm md:text-base truncate">
                            {reinscription.program.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Niveau {reinscription.current_level} → Niveau {reinscription.level.level_number}
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium flex-shrink-0">
                          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(reinscription.level.price)}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-gray-600 mb-3 line-clamp-2">
                        {reinscription.level.name}
                      </p>
                      <div className="flex items-center justify-between">
                        {reinscription.level.max_installments > 1 && (
                          <span className="text-xs text-gray-500">
                            Paiement en {reinscription.level.max_installments}× possible
                          </span>
                        )}
                        <button
                          onClick={() => router.push(`/student/reinscription/${reinscription.program.id}/${reinscription.level.id}`)}
                          className="ml-auto px-3 py-1.5 bg-primary text-white text-xs md:text-sm rounded-lg hover:bg-primary/90 active:bg-primary/80 transition-colors"
                        >
                          S'inscrire
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Suivi de mes paiements */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-4 md:p-6 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CreditCard size={20} className="text-gray-500 flex-shrink-0" />
                    <div>
                      <h3 className="text-base md:text-lg font-semibold text-secondary">Suivi de mes paiements</h3>
                      <p className="text-sm text-gray-600 mt-0.5">Historique de toutes vos commandes et paiements</p>
                    </div>
                  </div>
                  {paymentHistory.length > 0 && (
                    <button
                      onClick={handleStripePortal}
                      disabled={isLoadingPortal}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/5 active:bg-primary/10 transition-colors disabled:opacity-50"
                    >
                      {isLoadingPortal ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CreditCard size={14} />
                      )}
                      Gérer ma carte
                    </button>
                  )}
                </div>
              </div>
              <div className="p-4 md:p-6 space-y-6">
                {paymentHistory.map((order) => {
                  const statusConfig: Record<string, { label: string; className: string }> = {
                    paid:      { label: 'Payée',     className: 'bg-green-100 text-green-700' },
                    partial:   { label: 'Partielle', className: 'bg-blue-100 text-blue-700' },
                    pending:   { label: 'En attente',className: 'bg-yellow-100 text-yellow-700' },
                    failed:    { label: 'Échouée',   className: 'bg-red-100 text-red-700' },
                    refunded:  { label: 'Remboursée',className: 'bg-gray-100 text-gray-700' },
                    cancelled: { label: 'Annulée',   className: 'bg-gray-100 text-gray-500' },
                  };
                  const s = statusConfig[order.status] ?? { label: order.status, className: 'bg-gray-100 text-gray-600' };
                  return (
                    <div key={order.id} className="border border-gray-100 rounded-xl overflow-hidden">
                      {/* En-tête commande */}
                      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <div>
                          <p className="font-semibold text-secondary text-sm md:text-base">{order.program_name}</p>
                          {order.level_name && (
                            <p className="text-xs text-gray-500">{order.level_name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-secondary text-sm md:text-base">
                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(order.total_amount)}
                          </span>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.className}`}>{s.label}</span>
                        </div>
                      </div>

                      {/* Timeline des paiements */}
                      <div className="px-4 py-3 space-y-2">
                        {order.payments.map((payment) => {
                          const isRecovered = payment.is_recovered;
                          const paymentStatus: Record<string, { label: string; dot: string; text: string }> = {
                            succeeded: { label: 'Payé',       dot: 'bg-green-500',  text: 'text-green-700' },
                            scheduled: { label: 'Planifié',   dot: 'bg-yellow-400', text: 'text-yellow-700' },
                            failed:    { label: isRecovered ? 'Régularisé' : 'Échoué', dot: isRecovered ? 'bg-orange-400' : 'bg-red-500', text: isRecovered ? 'text-orange-700' : 'text-red-700' },
                            refunded:  { label: 'Remboursé',  dot: 'bg-gray-400',   text: 'text-gray-600' },
                          };
                          const ps = paymentStatus[payment.status] ?? { label: payment.status, dot: 'bg-gray-400', text: 'text-gray-600' };
                          return (
                            <div key={payment.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                              <div className="flex items-center gap-2 md:gap-3">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ps.dot}`} />
                                <div>
                                  <p className="text-xs md:text-sm text-secondary">
                                    Paiement {payment.installment_number}/{order.installments_count}
                                  </p>
                                  {payment.paid_at && (
                                    <p className="text-xs text-gray-400">
                                      {format(parseISO(payment.paid_at), 'd MMM yyyy', { locale: fr })}
                                    </p>
                                  )}
                                  {payment.status === 'scheduled' && payment.scheduled_at && (
                                    <p className="text-xs text-gray-400">
                                      Prévu le {format(parseISO(payment.scheduled_at), 'd MMM yyyy', { locale: fr })}
                                    </p>
                                  )}
                                  {payment.status === 'failed' && payment.error_message && !isRecovered && (
                                    <p className="text-xs text-red-500 mt-0.5">{payment.error_message}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-2">
                                <p className="text-xs md:text-sm font-medium text-secondary">
                                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(payment.amount)}
                                </p>
                                <p className={`text-xs font-medium ${ps.text}`}>{ps.label}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
          </div>

          {/* Note informative */}
          <div className="bg-blue-50 rounded-xl p-4 md:p-6">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 text-sm md:text-base">Besoin d&apos;aide ?</h4>
                <p className="text-xs md:text-sm text-blue-700 mt-1">
                  Pour toute question concernant votre compte, contactez l&apos;administration via la messagerie.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
