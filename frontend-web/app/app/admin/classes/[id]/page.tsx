'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Badge } from '@/components/ui';
import { classesApi } from '@/lib/api/classes';
import { ClassModel } from '@/lib/types';
import { Calendar, Users, BookOpen, AlertCircle } from 'lucide-react';

export default function ClassDetailPage() {
  const router = useRouter();
  const params = useParams();
  const classId = Number(params.id);

  const [classData, setClassData] = useState<ClassModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadClass();
  }, [classId]);

  const loadClass = async () => {
    try {
      setIsLoading(true);
      const data = await classesApi.getById(classId);
      setClassData(data);
    } catch (err) {
      console.error('Failed to load class:', err);
      setError('Impossible de charger les données de la classe.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSessions = async () => {
    if (!confirm('Voulez-vous générer automatiquement toutes les sessions pour cette classe ?')) {
      return;
    }

    try {
      setIsGenerating(true);
      setError('');
      setSuccess('');

      const result = await classesApi.generateSessions(classId);
      setSuccess(`${result.sessions.length} session(s) générée(s) avec succès !`);
      loadClass();
    } catch (err: any) {
      console.error('Failed to generate sessions:', err);
      setError(err.response?.data?.message || 'Erreur lors de la génération des sessions.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateSessions = async () => {
    if (!confirm('ATTENTION : Cela supprimera toutes les sessions futures et les recréera. Voulez-vous continuer ?')) {
      return;
    }

    try {
      setIsRegenerating(true);
      setError('');
      setSuccess('');

      const result = await classesApi.regenerateSessions(classId);
      setSuccess(`${result.sessions.length} session(s) régénérée(s) avec succès !`);
      loadClass();
    } catch (err: any) {
      console.error('Failed to regenerate sessions:', err);
      setError(err.response?.data?.message || 'Erreur lors de la régénération des sessions.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'info' | 'warning' | 'neutral' | 'error'> = {
      planned: 'info',
      ongoing: 'success',
      completed: 'neutral',
      cancelled: 'error',
    };
    const labels: Record<string, string> = {
      planned: 'Planifiée',
      ongoing: 'En cours',
      completed: 'Terminée',
      cancelled: 'Annulée',
    };
    return <Badge variant={variants[status] || 'neutral'}>{labels[status] || status}</Badge>;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="p-8">
        <Card>
          <div className="p-12 text-center text-gray-500">
            Classe introuvable
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="font-playfair text-4xl font-semibold text-secondary mb-2">
            {classData.name}
          </h1>
          <p className="text-gray-600">
            {classData.program?.name} - {classData.academic_year}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/classes/${classId}/edit`}>
            <Button variant="outline">Modifier</Button>
          </Link>
          <Button variant="outline" onClick={() => router.push('/admin/classes')}>
            Retour
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg flex items-start gap-3">
          <AlertCircle className="text-error mt-0.5" size={20} />
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-success/10 border border-success rounded-lg">
          <p className="text-success text-sm">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche - Informations principales */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations générales */}
          <Card>
            <div className="p-6">
              <h2 className="font-playfair text-2xl font-semibold text-secondary mb-6">
                Informations générales
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Statut */}
                <div>
                  <p className="text-sm text-gray-500 mb-2">Statut</p>
                  {getStatusBadge(classData.status)}
                </div>

                {/* Année académique */}
                <div>
                  <p className="text-sm text-gray-500 mb-2">Année académique</p>
                  <p className="font-medium text-secondary">{classData.academic_year}</p>
                </div>

                {/* Date de début */}
                <div>
                  <p className="text-sm text-gray-500 mb-2">Date de début</p>
                  <p className="font-medium text-secondary">{formatDate(classData.start_date)}</p>
                </div>

                {/* Date de fin */}
                <div>
                  <p className="text-sm text-gray-500 mb-2">Date de fin</p>
                  <p className="font-medium text-secondary">{formatDate(classData.end_date)}</p>
                </div>

                {/* Capacité */}
                <div>
                  <p className="text-sm text-gray-500 mb-2">Capacité maximale</p>
                  <p className="font-medium text-secondary">
                    {classData.max_students ? `${classData.max_students} élèves` : 'Illimitée'}
                  </p>
                </div>

                {/* Élèves inscrits */}
                <div>
                  <p className="text-sm text-gray-500 mb-2">Élèves inscrits</p>
                  <p className="font-medium text-secondary">
                    {classData.enrolled_students_count || 0} élève(s)
                  </p>
                </div>
              </div>

              {/* Barre de progression de la capacité */}
              {classData.max_students && classData.enrolled_students_count !== undefined && (
                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Taux de remplissage</span>
                    <span className="font-medium text-secondary">
                      {Math.round((classData.enrolled_students_count / classData.max_students) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-primary rounded-full h-3 transition-all duration-300"
                      style={{
                        width: `${Math.min((classData.enrolled_students_count / classData.max_students) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Programme */}
          {classData.program && (
            <Card>
              <div className="p-6">
                <h2 className="font-playfair text-2xl font-semibold text-secondary mb-6">
                  Programme associé
                </h2>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Nom du programme</p>
                    <p className="text-lg font-medium text-secondary">{classData.program.name}</p>
                  </div>

                  {classData.program.description && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Description</p>
                      <p className="text-gray-700">{classData.program.description}</p>
                    </div>
                  )}

                  {classData.program.subject && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Matière</p>
                      <p className="font-medium text-secondary">{classData.program.subject}</p>
                    </div>
                  )}

                  <div className="pt-4">
                    <Link href={`/admin/programs/${classData.program.id}`}>
                      <Button variant="outline" size="sm">
                        Voir le programme complet
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Colonne droite - Actions rapides */}
        <div className="space-y-6">
          {/* Génération de sessions */}
          <Card>
            <div className="p-6">
              <h3 className="font-playfair text-lg font-semibold text-secondary mb-4 flex items-center gap-2">
                <Calendar size={20} />
                Sessions
              </h3>

              <div className="space-y-3">
                <Button
                  onClick={handleGenerateSessions}
                  disabled={isGenerating || isRegenerating}
                  className="w-full"
                >
                  {isGenerating ? 'Génération...' : 'Générer les sessions'}
                </Button>

                <Button
                  onClick={handleRegenerateSessions}
                  disabled={isGenerating || isRegenerating}
                  variant="outline"
                  className="w-full"
                >
                  {isRegenerating ? 'Régénération...' : 'Régénérer les sessions'}
                </Button>

                <p className="text-xs text-gray-500 mt-2">
                  Les sessions seront créées automatiquement selon le planning du programme
                </p>
              </div>
            </div>
          </Card>

          {/* Élèves */}
          <Card>
            <div className="p-6">
              <h3 className="font-playfair text-lg font-semibold text-secondary mb-4 flex items-center gap-2">
                <Users size={20} />
                Élèves
              </h3>

              <div className="text-center py-4">
                <p className="text-3xl font-bold text-primary mb-2">
                  {classData.enrolled_students_count || 0}
                </p>
                <p className="text-sm text-gray-600 mb-4">élève(s) inscrit(s)</p>

                <Link href={`/admin/classes/${classId}/students`}>
                  <Button variant="secondary" size="sm" className="w-full">
                    Voir la liste
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Statistiques */}
          <Card>
            <div className="p-6">
              <h3 className="font-playfair text-lg font-semibold text-secondary mb-4 flex items-center gap-2">
                <BookOpen size={20} />
                Statistiques
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sessions totales</span>
                  <span className="font-medium text-secondary">
                    {classData.sessions?.length || 0}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Places restantes</span>
                  <span className="font-medium text-secondary">
                    {classData.max_students
                      ? `${classData.remaining_capacity || classData.max_students}`
                      : 'Illimité'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
