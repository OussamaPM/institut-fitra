'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, Button, Input } from '@/components/ui';
import { usersApi, UpdateUserData } from '@/lib/api/users';
import { User, Gender } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const { user: currentUser } = useAuth();
  const userId = parseInt(params.id as string);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<UpdateUserData & { gender?: Gender }>({
    first_name: '',
    last_name: '',
    email: '',
    role: 'student',
    gender: undefined,
    phone: '',
    date_of_birth: '',
    address: '',
    city: '',
    country: '',
    emergency_contact: '',
    specialization: '',
    bio: '',
  });

  // Charger les données de l'utilisateur
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await usersApi.getById(userId);
        setUser(userData);

        // Remplir le formulaire avec les données existantes
        const profile = userData.student_profile || userData.teacher_profile;
        setFormData({
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          email: userData.email,
          role: userData.role,
          gender: userData.student_profile?.gender || userData.teacher_profile?.gender,
          phone: profile?.phone || '',
          date_of_birth: userData.student_profile?.date_of_birth || '',
          address: userData.student_profile?.address || '',
          city: userData.student_profile?.city || '',
          country: userData.student_profile?.country || '',
          emergency_contact: userData.student_profile?.emergency_contact || '',
          specialization: userData.teacher_profile?.specialization || '',
          bio: userData.teacher_profile?.bio || '',
        });

        // Set existing profile photo preview
        const existingPhoto = userData.student_profile?.profile_photo || userData.teacher_profile?.profile_photo;
        if (existingPhoto) {
          setProfilePhotoPreview(`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/storage/${existingPhoto}`);
        }
      } catch (err: any) {
        console.error('Failed to fetch user:', err);
        setError('Impossible de charger les données de l\'utilisateur.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('La photo ne doit pas dépasser 2 Mo.');
        return;
      }
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setProfilePhoto(null);
    setProfilePhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.first_name || !formData.last_name || !formData.email) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (formData.role === 'student' && !formData.gender) {
      setError('Le genre est obligatoire pour les élèves.');
      return;
    }

    if ((formData.role === 'teacher' || formData.role === 'admin') && !formData.specialization) {
      setError('La spécialisation est requise pour les professeurs et administrateurs.');
      return;
    }

    setIsSaving(true);

    try {
      // Use FormData if there's a file to upload
      if (profilePhoto) {
        const formDataToSend = new FormData();
        formDataToSend.append('first_name', formData.first_name || '');
        formDataToSend.append('last_name', formData.last_name || '');
        formDataToSend.append('email', formData.email || '');
        formDataToSend.append('role', formData.role || 'student');
        if (formData.gender) formDataToSend.append('gender', formData.gender);
        formDataToSend.append('profile_photo', profilePhoto);
        if (formData.phone) formDataToSend.append('phone', formData.phone);
        if (formData.date_of_birth) formDataToSend.append('date_of_birth', formData.date_of_birth);
        if (formData.address) formDataToSend.append('address', formData.address);
        if (formData.city) formDataToSend.append('city', formData.city);
        if (formData.country) formDataToSend.append('country', formData.country);
        if (formData.emergency_contact) formDataToSend.append('emergency_contact', formData.emergency_contact);
        if (formData.specialization) formDataToSend.append('specialization', formData.specialization);
        if (formData.bio) formDataToSend.append('bio', formData.bio);

        await usersApi.update(userId, formDataToSend);
      } else {
        // Préparer les données à envoyer
        const dataToSend: Record<string, string> = {
          first_name: formData.first_name || '',
          last_name: formData.last_name || '',
          email: formData.email || '',
          role: formData.role || 'student',
        };

        // Ajouter les champs optionnels seulement s'ils sont remplis
        if (formData.gender) dataToSend.gender = formData.gender;
        if (formData.phone) dataToSend.phone = formData.phone;
        if (formData.date_of_birth) dataToSend.date_of_birth = formData.date_of_birth;
        if (formData.address) dataToSend.address = formData.address;
        if (formData.city) dataToSend.city = formData.city;
        if (formData.country) dataToSend.country = formData.country;
        if (formData.emergency_contact) dataToSend.emergency_contact = formData.emergency_contact;
        if (formData.specialization) dataToSend.specialization = formData.specialization;
        if (formData.bio) dataToSend.bio = formData.bio;

        await usersApi.update(userId, dataToSend as UpdateUserData);
      }
      router.push('/admin/users');
    } catch (err: unknown) {
      console.error('Failed to update user:', err);
      const errorMessage = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      setError(errorMessage || 'Impossible de mettre à jour l\'utilisateur.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8">
        <div className="bg-error/10 border border-error rounded-lg p-4">
          <p className="text-error">Utilisateur introuvable.</p>
        </div>
      </div>
    );
  }

  const isEditingSelf = currentUser?.id === userId;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-primary hover:underline mb-4 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        <h1 className="font-playfair text-4xl font-semibold text-secondary mb-2">
          Modifier l'utilisateur
        </h1>
        <p className="text-gray-600">
          {user.student_profile?.first_name || user.teacher_profile?.first_name}{' '}
          {user.student_profile?.last_name || user.teacher_profile?.last_name} ({user.email})
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {isEditingSelf && (
        <div className="mb-6 p-4 bg-warning/10 border border-warning rounded-lg">
          <p className="text-warning text-sm">
            ⚠️ Vous modifiez votre propre compte. Soyez prudent lors de la modification de votre rôle ou email.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="font-playfair text-xl font-semibold text-secondary mb-4">
              Informations générales
            </h2>

            <div className="space-y-4">
              {/* Role */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-secondary mb-1">
                  Type de compte *
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="input w-full"
                  required
                  disabled={isSaving}
                >
                  <option value="student">Élève</option>
                  <option value="teacher">Professeur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>

              {/* Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Prénom *"
                  type="text"
                  name="first_name"
                  id="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Jean"
                  required
                  disabled={isSaving}
                />

                <Input
                  label="Nom *"
                  type="text"
                  name="last_name"
                  id="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Dupont"
                  required
                  disabled={isSaving}
                />
              </div>

              {/* Email */}
              <Input
                label="Adresse email *"
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                required
                disabled={isSaving}
              />


              {/* Phone */}
              <Input
                label="Téléphone"
                type="tel"
                name="phone"
                id="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+33 6 12 34 56 78"
                disabled={isSaving}
              />
            </div>
          </div>
        </Card>

        {/* Student-specific fields */}
        {formData.role === 'student' && (
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="font-playfair text-xl font-semibold text-secondary mb-4">
                Informations élève
              </h2>

              <div className="space-y-4">
                {/* Gender */}
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-secondary mb-1">
                    Genre *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender || ''}
                    onChange={handleChange}
                    className="input w-full"
                    required
                    disabled={isSaving}
                  >
                    <option value="">Sélectionner le genre</option>
                    <option value="male">Homme</option>
                    <option value="female">Femme</option>
                  </select>
                </div>

                {/* Profile Photo */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Photo de profil
                  </label>
                  <div className="flex items-center gap-4">
                    {profilePhotoPreview ? (
                      <div className="relative">
                        <img
                          src={profilePhotoPreview}
                          alt="Preview"
                          className="w-20 h-20 rounded-full object-cover border-2 border-primary/20"
                        />
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="absolute -top-2 -right-2 bg-error text-white rounded-full p-1 hover:bg-error/80"
                          disabled={isSaving}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="profile_photo"
                        disabled={isSaving}
                      />
                      <label
                        htmlFor="profile_photo"
                        className="cursor-pointer inline-flex items-center px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {user?.student_profile?.profile_photo ? 'Changer la photo' : 'Choisir une photo'}
                      </label>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG ou GIF. Max 2 Mo.</p>
                    </div>
                  </div>
                </div>

                <Input
                  label="Date de naissance"
                  type="date"
                  name="date_of_birth"
                  id="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  disabled={isSaving}
                />

                <Input
                  label="Adresse"
                  type="text"
                  name="address"
                  id="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Rue de la Paix"
                  disabled={isSaving}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Ville"
                    type="text"
                    name="city"
                    id="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Paris"
                    disabled={isSaving}
                  />

                  <Input
                    label="Pays"
                    type="text"
                    name="country"
                    id="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="France"
                    disabled={isSaving}
                  />
                </div>

                <Input
                  label="Contact d'urgence"
                  type="text"
                  name="emergency_contact"
                  id="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={handleChange}
                  placeholder="Nom et téléphone du contact d'urgence"
                  disabled={isSaving}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Teacher/Admin-specific fields */}
        {(formData.role === 'teacher' || formData.role === 'admin') && (
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="font-playfair text-xl font-semibold text-secondary mb-4">
                Informations professionnelles
              </h2>

              <div className="space-y-4">
                {/* Gender */}
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-secondary mb-1">
                    Genre
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender || ''}
                    onChange={handleChange}
                    className="input w-full"
                    disabled={isSaving}
                  >
                    <option value="">Sélectionner le genre</option>
                    <option value="male">Homme</option>
                    <option value="female">Femme</option>
                  </select>
                </div>

                {/* Profile Photo */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Photo de profil
                  </label>
                  <div className="flex items-center gap-4">
                    {profilePhotoPreview ? (
                      <div className="relative">
                        <img
                          src={profilePhotoPreview}
                          alt="Preview"
                          className={`w-20 h-20 rounded-full object-cover border-2 ${
                            formData.role === 'admin'
                              ? 'border-green-500'
                              : formData.gender === 'female'
                                ? 'border-pink-500'
                                : 'border-blue-500'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="absolute -top-2 -right-2 bg-error text-white rounded-full p-1 hover:bg-error/80"
                          disabled={isSaving}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className={`w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed ${
                        formData.role === 'admin'
                          ? 'border-green-300'
                          : formData.gender === 'female'
                            ? 'border-pink-300'
                            : 'border-blue-300'
                      }`}>
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="profile_photo"
                        disabled={isSaving}
                      />
                      <label
                        htmlFor="profile_photo"
                        className="cursor-pointer inline-flex items-center px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {user?.teacher_profile?.profile_photo ? 'Changer la photo' : 'Choisir une photo'}
                      </label>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG ou GIF. Max 2 Mo.</p>
                    </div>
                  </div>
                </div>

                <Input
                  label="Spécialisation *"
                  type="text"
                  name="specialization"
                  id="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  placeholder="ex: Mathématiques, Sciences Islamiques, Langue Arabe"
                  required
                  disabled={isSaving}
                />

                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-secondary mb-1">
                    Biographie
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Parlez-nous de votre expérience et de votre parcours..."
                    rows={4}
                    className="input w-full"
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSaving}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={isSaving} isLoading={isSaving}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
        </div>
      </form>
    </div>
  );
}
