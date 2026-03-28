<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class StudentProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'gender',
        'profile_photo',
        'phone',
        'date_of_birth',
        'address',
        'city',
        'country',
        'emergency_contact',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
    ];

    protected $appends = ['profile_photo_url'];

    public function getProfilePhotoUrlAttribute(): ?string
    {
        if (! $this->profile_photo) {
            return null;
        }

        // New files are .webp on Spaces, legacy files are .jpg/.png on public disk
        $extension = strtolower(pathinfo($this->profile_photo, PATHINFO_EXTENSION));
        if ($extension === 'webp') {
            return Storage::disk('spaces')->url($this->profile_photo);
        }

        return Storage::disk('public')->url($this->profile_photo);
    }

    /**
     * Get the user that owns the student profile.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
