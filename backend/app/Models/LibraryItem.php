<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LibraryItem extends Model
{
    use HasFactory;

    public const TYPE_VIDEO = 'video';

    public const TYPE_AUDIO = 'audio';

    public const TYPE_DOCUMENT = 'document';

    /**
     * 'position' est volontairement absent : l'ordre est attribué par LibraryService,
     * jamais par un payload client, sous peine de collisions de positions.
     */
    protected $fillable = [
        'library_folder_id',
        'title',
        'type',
        'embed_url',
        'file_path',
        'original_name',
        'file_size',
        'created_by',
    ];

    protected $casts = [
        'position' => 'integer',
        'file_size' => 'integer',
    ];

    /**
     * Le chemin du fichier ne sort jamais : combiné à l'URL du CDN, il
     * court-circuiterait le contrôle d'accès du téléchargement. L'admin le rend
     * visible explicitement là où il en a besoin.
     */
    protected $hidden = ['file_path'];

    public function folder(): BelongsTo
    {
        return $this->belongsTo(LibraryFolder::class, 'library_folder_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * URL du fichier sur Spaces.
     *
     * Volontairement hors de $appends : une URL CDN est permanente et non révocable,
     * elle ne doit jamais partir dans une sérialisation par défaut. Elle n'est
     * produite qu'au moment de servir un téléchargement déjà autorisé, comme le fait
     * SessionMaterialController::download.
     */
    public function fileUrl(): ?string
    {
        if (! $this->file_path) {
            return null;
        }

        return app(\App\Services\ImageOptimizerService::class)->url($this->file_path);
    }
}
