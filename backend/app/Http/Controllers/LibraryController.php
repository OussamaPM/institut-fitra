<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\LibraryFolder;
use App\Models\LibraryItem;
use App\Services\ImageOptimizerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class LibraryController extends Controller
{
    /** Durée de validité du lien de téléchargement signé, en minutes. */
    private const DOWNLOAD_LINK_MINUTES = 5;

    public function __construct(
        private ImageOptimizerService $storage,
    ) {}

    /**
     * Sert un document de la bibliothèque via une URL signée et expirante.
     *
     * Deux précautions :
     *  - le contrôle d'accès précède TOUT autre test, y compris celui du type de
     *    contenu : répondre « ce n'est pas un document » sur un item interdit
     *    permettrait d'énumérer la bibliothèque, brouillons compris. Pour la même
     *    raison, un dossier non visible renvoie 404 et non 403 ;
     *  - le lien signé expire, là où une URL CDN publique resterait valable pour
     *    toujours et se partagerait hors de la classe et du niveau visés.
     *
     * Deux formes de réponse : JSON {url} pour un appel XHR — un <a href> ne peut pas
     * porter le jeton Sanctum, le client doit donc demander l'URL puis naviguer —
     * et redirection 302 pour un appel direct.
     *
     * Les professeurs sont volontairement traités comme des élèves : n'étant inscrits
     * à aucune classe, ils n'accèdent qu'aux dossiers publics. À revoir le jour où
     * l'espace professeur existera.
     */
    public function download(Request $request, LibraryItem $item): RedirectResponse|JsonResponse
    {
        try {
            $user = $request->user();

            if ($user->role !== 'admin') {
                $visible = LibraryFolder::query()
                    ->whereKey($item->library_folder_id)
                    ->visibleToStudent($user->id)
                    ->exists();

                if (! $visible) {
                    return response()->json([
                        'message' => 'Document introuvable.',
                    ], 404);
                }
            }

            if (! $item->file_path) {
                return response()->json([
                    'message' => 'Ce contenu n\'est pas un document téléchargeable.',
                ], 404);
            }

            if (! Storage::disk($this->storage->storageDisk())->exists($item->file_path)) {
                return response()->json([
                    'message' => 'Fichier non trouvé.',
                ], 404);
            }

            $url = $this->storage->temporaryUrl($item->file_path, self::DOWNLOAD_LINK_MINUTES);

            if ($request->expectsJson()) {
                return response()->json([
                    'url' => $url,
                    'original_name' => $item->original_name,
                ]);
            }

            return redirect($url);

        } catch (\Exception $e) {
            Log::error('Library download error: '.$e->getMessage());

            return response()->json([
                'message' => 'Erreur lors du téléchargement du fichier.',
            ], 500);
        }
    }
}
