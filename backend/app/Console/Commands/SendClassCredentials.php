<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Mail\NewAccountCredentialsMail;
use App\Models\ClassModel;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class SendClassCredentials extends Command
{
    protected $signature = 'students:send-credentials
        {class? : ID ou nom (partiel) de la classe — ignoré si --student est utilisé}
        {--student=* : Email ou nom complet d\'un élève précis (répétable)}
        {--send : Envoyer réellement les emails et réinitialiser les mots de passe (sinon aperçu seulement)}';

    protected $description = 'Réinitialise le mot de passe et envoie les identifiants par email, soit à toute une classe, soit à une liste d\'élèves';

    public function handle(): int
    {
        /** @var array<int, string> $wanted */
        $wanted = array_filter(array_map('trim', (array) $this->option('student')));

        $students = $wanted !== []
            ? $this->resolveStudents($wanted)
            : $this->resolveClassStudents();

        if ($students === null) {
            return self::FAILURE;
        }

        if ($students->isEmpty()) {
            $this->warn('Aucun élève à traiter.');

            return self::SUCCESS;
        }

        // Aperçu des destinataires
        $this->table(
            ['ID', 'Nom', 'Email'],
            $students->map(fn ($s) => [
                $s->id,
                trim($s->first_name.' '.$s->last_name),
                $s->email,
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
        $this->warn('⚠️  Cette action va RÉINITIALISER le mot de passe de '.$students->count().' élève(s) et leur envoyer par email.');
        if (! $this->confirm('Confirmer l\'envoi ?', false)) {
            $this->info('Annulé.');

            return self::SUCCESS;
        }

        return $this->send($students);
    }

    /**
     * Résout une liste d'élèves désignés par email ou nom complet.
     * Retourne null si une entrée est introuvable ou ambiguë (rien n'est envoyé).
     *
     * @param  array<int, string>  $wanted
     * @return Collection<int, User>|null
     */
    private function resolveStudents(array $wanted): ?Collection
    {
        /** @var Collection<int, User> $students */
        $students = new Collection;
        $problems = [];

        foreach ($wanted as $needle) {
            $matches = User::where('role', 'student')
                ->where(function ($q) use ($needle): void {
                    $q->where('email', $needle)
                        ->orWhereRaw("CONCAT(TRIM(first_name), ' ', TRIM(last_name)) LIKE ?", ['%'.$needle.'%'])
                        ->orWhereRaw("CONCAT(TRIM(last_name), ' ', TRIM(first_name)) LIKE ?", ['%'.$needle.'%']);
                })
                ->get();

            if ($matches->isEmpty()) {
                $problems[] = "  ✗ « {$needle} » : aucun élève trouvé";

                continue;
            }

            if ($matches->count() > 1) {
                $lines = $matches->map(fn ($u) => "      [{$u->id}] {$u->first_name} {$u->last_name} <{$u->email}>")->implode(PHP_EOL);
                $problems[] = "  ✗ « {$needle} » : {$matches->count()} élèves correspondent, précisez l'email :".PHP_EOL.$lines;

                continue;
            }

            $students->push($matches->first());
        }

        if ($problems !== []) {
            $this->error('Impossible d\'identifier tous les élèves — rien n\'a été envoyé :');
            foreach ($problems as $problem) {
                $this->line($problem);
            }

            return null;
        }

        return $students->unique('id')->values();
    }

    /**
     * Résout les élèves actifs d'une classe (comportement historique).
     *
     * @return Collection<int, User>|null
     */
    private function resolveClassStudents(): ?Collection
    {
        $classArg = (string) $this->argument('class');

        if ($classArg === '') {
            $this->error('Indiquez une classe, ou au moins un --student="Prénom Nom".');

            return null;
        }

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

                return null;
            }

            $class = $matches->first();
        }

        if (! $class) {
            $this->error('Aucune classe trouvée pour "'.$classArg.'".');

            return null;
        }

        $students = $class->enrollments()
            ->where('status', 'active')
            ->with('student')
            ->get()
            ->map(fn ($e) => $e->student)
            ->filter()
            ->values();

        $this->info("Classe : {$class->name} ({$class->academic_year}) — ID {$class->id}");
        $this->info("Élèves actifs : {$students->count()}");
        $this->newLine();

        /** @var Collection<int, User> */
        return new Collection($students->all());
    }

    /**
     * Réinitialise le mot de passe et envoie l'email à chaque élève.
     *
     * @param  Collection<int, User>  $students
     */
    private function send(Collection $students): int
    {
        $sent = 0;
        $failed = [];

        foreach ($students as $student) {
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
