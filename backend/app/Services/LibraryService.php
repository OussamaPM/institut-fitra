<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ClassModel;
use App\Models\LibraryFolder;
use App\Models\LibraryItem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class LibraryService
{
    /** Directions acceptées par move(). */
    private const DIRECTIONS = ['up', 'down'];

    public function __construct(
        private ImageOptimizerService $storage,
    ) {}

    /**
     * Remplace intégralement les règles d'accès d'un dossier.
     *
     * Les doublons sont écartés en amont (deux fois la même classe+niveau dans le
     * payload donnerait deux lignes identiques) ; l'index unique en base sert de
     * second filet.
     *
     * @param  array<int, array{class_id: int, level_number: int}>  $accesses
     *
     * @throws InvalidArgumentException si un dossier non public n'a aucun destinataire
     */
    public function syncAccess(LibraryFolder $folder, bool $isPublic, array $accesses): void
    {
        if (! $isPublic && $accesses === []) {
            throw new InvalidArgumentException(
                'Un dossier non public doit cibler au moins une classe.'
            );
        }

        DB::transaction(function () use ($folder, $isPublic, $accesses): void {
            $folder->update(['is_public' => $isPublic]);
            $folder->accesses()->delete();

            // Un dossier public n'a pas besoin de règles par classe : on les ignore
            // pour éviter des lignes fantômes si l'admin décoche « Tout » plus tard.
            if ($isPublic) {
                return;
            }

            $seen = [];

            foreach ($accesses as $access) {
                $classId = (int) $access['class_id'];
                $levelNumber = max(LibraryFolder::BASE_LEVEL, (int) ($access['level_number'] ?? LibraryFolder::BASE_LEVEL));
                $key = $classId.'|'.$levelNumber;

                if (isset($seen[$key])) {
                    continue;
                }

                $seen[$key] = true;

                $folder->accesses()->create([
                    'class_id' => $classId,
                    'level_number' => $levelNumber,
                ]);
            }
        });
    }

    /**
     * Extrait l'URL du player d'un champ saisi par l'admin.
     *
     * Accepte aussi bien l'URL seule que le code <iframe> complet copié depuis Bunny
     * ou Vimeo. Seule l'URL est conservée : aucun HTML fourni par l'admin n'est stocké,
     * donc aucun HTML ne peut être réinjecté au rendu.
     */
    public static function extractEmbedUrl(?string $input): ?string
    {
        $input = trim((string) $input);

        if ($input === '') {
            return null;
        }

        // Une URL collée seule : rien à extraire.
        if (! str_contains($input, '<')) {
            return $input;
        }

        // Ancré sur l'attribut src d'une balise <iframe> : sans cela, n'importe quel
        // attribut se terminant par "src" (data-src, un <img> placé avant...) l'emporte,
        // et l'admin enregistre une URL qu'il n'a jamais vue.
        $pattern = '/<iframe\b[^>]*?\ssrc\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s"\'>]+))/i';

        if (preg_match_all($pattern, $input, $matches, PREG_SET_ORDER) < 1) {
            return $input;
        }

        // Plusieurs iframes : on ne devine pas laquelle est la bonne.
        if (count($matches) > 1) {
            return null;
        }

        $match = $matches[0];
        $url = $match[1] !== '' ? $match[1] : ($match[2] !== '' ? $match[2] : ($match[3] ?? ''));

        return trim(html_entity_decode($url)) ?: null;
    }

    /**
     * Crée un item à la fin du dossier.
     *
     * Le type est dérivé de la catégorie du dossier, jamais du payload : c'est ce qui
     * garantit qu'un document ne peut pas atterrir dans un dossier média (et l'inverse).
     * L'attribution de la position et l'insertion sont dans la même transaction, avec
     * verrou sur le dossier : deux ajouts simultanés ne peuvent pas produire deux items
     * à la même position.
     *
     * @param  array{title: string, type?: string, embed_url?: string|null}  $data
     */
    public function createItem(LibraryFolder $folder, array $data, ?UploadedFile $file = null): LibraryItem
    {
        $isMedia = $folder->category === LibraryFolder::CATEGORY_MEDIA;

        if ($isMedia && empty($data['embed_url'])) {
            throw new InvalidArgumentException('Un contenu vidéo/audio requiert un lien iframe.');
        }

        if (! $isMedia && ! $file instanceof UploadedFile) {
            throw new InvalidArgumentException('Une ressource requiert un fichier.');
        }

        $type = $isMedia
            ? (($data['type'] ?? LibraryItem::TYPE_VIDEO) === LibraryItem::TYPE_AUDIO
                ? LibraryItem::TYPE_AUDIO
                : LibraryItem::TYPE_VIDEO)
            : LibraryItem::TYPE_DOCUMENT;

        // L'upload a lieu hors transaction : inutile de tenir un verrou pendant
        // un transfert réseau vers Spaces.
        $filePath = null;

        if (! $isMedia) {
            // Extension imposée côté serveur : elle détermine le Content-Type servi,
            // et le fichier part en visibilité privée (servi par URL signée seulement).
            $filePath = $this->storage->uploadPrivateFile($file, 'library/'.$folder->id, 'pdf');

            if (! $filePath) {
                throw new InvalidArgumentException('Le fichier n\'a pas pu être enregistré.');
            }
        }

        try {
            return DB::transaction(function () use ($folder, $data, $type, $isMedia, $file, $filePath): LibraryItem {
                // Verrou sur le dossier : sérialise les ajouts concurrents et fige
                // la valeur lue par nextPosition().
                LibraryFolder::whereKey($folder->id)->lockForUpdate()->first();

                return LibraryItem::forceCreate([
                    'library_folder_id' => $folder->id,
                    'title' => $data['title'],
                    'type' => $type,
                    'embed_url' => $isMedia ? $data['embed_url'] : null,
                    'file_path' => $filePath,
                    'original_name' => self::sanitizeFileName($file?->getClientOriginalName()),
                    'file_size' => $file?->getSize(),
                    'position' => $this->nextPosition($folder->id),
                    'created_by' => $data['created_by'] ?? null,
                ]);
            });
        } catch (\Throwable $e) {
            // Ne pas laisser le fichier orphelin sur Spaces si l'insertion échoue.
            $this->storage->delete($filePath);

            throw $e;
        }
    }

    /**
     * Nettoie un nom de fichier d'origine avant stockage.
     *
     * Il finira dans un en-tête Content-Disposition ou un attribut download : on en
     * retire les caractères de contrôle et les guillemets, et on borne sa longueur.
     */
    private static function sanitizeFileName(?string $name): ?string
    {
        if ($name === null) {
            return null;
        }

        $name = preg_replace('/[\x00-\x1F\x7F"\'\\\\\/]+/u', '', basename($name)) ?? '';
        $name = trim($name);

        return $name === '' ? null : mb_substr($name, 0, 255);
    }

    /**
     * Position suivante dans un dossier (les items sont ajoutés à la fin).
     *
     * À n'appeler que sous le verrou posé par createItem.
     */
    public function nextPosition(int $folderId): int
    {
        return (int) LibraryItem::where('library_folder_id', $folderId)->max('position') + 1;
    }

    /**
     * Déplace un item d'un cran vers le haut ou vers le bas.
     *
     * L'échange porte sur la position globale dans le dossier, pas sur la page
     * affichée : remonter le premier item d'une page le fait bien basculer sur
     * la page précédente.
     *
     * Retourne false si l'item est déjà à l'extrémité concernée. L'instance passée
     * en argument est rafraîchie pour refléter la nouvelle position.
     */
    public function move(LibraryItem $item, string $direction): bool
    {
        if (! in_array($direction, self::DIRECTIONS, true)) {
            throw new InvalidArgumentException('Direction invalide.');
        }

        $moved = DB::transaction(function () use ($item, $direction): bool {
            // Normalise l'ordre avant l'échange : si deux items partagent une position
            // (état dégradé), permuter leurs positions ne déplacerait rien.
            $this->resequence($item->library_folder_id);
            $item->refresh();

            // Le voisin est déterminé sur (position, id) — le même ordre que la
            // relation items() — pour rester cohérent si deux positions s'égalisent.
            $neighbourId = LibraryItem::where('library_folder_id', $item->library_folder_id)
                ->when(
                    $direction === 'up',
                    fn ($q) => $q
                        ->where(fn ($w) => $w
                            ->where('position', '<', $item->position)
                            ->orWhere(fn ($tie) => $tie
                                ->where('position', $item->position)
                                ->where('id', '<', $item->id)))
                        ->orderByDesc('position')
                        ->orderByDesc('id'),
                    fn ($q) => $q
                        ->where(fn ($w) => $w
                            ->where('position', '>', $item->position)
                            ->orWhere(fn ($tie) => $tie
                                ->where('position', $item->position)
                                ->where('id', '>', $item->id)))
                        ->orderBy('position')
                        ->orderBy('id'),
                )
                ->value('id');

            if (! $neighbourId) {
                return false;
            }

            // Verrouillage par id croissant : deux admins qui se croisent attendent
            // au lieu de s'interbloquer.
            $locked = LibraryItem::whereIn('id', [$item->id, $neighbourId])
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $current = $locked->get($item->id);
            $neighbour = $locked->get($neighbourId);

            if (! $current || ! $neighbour) {
                return false;
            }

            $currentPosition = $current->position;
            $current->forceFill(['position' => $neighbour->position])->save();
            $neighbour->forceFill(['position' => $currentPosition])->save();

            return true;
        });

        if ($moved) {
            $item->refresh();
        }

        return $moved;
    }

    /**
     * Renumérote les positions d'un dossier en 1..n (comble les trous après suppression).
     */
    public function resequence(int $folderId): void
    {
        $items = LibraryItem::where('library_folder_id', $folderId)
            ->orderBy('position')
            ->orderBy('id')
            ->get();

        foreach ($items as $index => $item) {
            $position = $index + 1;

            if ($item->position !== $position) {
                $item->forceFill(['position' => $position])->save();
            }
        }
    }

    /**
     * Supprime un item et son fichier sur Spaces.
     *
     * La suppression et la renumérotation forment une seule transaction ; le fichier
     * n'est effacé qu'après le commit, sur le même principe que les emails envoyés
     * hors transaction : un échec Spaces ne doit pas ressusciter la ligne.
     */
    public function deleteItem(LibraryItem $item): void
    {
        $folderId = $item->library_folder_id;
        $filePath = $item->file_path;

        DB::transaction(function () use ($item, $folderId): void {
            $item->delete();
            $this->resequence($folderId);
        });

        $this->storage->delete($filePath);
    }

    /**
     * Supprime un dossier, ses items et leurs fichiers.
     *
     * La cascade SQL efface les lignes, pas les fichiers : on collecte les chemins
     * AVANT la suppression, sans quoi les PDF resteraient orphelins sur Spaces.
     */
    public function deleteFolder(LibraryFolder $folder): void
    {
        $filePaths = $folder->items()
            ->whereNotNull('file_path')
            ->pluck('file_path')
            ->all();

        DB::transaction(function () use ($folder): void {
            $folder->delete();
        });

        foreach ($filePaths as $filePath) {
            $this->storage->delete($filePath);
        }
    }

    /**
     * Classes disponibles pour le ciblage d'accès, avec leurs niveaux réellement
     * activés. Le niveau 1 est implicite (il n'existe pas dans program_levels).
     *
     * Ne proposer que les niveaux activés évite de créer un dossier ciblant un
     * niveau inexistant, donc invisible pour tout le monde. Les classes annulées
     * sont écartées : les cibler n'aurait aucun effet.
     *
     * @return array<int, array<string, mixed>>
     */
    public function accessOptions(): array
    {
        return ClassModel::with([
            'program:id,name',
            'levelActivations.programLevel:id,level_number,name',
        ])
            ->where('status', '!=', 'cancelled')
            ->orderBy('name')
            ->get()
            ->map(function (ClassModel $class): array {
                $levels = [[
                    'level_number' => LibraryFolder::BASE_LEVEL,
                    'label' => 'Niveau 1 (tous les inscrits)',
                ]];

                $activated = $class->levelActivations
                    ->map(fn ($activation) => $activation->programLevel)
                    ->filter()
                    ->unique('id')
                    ->sortBy('level_number')
                    ->map(fn ($level): array => [
                        'level_number' => $level->level_number,
                        'label' => 'Niveau '.$level->level_number.($level->name ? ' — '.$level->name : ''),
                    ])
                    ->values()
                    ->all();

                return [
                    'class_id' => $class->id,
                    'class_name' => $class->name,
                    'academic_year' => $class->academic_year,
                    'program_id' => $class->program?->id,
                    'program_name' => $class->program?->name,
                    'levels' => array_merge($levels, $activated),
                ];
            })
            ->values()
            ->all();
    }
}
