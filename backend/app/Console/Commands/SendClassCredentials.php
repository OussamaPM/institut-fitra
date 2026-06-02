<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Mail\NewAccountCredentialsMail;
use App\Models\ClassModel;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class SendClassCredentials extends Command
{
    protected $signature = 'students:send-credentials
        {class : ID ou nom (partiel) de la classe}
        {--send : Envoyer réellement les emails et réinitialiser les mots de passe (sinon aperçu seulement)}';

    protected $description = 'Réinitialise le mot de passe et envoie les identifiants par email à tous les élèves actifs d\'une classe';

    public function handle(): int
    {
        $classArg = (string) $this->argument('class');

        // Résolution de la classe : par ID si numérique, sinon recherche par nom
        if (is_numeric($classArg)) {
            $class = ClassModel::find((int) $classArg);
        } else {
            $matches = ClassModel::where('name', 'like', '%'.$classArg.'%')->get();

            if ($matches->count() > 1) {
                $this->error('Plusieurs classes correspondent à "'.$classArg.'". Précisez l\'ID :');
                foreach ($matches as $m) {
                    $this->line("  [{$m->id}] {$m->name} ({$m->academic_year})");
                }

                return self::FAILURE;
            }

            $class = $matches->first();
        }

        if (! $class) {
            $this->error('Aucune classe trouvée pour "'.$classArg.'".');

            return self::FAILURE;
        }

        // Élèves inscrits actifs
        $enrollments = $class->enrollments()
            ->where('status', 'active')
            ->with('student')
            ->get()
            ->filter(fn ($e) => $e->student !== null);

        $this->info("Classe : {$class->name} ({$class->academic_year}) — ID {$class->id}");
        $this->info("Élèves actifs : {$enrollments->count()}");
        $this->newLine();

        if ($enrollments->isEmpty()) {
            $this->warn('Aucun élève actif dans cette classe.');

            return self::SUCCESS;
        }

        // Aperçu des destinataires
        $this->table(
            ['Nom', 'Email'],
            $enrollments->map(fn ($e) => [
                trim($e->student->first_name.' '.$e->student->last_name),
                $e->student->email,
            ])->all()
        );

        // Mode aperçu (par défaut) : rien n'est envoyé
        if (! $this->option('send')) {
            $this->newLine();
            $this->warn('APERÇU — aucun email envoyé, aucun mot de passe modifié.');
            $this->line('Ajoutez --send pour réinitialiser les mots de passe et envoyer les emails.');

            return self::SUCCESS;
        }

        // Confirmation explicite avant action destructive
        $this->newLine();
        $this->warn('⚠️  Cette action va RÉINITIALISER le mot de passe de '.$enrollments->count().' élève(s) et leur envoyer par email.');
        if (! $this->confirm('Confirmer l\'envoi ?', false)) {
            $this->info('Annulé.');

            return self::SUCCESS;
        }

        $sent = 0;
        $failed = [];

        foreach ($enrollments as $enrollment) {
            $student = $enrollment->student;
            $temporaryPassword = Str::random(12);

            try {
                $student->update(['password' => Hash::make($temporaryPassword)]);
                Mail::to($student->email)->send(new NewAccountCredentialsMail($student, $temporaryPassword));
                $sent++;
                $this->line("  ✓ {$student->email}");
            } catch (\Exception $e) {
                $failed[] = $student->email;
                Log::error("send-credentials échec pour {$student->email}: ".$e->getMessage());
                $this->error("  ✗ {$student->email} — {$e->getMessage()}");
            }
        }

        $this->newLine();
        $this->info("Envoyés : {$sent}");
        if (count($failed) > 0) {
            $this->error('Échecs : '.count($failed).' → '.implode(', ', $failed));
            $this->line('Relancez la commande pour réessayer (les mots de passe des échecs ont été modifiés mais l\'email n\'est pas parti).');
        }

        return self::SUCCESS;
    }
}
