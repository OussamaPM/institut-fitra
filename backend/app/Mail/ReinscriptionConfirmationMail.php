<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Enrollment;
use App\Models\ProgramLevel;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReinscriptionConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $dashboardUrl;

    public function __construct(
        public User $student,
        public Enrollment $enrollment,
        public ?ProgramLevel $level = null,
    ) {
        $frontendUrl = config('app.frontend_url', 'http://app.localhost:3000');
        $this->dashboardUrl = "{$frontendUrl}/student/dashboard";
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Félicitations — votre réinscription est confirmée',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.reinscription-confirmation',
            with: [
                'student' => $this->student,
                'class' => $this->enrollment->class,
                'program' => $this->enrollment->class?->program,
                'level' => $this->level,
                'dashboardUrl' => $this->dashboardUrl,
            ],
        );
    }
}
