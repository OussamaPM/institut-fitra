<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Session;
use App\Models\SessionMaterial;
use App\Services\ImageOptimizerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class SessionMaterialController extends Controller
{
    public function __construct(private ImageOptimizerService $imageOptimizer) {}

    /**
     * Liste tous les supports (pour admin/teacher)
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $query = SessionMaterial::with(['session.class.program', 'uploader'])
                ->orderBy('uploaded_at', 'desc');

            // Teachers see only their session materials
            if ($user->role === 'teacher') {
                $query->whereHas('session', function ($q) use ($user): void {
                    $q->where('teacher_id', $user->id);
                });
            }
            // Admins see all

            $perPage = $request->input('per_page', 20);
            $materials = $query->paginate($perPage);

            return response()->json([
                'materials' => $materials,
            ], 200);

        } catch (\Exception $e) {
            Log::error('SessionMaterial index error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération des supports.',
            ], 500);
        }
    }

    /**
     * Liste les supports pour un élève (ses classes uniquement, sessions avec fichiers)
     */
    public function studentIndex(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $materials = SessionMaterial::with(['session.class.program', 'uploader'])
                ->whereHas('session.class.enrollments', function ($q) use ($user): void {
                    $q->where('student_id', $user->id)
                        ->where('status', 'active');
                })
                ->orderBy('uploaded_at', 'desc')
                ->get();

            return response()->json([
                'materials' => $materials,
            ], 200);

        } catch (\Exception $e) {
            Log::error('SessionMaterial studentIndex error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération des supports.',
            ], 500);
        }
    }

    /**
     * Upload un fichier sur une session
     */
    public function store(Request $request, Session $session): JsonResponse
    {
        try {
            $user = $request->user();

            Log::info('SessionMaterial store - Starting upload', [
                'session_id' => $session->id,
                'user_id' => $user->id,
                'has_file' => $request->hasFile('file'),
                'title' => $request->input('title'),
            ]);

            // Vérifier les autorisations (teacher owner ou admin)
            if ($user->role === 'teacher' && $session->teacher_id !== $user->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à ajouter des supports à cette session.',
                ], 403);
            }

            // Validation basique
            if (! $request->hasFile('file')) {
                return response()->json([
                    'message' => 'Aucun fichier reçu.',
                    'errors' => ['file' => ['Le fichier est requis.']],
                ], 422);
            }

            if (! $request->input('title')) {
                return response()->json([
                    'message' => 'Le titre est requis.',
                    'errors' => ['title' => ['Le titre est requis.']],
                ], 422);
            }

            $file = $request->file('file');

            Log::info('SessionMaterial store - File info', [
                'original_name' => $file->getClientOriginalName(),
                'extension' => $file->getClientOriginalExtension(),
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
                'is_valid' => $file->isValid(),
                'error' => $file->getError(),
            ]);

            if (! $file->isValid()) {
                return response()->json([
                    'message' => 'Fichier invalide ou corrompu.',
                    'errors' => ['file' => ['Le fichier n\'a pas pu être uploadé. Code erreur: '.$file->getError()]],
                ], 422);
            }

            $extension = strtolower($file->getClientOriginalExtension());

            // Extensions autorisées (PDF, images, documents Office)
            $allowedExtensions = [
                'pdf',
                'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg',
                'doc', 'docx', 'odt',
                'ppt', 'pptx', 'odp',
                'xls', 'xlsx', 'ods',
                'txt', 'rtf',
            ];

            if (! in_array($extension, $allowedExtensions)) {
                return response()->json([
                    'message' => 'Type de fichier non autorisé.',
                    'errors' => ['file' => ['Extension .'.$extension.' non autorisée. Extensions acceptées : '.implode(', ', $allowedExtensions)]],
                ], 422);
            }

            // Déterminer le type de fichier
            $fileType = match (true) {
                $extension === 'pdf' => 'pdf',
                in_array($extension, ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']) => 'image',
                in_array($extension, ['doc', 'docx', 'odt', 'txt', 'rtf']) => 'document',
                in_array($extension, ['ppt', 'pptx', 'odp']) => 'document',
                in_array($extension, ['xls', 'xlsx', 'ods']) => 'document',
                default => 'other',
            };

            // Stocker le fichier
            $path = $this->imageOptimizer->uploadFile($file, 'session-materials/'.$session->id);

            if (! $path) {
                Log::error('SessionMaterial store - Failed to store file');

                return response()->json([
                    'message' => 'Erreur lors du stockage du fichier.',
                ], 500);
            }

            Log::info('SessionMaterial store - File stored', ['path' => $path]);

            $material = SessionMaterial::create([
                'session_id' => $session->id,
                'title' => $request->input('title'),
                'file_path' => $path,
                'file_type' => $fileType,
                'file_size' => $file->getSize(),
                'uploaded_by' => $user->id,
                'uploaded_at' => now(),
            ]);

            $material->load(['session.class.program', 'uploader']);

            Log::info('SessionMaterial store - Success', ['material_id' => $material->id]);

            return response()->json([
                'message' => 'Support ajouté avec succès.',
                'material' => $material,
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('SessionMaterial store - Validation error', ['errors' => $e->errors()]);

            return response()->json([
                'message' => 'Erreur de validation.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('SessionMaterial store error: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Erreur lors de l\'upload du fichier: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Récupérer les supports d'une session spécifique
     */
    public function sessionMaterials(Request $request, Session $session): JsonResponse
    {
        try {
            $user = $request->user();

            // Vérifier les autorisations
            if ($user->role === 'student') {
                $enrolled = $session->class->enrollments()
                    ->where('student_id', $user->id)
                    ->where('status', 'active')
                    ->exists();

                if (! $enrolled) {
                    return response()->json([
                        'message' => 'Vous n\'êtes pas inscrit à cette classe.',
                    ], 403);
                }
            } elseif ($user->role === 'teacher' && $session->teacher_id !== $user->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à voir les supports de cette session.',
                ], 403);
            }

            $materials = $session->materials()->with('uploader')->get();

            return response()->json([
                'materials' => $materials,
            ], 200);

        } catch (\Exception $e) {
            Log::error('SessionMaterial sessionMaterials error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la récupération des supports.',
            ], 500);
        }
    }

    /**
     * Télécharger un fichier (redirige vers l'URL CDN Spaces)
     */
    public function download(Request $request, SessionMaterial $material): RedirectResponse|JsonResponse
    {
        try {
            $user = $request->user();
            $session = $material->session;

            // Vérifier les autorisations
            if ($user->role === 'student') {
                $enrolled = $session->class->enrollments()
                    ->where('student_id', $user->id)
                    ->where('status', 'active')
                    ->exists();

                if (! $enrolled) {
                    return response()->json([
                        'message' => 'Vous n\'êtes pas inscrit à cette classe.',
                    ], 403);
                }
            } elseif ($user->role === 'teacher' && $session->teacher_id !== $user->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à télécharger ce fichier.',
                ], 403);
            }

            if (! Storage::disk('spaces')->exists($material->file_path)) {
                return response()->json([
                    'message' => 'Fichier non trouvé.',
                ], 404);
            }

            return redirect($this->imageOptimizer->url($material->file_path));

        } catch (\Exception $e) {
            Log::error('SessionMaterial download error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors du téléchargement du fichier.',
            ], 500);
        }
    }

    /**
     * Supprimer un support
     */
    public function destroy(Request $request, SessionMaterial $material): JsonResponse
    {
        try {
            $user = $request->user();
            $session = $material->session;

            // Vérifier les autorisations (uploader, session teacher ou admin)
            if ($user->role !== 'admin' && $material->uploaded_by !== $user->id && $session->teacher_id !== $user->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à supprimer ce support.',
                ], 403);
            }

            // Supprimer le fichier du storage
            $this->imageOptimizer->delete($material->file_path);

            $material->delete();

            return response()->json([
                'message' => 'Support supprimé avec succès.',
            ], 200);

        } catch (\Exception $e) {
            Log::error('SessionMaterial destroy error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors de la suppression du support.',
            ], 500);
        }
    }
}
