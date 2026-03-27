<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Services\ProgramLevelService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProgramLevelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'max_installments' => 'required|integer|min:1|max:12',
            'schedule' => 'nullable|array',
            'schedule.*.day' => [
                'required_with:schedule',
                'string',
                Rule::in(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']),
            ],
            'schedule.*.start_time' => 'required_with:schedule|date_format:H:i',
            'schedule.*.end_time' => 'required_with:schedule|date_format:H:i|after:schedule.*.start_time',
            'teacher_id' => 'nullable|exists:users,id',
        ];

        // En mode PUT (modification), vérifier si le prix peut être modifié
        if ($this->isMethod('PUT') && $this->route('level')) {
            $level = $this->route('level');
            $levelService = app(ProgramLevelService::class);

            // Si des inscriptions existent, le prix ne peut pas être modifié
            if (! $levelService->canModifyPrice($level)) {
                // Le prix doit rester identique
                $rules['price'] = [
                    'required',
                    'numeric',
                    function ($attribute, $value, $fail) use ($level) {
                        if ((float) $value !== (float) $level->price) {
                            $fail('Le prix ne peut pas être modifié car des élèves sont inscrits à ce niveau.');
                        }
                    },
                ];
            }
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Le nom du niveau est obligatoire.',
            'name.max' => 'Le nom ne peut pas dépasser 255 caractères.',
            'price.required' => 'Le prix est obligatoire.',
            'price.numeric' => 'Le prix doit être un nombre.',
            'price.min' => 'Le prix ne peut pas être négatif.',
            'max_installments.required' => 'Le nombre maximum de paiements est obligatoire.',
            'max_installments.integer' => 'Le nombre de paiements doit être un entier.',
            'max_installments.min' => 'Le nombre minimum de paiements est 1.',
            'max_installments.max' => 'Le nombre maximum de paiements est 12.',
            'schedule.*.day.in' => 'Le jour doit être un jour de la semaine valide.',
            'schedule.*.start_time.date_format' => 'L\'heure de début doit être au format HH:MM.',
            'schedule.*.end_time.date_format' => 'L\'heure de fin doit être au format HH:MM.',
            'schedule.*.end_time.after' => 'L\'heure de fin doit être après l\'heure de début.',
            'teacher_id.exists' => 'L\'enseignant sélectionné n\'existe pas.',
        ];
    }
}
