<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\LibraryFolderRequest;
use App\Models\LibraryFolder;
use App\Services\LibraryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use InvalidArgumentException;

class LibraryFolderController extends Controller
{
    public function __construct(
        private LibraryService $library,
    ) {}

    /**
     * Dossiers d'une catégorie, avec leur nombre d'items et leurs règles d'accès.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category' => ['required', Rule::in([LibraryFolder::CATEGORY_MEDIA, LibraryFolder::CATEGORY_RESOURCE])],
            'search' => 'nullable|string|max:255',
        ], [
            'category.required' => 'La catégorie est obligatoire.',
            'category.in' => 'La catégorie doit être « media » ou « resource ».',
        ]);

        $folders = LibraryFolder::category($validated['category'])
            ->with(['accesses.class:id,name,academic_year'])
            ->withCount('items')
            ->when(
                $validated['search'] ?? null,
                // % et _ sont échappés : sans cela, une recherche sur « % » renvoie tout
                fn ($q, $search) => $q->where('title', 'like', '%'.addcslashes($search, '%_\\').'%'),
            )
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'folders' => $folders,
        ]);
    }

    public function show(LibraryFolder $folder): JsonResponse
    {
        return response()->json([
            'folder' => $folder->load(['accesses.class:id,name,academic_year'])->loadCount('items'),
        ]);
    }

    /**
     * Classes et niveaux réellement activés, pour le ciblage d'accès.
     */
    public function accessOptions(): JsonResponse
    {
        return response()->json([
            'options' => $this->library->accessOptions(),
        ]);
    }

    public function store(LibraryFolderRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $folder = DB::transaction(function () use ($validated, $request): LibraryFolder {
                $folder = LibraryFolder::create([
                    'category' => $validated['category'],
                    'title' => $validated['title'],
                    // Un dossier naît toujours en brouillon : la publication est un geste explicite
                    'status' => LibraryFolder::STATUS_DRAFT,
                    'is_public' => (bool) $validated['is_public'],
                    'created_by' => $request->user()->id,
                ]);

                $this->library->syncAccess(
                    $folder,
                    (bool) $validated['is_public'],
                    $validated['accesses'] ?? [],
                );

                return $folder;
            });
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Dossier créé avec succès.',
            'folder' => $folder->load(['accesses.class:id,name,academic_year'])->loadCount('items'),
        ], 201);
    }

    public function update(LibraryFolderRequest $request, LibraryFolder $folder): JsonResponse
    {
        $validated = $request->validated();

        try {
            DB::transaction(function () use ($validated, $folder): void {
                $folder->update(['title' => $validated['title']]);

                $this->library->syncAccess(
                    $folder,
                    (bool) $validated['is_public'],
                    $validated['accesses'] ?? [],
                );
            });
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Dossier mis à jour.',
            'folder' => $folder->fresh()->load(['accesses.class:id,name,academic_year'])->loadCount('items'),
        ]);
    }

    /**
     * Bascule brouillon <-> publié.
     *
     * Publier un dossier sans destinataire est refusé : il resterait invisible de tous.
     */
    public function updateStatus(Request $request, LibraryFolder $folder): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in([LibraryFolder::STATUS_DRAFT, LibraryFolder::STATUS_PUBLISHED])],
        ], [
            'status.required' => 'Le statut est obligatoire.',
            'status.in' => 'Le statut doit être « draft » ou « published ».',
        ]);

        if (
            $validated['status'] === LibraryFolder::STATUS_PUBLISHED
            && ! $folder->is_public
            && $folder->accesses()->doesntExist()
        ) {
            return response()->json([
                'message' => 'Ce dossier ne cible aucune classe : il ne serait visible de personne.',
            ], 422);
        }

        $folder->update(['status' => $validated['status']]);

        return response()->json([
            'message' => $validated['status'] === LibraryFolder::STATUS_PUBLISHED
                ? 'Dossier publié.'
                : 'Dossier repassé en brouillon.',
            'folder' => $folder->fresh()->load(['accesses.class:id,name,academic_year'])->loadCount('items'),
        ]);
    }

    public function destroy(LibraryFolder $folder): JsonResponse
    {
        $this->library->deleteFolder($folder);

        return response()->json([
            'message' => 'Dossier supprimé.',
        ]);
    }
}
