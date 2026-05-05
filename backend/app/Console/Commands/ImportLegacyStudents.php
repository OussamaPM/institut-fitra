<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class ImportLegacyStudents extends Command
{
    protected $signature = 'import:legacy-students {file : Chemin absolu vers le fichier CSV}';

    protected $description = 'Importe les anciens élèves depuis le CSV Google Forms (sans envoi de mail)';

    // Indices des colonnes dans le CSV
    private const COLS = [
        'last_name'        => 1,
        'first_name'       => 2,
        'spouse'           => 3,
        'email'            => 4,
        'phone'            => 5,
        'city'             => 6,
        'gender'           => 7,
        'education'        => 8,
        'family'           => 9,
        'profession'       => 10,
        'arabic'           => 11,
        'islamic_studied'  => 12,
        'islamic_details'  => 13,
        'objectives'       => 14,
        'commitment'       => 15,
        'expectations'     => 16,
        'ustadh'           => 17,
        'support'          => 18,
        'free_text'        => 19,
        'age'              => 20,
    ];

    private const FORM_QUESTIONS = [
        [3,  "Inscrit(e) avec conjoint(e)"],
        [7,  "Genre"],
        [8,  "Niveau scolaire"],
        [9,  "Situation familiale"],
        [10, "Profession"],
        [11, "Niveau en langue arabe"],
        [12, "Avez-vous déjà étudié les sciences islamiques ?"],
        [13, "Si oui, qu'avez-vous étudié et où ?"],
        [14, "Quels sont vos objectifs ?"],
        [15, "Engagement (assiduité et motivation)"],
        [16, "Plus grande attente vis-à-vis de l'Institut"],
        [17, "Souhait que l'Oustadh sorte du programme ?"],
        [18, "Préférence pour le support de cours"],
        [19, "Expression libre"],
        [20, "Âge"],
    ];

    public function handle(): int
    {
        $filePath = $this->argument('file');

        if (! file_exists($filePath)) {
            $this->error("Fichier introuvable : {$filePath}");

            return 1;
        }

        $handle = fopen($filePath, 'r');

        // Ignorer le BOM UTF-8 si présent
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        // Ignorer la ligne d'en-têtes
        fgetcsv($handle, 0, ',');

        $created = 0;
        $skipped = 0;

        while (($row = fgetcsv($handle, 0, ',')) !== false) {
            $row = array_map(fn ($v) => $this->fixEncoding(trim($v ?? '')), $row);

            $email = strtolower($row[self::COLS['email']] ?? '');

            if (! $email || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $name = ($row[self::COLS['first_name']] ?? '') . ' ' . ($row[self::COLS['last_name']] ?? '');
                $this->warn("  Ignoré (email invalide) : {$name}");
                $skipped++;

                continue;
            }

            if (User::where('email', $email)->exists()) {
                $this->warn("  Ignoré (compte existant) : {$email}");
                $skipped++;

                continue;
            }

            $lastName  = $row[self::COLS['last_name']] ?? '';
            $firstName = $row[self::COLS['first_name']] ?? '';
            $genderRaw = $row[self::COLS['gender']] ?? '';
            $gender    = str_contains(strtolower($genderRaw), 'homme') ? 'male' : 'female';
            $phone     = $row[self::COLS['phone']] ?: null;
            $city      = $row[self::COLS['city']] ?: null;

            $legacyFormData = $this->buildLegacyFormData($row);

            $user = User::create([
                'first_name' => $firstName,
                'last_name'  => $lastName,
                'email'      => $email,
                'password'   => Hash::make('Fitra2024!'),
                'role'       => 'student',
            ]);

            $user->studentProfile()->create([
                'first_name'       => $firstName,
                'last_name'        => $lastName,
                'gender'           => $gender,
                'phone'            => $phone,
                'city'             => $city,
                'legacy_form_data' => $legacyFormData ?: null,
            ]);

            $this->info("  ✓ {$firstName} {$lastName} ({$email})");
            $created++;
        }

        fclose($handle);

        $this->newLine();
        $this->info("Terminé ! Créés : {$created} | Ignorés : {$skipped}");

        return 0;
    }

    private function buildLegacyFormData(array $row): array
    {
        $result = [];

        foreach (self::FORM_QUESTIONS as [$col, $question]) {
            $answer = $row[$col] ?? '';
            if ($answer !== '' && $answer !== '/' && $answer !== '-') {
                $result[] = ['question' => $question, 'answer' => $answer];
            }
        }

        return $result;
    }

    private function fixEncoding(string $str): string
    {
        if (! mb_check_encoding($str, 'UTF-8')) {
            return mb_convert_encoding($str, 'UTF-8', 'Windows-1252');
        }

        return $str;
    }
}
