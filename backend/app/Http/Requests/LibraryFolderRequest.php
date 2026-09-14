<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\LibraryFolder;
use App\Models\ProgramLevelActivation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class LibraryFolderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category' => [
                // La catégorie est figée après création : la changer déplacerait
                // le contenu du dossier dans un écran qui ne sait pas l'afficher.
                $this->isMethod('POST') ? 'required' : 'prohibited',
                Rule::in([LibraryFolder::CATEGORY_MEDIA, LibraryFolder::CATEGORY_RESOURCE]),
            ],
            'title' => 'required|string|max:255',
            'is_public' => 'required|boolean',
            // Un dossier public n'a pas de règles par classe : on ignore la liste
            // plutôt que de la refuser, car le front peut la conserver en mémoire
            // pendant que l'admin coche « Tout ».
            'accesses' => 'exclude_if:is_public,true|array|required_if:is_public,false|min:1',
            'accesses.*.class_id' => [
                'required',
                'integer',
                Rule::exists('classes', 'id')->where('status', '!=', 'cancelled'),
            ],
            // max:255 : la colonne est un unsignedTinyInteger, MySQL rejetterait au-delà
            'accesses.*.level_number' => 'required|integer|min:1|max:255',
        ];
    }

    /**
     * Refuse de cibler un niveau qui n'est pas activé sur la classe choisie : le
     * dossier serait publié et pourtant invisible, sans le moindre signal.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->boolean('is_public')) {
                return;
            }

            $accesses = (array) $this->input('accesses', []);

            // Seuls les niveaux 2+ existent dans program_levels ; le niveau 1 est implicite.
            $toCheck = [];

            foreach ($accesses as $index => $access) {
                $levelNumber = (int) ($access['level_number'] ?? 0);
                $classId = (int) ($access['class_id'] ?? 0);

                if ($levelNumber > LibraryFolder::BASE_LEVEL && $classId !== 0) {
                    $toCheck[$index] = ['class_id' => $classId, 'level_number' => $levelNumber];
                }
            }

            if ($toCheck === []) {
                return;
            }

            // Une seule requête pour toutes les paires, plutôt qu'une par ligne d'accès.
            $activated = ProgramLevelActivation::query()
                ->join('program_levels', 'program_levels.id', '=', 'program_level_activations.program_level_id')
                ->whereIn('program_level_activations.class_id', array_column($toCheck, 'class_id'))
                ->whereIn('program_levels.level_number', array_column($toCheck, 'level_number'))
                ->get(['program_level_activations.class_id', 'program_levels.level_number'])
                ->map(fn ($row) => $row->class_id.'|'.$row->level_number)
                ->flip();

            foreach ($toCheck as $index => $pair) {
                if (! $activated->has($pair['class_id'].'|'.$pair['level_number'])) {
                    $validator->errors()->add(
                        "accesses.{$index}.level_number",
                        "Le niveau {$pair['level_number']} n'est pas activé sur cette classe."
                    );
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'category.required' => 'La catégorie est obligatoire.',
            'category.prohibited' => 'La catégorie d\'un dossier ne peut pas être modifiée.',
            'category.in' => 'La catégorie doit être « media » ou « resource ».',
            'title.required' => 'Le titre du dossier est obligatoire.',
            'title.string' => 'Le titre doit être un texte.',
            'title.max' => 'Le titre ne peut pas dépasser 255 caractères.',
            'is_public.required' => 'Il faut préciser si le dossier est accessible à tous.',
            'is_public.boolean' => 'La valeur « accessible à tous » doit être vraie ou fausse.',
            'accesses.array' => 'La liste des classes est invalide.',
            'accesses.required_if' => 'Sélectionnez au moins une classe, ou cochez « Tout ».',
            'accesses.min' => 'Sélectionnez au moins une classe, ou cochez « Tout ».',
            'accesses.*.class_id.required' => 'Chaque accès doit désigner une classe.',
            'accesses.*.class_id.integer' => 'La classe sélectionnée est invalide.',
            'accesses.*.class_id.exists' => 'La classe sélectionnée n\'existe pas ou a été annulée.',
            'accesses.*.level_number.required' => 'Chaque classe doit être associée à un niveau.',
            'accesses.*.level_number.integer' => 'Le niveau doit être un nombre entier.',
            'accesses.*.level_number.min' => 'Le niveau doit être supérieur ou égal à 1.',
            'accesses.*.level_number.max' => 'Le niveau sélectionné est invalide.',
        ];
    }
}
