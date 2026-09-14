<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LibraryFolderAccess extends Model
{
    protected $table = 'library_folder_access';

    protected $fillable = [
        'library_folder_id',
        'class_id',
        'level_number',
    ];

    protected $casts = [
        'level_number' => 'integer',
    ];

    public function folder(): BelongsTo
    {
        return $this->belongsTo(LibraryFolder::class, 'library_folder_id');
    }

    public function class(): BelongsTo
    {
        return $this->belongsTo(ClassModel::class, 'class_id');
    }
}
