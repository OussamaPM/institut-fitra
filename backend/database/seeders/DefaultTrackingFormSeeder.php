<?php

namespace Database\Seeders;

use App\Models\TrackingForm;
use App\Models\TrackingFormQuestion;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DefaultTrackingFormSeeder extends Seeder
{
    /**
     * Crée le "Formulaire d'inscription" assigné par défaut à chaque nouvel élève.
     * Idempotent : ne recrée pas le formulaire s'il existe déjà.
     */
    public function run(): void
    {
        if (TrackingForm::where('is_default', true)->exists()) {
            $this->command?->info("Le formulaire d'inscription par défaut existe déjà — ignoré.");

            return;
        }

        $admin = User::where('role', 'admin')->orderBy('id')->first();

        if (! $admin) {
            $this->command?->warn('Aucun administrateur trouvé — DefaultTrackingFormSeeder ignoré.');

            return;
        }

        // Questions du formulaire d'inscription (toutes en champ libre / texte).
        // [question, required]
        $questions = [
            ['Date de naissance', true],
            [
                "Si un membre de votre foyer (conjoint(e), enfant) veux suivre les cours aussi veuillez nous donner son nom, prénom, date de naissance et adresse mail afin de lui créer un compte!\nCondition: que la personne ait vraiment l'intention de suivre les cours avec sérieux et assiduité!",
                false,
            ],
            ['Niveau scolaire (mentionnez la spécialité)', true],
            ['Situation familiale (marié(e), célibataire, enfant(s))', true],
            ['Profession', true],
            ['Niveau en langue arabe (lecture / compréhension)', true],
            ["Avez-vous déjà étudié les sciences islamiques? OUI / NON\nSi oui, qu'avez-vous étudié? Et dans quel institut?", true],
            ['Quels sont vos objectifs?', true],
            ['Quels efforts êtes vous prêts à fournir pour atteindre ces objectifs?', true],
            ["Êtes-vous prêt(e) à vous engager sérieusement toute l'année avec assiduité et motivation?", true],
            ["Quelle est votre plus grande attente vis à vis de l'institut? Exprimez-vous librement ci-dessous:", false],
        ];

        DB::transaction(function () use ($admin, $questions) {
            $form = TrackingForm::create([
                'title' => "Formulaire d'inscription",
                'description' => 'Formulaire à compléter par chaque nouvel élève lors de son inscription à la plateforme.',
                'created_by' => $admin->id,
                'is_active' => true,
                'is_default' => true,
            ]);

            foreach ($questions as $index => [$question, $required]) {
                TrackingFormQuestion::create([
                    'form_id' => $form->id,
                    'question' => $question,
                    'type' => 'text',
                    'options' => null,
                    'order' => $index,
                    'required' => $required,
                ]);
            }
        });

        $this->command?->info("Formulaire d'inscription par défaut créé avec succès.");
    }
}
