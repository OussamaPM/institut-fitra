<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeacherProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'gender',
        'profile_photo',
        'phone',
        'specialization',
        'bio',
        'zoom_access_token',
        'zoom_refresh_token',
        'zoom_token_expires_at',
    ];

    protected $casts = [
        'zoom_token_expires_at' => 'datetime',
    ];

    protected $hidden = [
        'zoom_access_token',
        'zoom_refresh_token',
    ];

    /**
     * Get the user that owns the teacher profile.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
