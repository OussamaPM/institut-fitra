<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\ClassModel;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ClassTransferMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $dashboardUrl;

    public function __construct(
        public User $student,
        public ClassModel $fromClass,
        public ClassModel $toClass,
        /** Niveaux payés non activés sur la nouvelle classe (transfert confirmé malgré tout) */
        public array $missingLevels = [],
    ) {
        $frontendUrl = config('app.frontend_url', 'http://app.localhost:3000');
        $this->dashboardUrl = "{$frontendUrl}/student/dashboard";
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Changement de classe — '.$this->toClass->name,
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.class-transfer',
            with: [
                'student' => $this->student,
                'fromClass' => $this->fromClass,
                'toClass' => $this->toClass,
                // L'emploi du temps est porté par la classe, jamais par le programme
                'schedule' => $this->toClass->schedule ?? [],
                'missingLevels' => $this->missingLevels,
                'dashboardUrl' => $this->dashboardUrl,
            ],
        );
    }
}
