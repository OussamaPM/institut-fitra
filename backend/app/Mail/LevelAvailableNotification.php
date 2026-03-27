<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\ClassModel;
use App\Models\ProgramLevel;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LevelAvailableNotification extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public ProgramLevel $level;

    public User $student;

    public ?ClassModel $activatedClass;

    public function __construct(ProgramLevel $level, User $student, ?ClassModel $activatedClass = null)
    {
        $this->level = $level;
        $this->student = $student;
        $this->activatedClass = $activatedClass;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Réinscription disponible : {$this->level->program->name} - {$this->level->name}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.level-available',
            with: [
                'level' => $this->level,
                'student' => $this->student,
                'program' => $this->level->program,
                'activatedClass' => $this->activatedClass,
                'reinscriptionUrl' => $this->getReinscriptionUrl(),
            ],
        );
    }

    private function getReinscriptionUrl(): string
    {
        $frontendUrl = config('app.frontend_url', 'http://app.localhost:3000');

        return "{$frontendUrl}/student/reinscription/{$this->level->program_id}/{$this->level->id}";
    }
}
