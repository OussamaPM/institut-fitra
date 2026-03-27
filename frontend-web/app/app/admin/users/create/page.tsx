'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Input } from '@/components/ui';
import { usersApi, CreateUserData } from '@/lib/api/users';
import { Gender } from '@/lib/types';

export default function CreateUserPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<CreateUserData & { gender?: Gender }>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
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
        setError('La photo ne doit pas depasser 2 Mo.');
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
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.password) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres.');
      return;
    }

    if (formData.role === 'student' && !formData.gender) {
      setError('Le genre est obligatoire pour les eleves.');
      return;
    }

    if ((formData.role === 'teacher' || formData.role === 'admin') && !formData.specialization) {
      setError('La specialisation est requise pour les professeurs et administrateurs.');
      return;
    }

    setIsLoading(true);

    try {
      // Use FormData if there's a file to upload
      if (profilePhoto) {
        const formDataToSend = new FormData();
        formDataToSend.append('first_name', formData.first_name);
        formDataToSend.append('last_name', formData.last_name);
        formDataToSend.append('email', formData.email);
        formDataToSend.append('password', formData.password);
        formDataToSend.append('role', formData.role);
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

        await usersApi.create(formDataToSend);
      } else {
        // Preparer les donnees a envoyer (ne pas envoyer les champs vides)
        const dataToSend: Record<string, string> = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
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

        await usersApi.create(dataToSend as unknown as CreateUserData);
      }
      router.push('/admin/users');
    } catch (err: unknown) {
      console.error('Failed to create user:', err);
      const errorMessage = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      setError(errorMessage || 'Impossible de creer l\'utilisateur.');
    } finally {
      setIsLoading(false);
    }
  };

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
          Créer un utilisateur
        </h1>
        <p className="text-gray-600">
          Ajoutez un nouvel utilisateur à la plateforme
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg">
          <p className="text-error text-sm">{error}</p>
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                disabled={isLoading}
              />

              {/* Password */}
              <Input
                label="Mot de passe *"
                type="password"
                name="password"
                id="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                helperText="Au moins 8 caractères"
                required
                disabled={isLoading}
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
                disabled={isLoading}
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
                    disabled={isLoading}
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
                          disabled={isLoading}
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
                        disabled={isLoading}
                      />
                      <label
                        htmlFor="profile_photo"
                        className="cursor-pointer inline-flex items-center px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Choisir une photo
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
                  disabled={isLoading}
                />

                <Input
                  label="Adresse"
                  type="text"
                  name="address"
                  id="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Rue de la Paix"
                  disabled={isLoading}
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
                    disabled={isLoading}
                  />

                  <Input
                    label="Pays"
                    type="text"
                    name="country"
                    id="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="France"
                    disabled={isLoading}
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
                  disabled={isLoading}
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
                    disabled={isLoading}
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
                          disabled={isLoading}
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
                        disabled={isLoading}
                      />
                      <label
                        htmlFor="profile_photo"
                        className="cursor-pointer inline-flex items-center px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Choisir une photo
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
                  disabled={isLoading}
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
                    disabled={isLoading}
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
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={isLoading} isLoading={isLoading}>
            {isLoading ? 'Création...' : 'Créer l\'utilisateur'}
          </Button>
        </div>
      </form>
    </div>
  );
}
