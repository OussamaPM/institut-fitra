<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LibraryFolder extends Model
{
    use HasFactory;

    public const CATEGORY_MEDIA = 'media';

    public const CATEGORY_RESOURCE = 'resource';

    public const STATUS_DRAFT = 'draft';

    public const STATUS_PUBLISHED = 'published';

    /** Niveau de base : tous les inscrits de la classe, sans condition de paiement. */
    public const BASE_LEVEL = 1;

    protected $fillable = [
        'category',
        'title',
        'status',
        'is_public',
        'created_by',
    ];

    protected $casts = [
        'is_public' => 'boolean',
    ];

    protected $appends = ['is_published'];

    /**
     * Items du dossier, dans l'ordre d'affichage.
     *
     * Le départage par id est indispensable : sans lui, deux items partageant la
     * même position peuvent changer d'ordre d'une requête à l'autre, ce qui fait
     * apparaître un item sur deux pages et en escamote un autre en pagination.
     */
    public function items(): HasMany
    {
        return $this->hasMany(LibraryItem::class)
            ->orderBy('position')
            ->orderBy('id');
    }

    public function accesses(): HasMany
    {
        return $this->hasMany(LibraryFolderAccess::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getIsPublishedAttribute(): bool
    {
        return $this->status === self::STATUS_PUBLISHED;
    }

    /**
     * Dossiers visibles par un élève.
     *
     * Un dossier est visible s'il est publié ET que l'une de ces conditions est vraie :
     *  - il est public (tous les utilisateurs) ;
     *  - il cible une classe où l'élève est inscrit (statut active) et :
     *      · level_number = 1  → niveau de base, acquis dès l'inscription. Aucune commande
     *        n'est exigée, ce qui couvre les élèves importés ayant un Enrollment sans Order,
     *        et le niveau 1 reste inclusif : un élève monté en niveau 2 y a toujours accès ;
     *      · level_number >= 2 → une commande paid/partial pour ce niveau DANS CETTE CLASSE.
     *
     * Les deux sous-requêtes sont corrélées à la class_id de la ligne d'accès : un élève
     * inscrit au niveau 2 en classe A et au niveau 1 en classe B est traité correctement.
     */
    public function scopeVisibleToStudent(Builder $query, int $studentId): Builder
    {
        return $query
            ->where('status', self::STATUS_PUBLISHED)
            ->where(function ($q) use ($studentId): void {
                $q->where('is_public', true)
                    ->orWhereHas('accesses', function ($access) use ($studentId): void {
                        $access
                            ->whereExists(function ($sub) use ($studentId): void {
                                $sub->selectRaw('1')
                                    ->from('enrollments')
                                    ->whereColumn('enrollments.class_id', 'library_folder_access.class_id')
                                    ->where('enrollments.student_id', $studentId)
                                    ->where('enrollments.status', 'active');
                            })
                            ->where(function ($level) use ($studentId): void {
                                $level
                                    ->where('library_folder_access.level_number', '<=', self::BASE_LEVEL)
                                    ->orWhereExists(function ($sub) use ($studentId): void {
                                        $sub->selectRaw('1')
                                            ->from('orders')
                                            ->whereColumn('orders.class_id', 'library_folder_access.class_id')
                                            ->whereColumn('orders.level_number', 'library_folder_access.level_number')
                                            ->where('orders.student_id', $studentId)
                                            ->whereIn('orders.status', ['paid', 'partial']);
                                    });
                            });
                    });
            });
    }

    public function scopeCategory(Builder $query, string $category): Builder
    {
        return $query->where('category', $category);
    }
}
