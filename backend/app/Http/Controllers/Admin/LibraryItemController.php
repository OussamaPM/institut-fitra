<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\LibraryItemRequest;
use App\Models\LibraryFolder;
use App\Models\LibraryItem;
use App\Services\LibraryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use InvalidArgumentException;

class LibraryItemController extends Controller
{
    /** Nombre d'items par page, aligné sur la pagination de l'écran admin. */
    private const PER_PAGE = 10;

    public function __construct(
        private LibraryService $library,
    ) {}

    public function index(Request $request, LibraryFolder $folder): JsonResponse
    {
        $request->validate(['per_page' => 'nullable|integer|min:1|max:100']);

        return response()->json([
            'items' => $folder->items()->paginate($this->perPage($request)),
            'folder' => $folder->load(['accesses.class:id,name,academic_year'])->loadCount('items'),
        ]);
    }

    /**
     * Taille de page demandée, bornée pour éviter qu'un per_page absurde ne fasse
     * tomber la requête.
     */
    private function perPage(Request $request): int
    {
        return max(1, min(100, (int) $request->input('per_page', self::PER_PAGE)));
    }

    public function store(LibraryItemRequest $request, LibraryFolder $folder): JsonResponse
    {
        try {
            $item = $this->library->createItem(
                $folder,
                [...$request->validated(), 'created_by' => $request->user()->id],
                $request->file('file'),
            );
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            // Erreur de stockage : le détail va aux logs, pas à l'écran de l'admin.
            Log::error('Library item upload failed: '.$e->getMessage(), [
                'folder_id' => $folder->id,
                'exception' => $e::class,
            ]);

            return response()->json([
                'message' => 'Le fichier n\'a pas pu être enregistré. Réessayez ou contactez un administrateur.',
            ], 500);
        }

        return response()->json([
            'message' => 'Contenu ajouté.',
            'item' => $item,
        ], 201);
    }

    /**
     * Édition du titre et, pour un média, du lien.
     *
     * Le fichier d'un document ne se remplace pas ici : on supprime et on réajoute,
     * ce qui évite de laisser un fichier orphelin sur Spaces.
     */
    public function update(LibraryItemRequest $request, LibraryItem $item): JsonResponse
    {
        $validated = $request->validated();
        $isMedia = $item->folder->category === LibraryFolder::CATEGORY_MEDIA;

        $changes = ['title' => $validated['title']];

        if ($isMedia) {
            // Le lien n'est remplacé que s'il est fourni : renommer un contenu ne
            // doit pas obliger le front à renvoyer l'URL existante.
            if (array_key_exists('embed_url', $validated)) {
                $changes['embed_url'] = $validated['embed_url'];
            }

            // Le type reste dérivé de la catégorie du dossier, mais l'admin peut
            // corriger vidéo <-> audio, ce qui était validé puis ignoré jusqu'ici.
            if (! empty($validated['type'])) {
                $changes['type'] = $validated['type'] === LibraryItem::TYPE_AUDIO
                    ? LibraryItem::TYPE_AUDIO
                    : LibraryItem::TYPE_VIDEO;
            }
        }

        $item->update($changes);

        return response()->json([
            'message' => 'Contenu mis à jour.',
            'item' => $item->fresh(),
        ]);
    }

    /**
     * Monte ou descend un item d'un cran.
     *
     * Renvoie systématiquement la page demandée : le front réaffiche la liste telle
     * qu'elle est réellement ordonnée plutôt que de deviner le résultat de l'échange.
     */
    public function move(Request $request, LibraryItem $item): JsonResponse
    {
        $validated = $request->validate([
            'direction' => ['required', Rule::in(['up', 'down'])],
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ], [
            'direction.required' => 'La direction du déplacement est obligatoire.',
            'direction.in' => 'La direction doit être « up » ou « down ».',
        ]);

        $moved = $this->library->move($item, $validated['direction']);

        $perPage = $this->perPage($request);
        $total = $item->folder->items()->count();
        $lastPage = max(1, (int) ceil($total / $perPage));

        // Un déplacement peut vider la dernière page (l'item bascule sur la
        // précédente) : on ramène l'admin sur une page qui existe encore.
        $page = min(max(1, (int) ($validated['page'] ?? 1)), $lastPage);

        return response()->json([
            'moved' => $moved,
            'item' => $item,
            'items' => $item->folder->items()->paginate($perPage, ['*'], 'page', $page),
        ]);
    }

    public function destroy(LibraryItem $item): JsonResponse
    {
        $this->library->deleteItem($item);

        return response()->json([
            'message' => 'Contenu supprimé.',
        ]);
    }
}
