<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\LibraryFolder;
use App\Models\LibraryItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Validation\Rule;

class StudentLibraryController extends Controller
{
    private const PER_PAGE = 12;

    /**
     * Dossiers d'une catégorie visibles par l'élève.
     *
     * Tout passe par scopeVisibleToStudent : publié, et ciblant une classe où
     * l'élève est inscrit au niveau requis (ou public).
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category' => ['required', Rule::in([LibraryFolder::CATEGORY_MEDIA, LibraryFolder::CATEGORY_RESOURCE])],
        ], [
            'category.required' => 'La catégorie est obligatoire.',
            'category.in' => 'La catégorie demandée est invalide.',
        ]);

        $folders = LibraryFolder::query()
            // Le select précède withCount : l'inverse ne marche pas, withCount force
            // library_folders.* et les colonnes passées à get() sont alors ignorées.
            // Les règles d'accès restent hors du payload : elles nomment d'autres
            // classes et d'autres niveaux que ceux de l'élève.
            ->select(['library_folders.id', 'library_folders.category', 'library_folders.title', 'library_folders.created_at'])
            ->visibleToStudent($request->user()->id)
            ->category($validated['category'])
            ->withCount('items')
            // Un dossier publié mais vide n'ouvrirait qu'une page blanche
            ->whereHas('items')
            ->orderBy('library_folders.created_at')
            ->orderBy('library_folders.id')
            ->get();

        return response()->json([
            'folders' => $folders,
        ]);
    }

    /**
     * Contenus d'un dossier, si l'élève y a accès.
     *
     * Un dossier non visible répond 404 et non 403 : distinguer les deux
     * permettrait d'énumérer la bibliothèque, brouillons compris.
     */
    public function items(Request $request, LibraryFolder $folder): JsonResponse
    {
        $request->validate(['per_page' => 'nullable|integer|min:1|max:50']);

        $visible = LibraryFolder::query()
            ->whereKey($folder->id)
            ->visibleToStudent($request->user()->id)
            ->exists();

        if (! $visible) {
            return response()->json([
                'message' => 'Dossier introuvable.',
            ], 404);
        }

        $perPage = max(1, min(50, (int) $request->input('per_page', self::PER_PAGE)));

        /** @var LengthAwarePaginator $items */
        $items = $folder->items()->paginate($perPage);

        // file_path ne sort jamais côté élève : le chemin, combiné au CDN, court-circuiterait
        // le contrôle d'accès du téléchargement.
        $items->through(fn (LibraryItem $item) => $item->makeHidden(['file_path', 'created_by']));

        return response()->json([
            'items' => $items,
            'folder' => $folder->only(['id', 'category', 'title']),
        ]);
    }
}
