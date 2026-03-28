<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewAccountCredentialsMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $loginUrl;

    public function __construct(
        public User $student,
        public string $temporaryPassword,
    ) {
        $frontendUrl = config('app.frontend_url', 'http://app.localhost:3000');
        $this->loginUrl = "{$frontendUrl}/auth/login";
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Vos identifiants de connexion — Institut Fitra',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.new-account-credentials',
            with: [
                'student' => $this->student,
                'temporaryPassword' => $this->temporaryPassword,
                'loginUrl' => $this->loginUrl,
            ],
        );
    }
}
