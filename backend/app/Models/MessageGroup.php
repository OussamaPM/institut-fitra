<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MessageGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'program_id',
        'class_id',
        'created_by',
        'students_can_write',
    ];

    protected $casts = [
        'students_can_write' => 'boolean',
    ];

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    public function class(): BelongsTo
    {
        return $this->belongsTo(ClassModel::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class, 'group_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(GroupMember::class, 'group_id');
    }

    /**
     * Get users who are members of this group.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'group_members', 'group_id', 'user_id')
            ->withPivot('joined_at')
            ->withTimestamps();
    }

    /**
     * Check if a user is a member of this group.
     */
    public function hasMember(User $user): bool
    {
        return $this->users()->where('user_id', $user->id)->exists();
    }

    /**
     * Get the last message in the group.
     */
    public function lastMessage()
    {
        return $this->messages()->latest('sent_at')->first();
    }

    /**
     * Get unread messages count for a user.
     */
    public function unreadCountFor(User $user): int
    {
        return $this->messages()
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->count();
    }

    /**
     * Check if a user can write in this group.
     */
    public function canUserWrite(User $user): bool
    {
        // Admins and teachers can always write
        if ($user->role === 'admin' || $user->role === 'teacher') {
            return true;
        }

        // Students can only write if students_can_write is enabled
        return $this->students_can_write;
    }
}
