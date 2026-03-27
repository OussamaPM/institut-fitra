<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SessionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // For PUT/PATCH requests (updates), make fields optional
        $isUpdate = $this->isMethod('PUT') || $this->isMethod('PATCH');
        $requiredRule = $isUpdate ? 'sometimes' : 'required';

        return [
            'class_id' => [$requiredRule, 'exists:classes,id'],
            'teacher_id' => [$requiredRule, 'exists:users,id'],
            'title' => [$requiredRule, 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'scheduled_at' => [$requiredRule, 'date'],
            'duration_minutes' => [$requiredRule, 'integer', 'min:1'],
            'status' => ['sometimes', 'in:scheduled,in_progress,completed,cancelled'],
            'color' => ['nullable', 'string', 'max:7'],
            'replay_url' => ['nullable', 'string', 'max:1000'],
            'replay_validity_days' => ['nullable', 'integer', 'min:1', 'max:365'],
        ];
    }

    /**
     * Get custom error messages for validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'class_id.required' => 'La classe est obligatoire.',
            'class_id.exists' => 'La classe sélectionnée n\'existe pas.',
            'teacher_id.required' => 'Le professeur est obligatoire.',
            'teacher_id.exists' => 'Le professeur sélectionné n\'existe pas.',
            'title.required' => 'Le titre de la session est obligatoire.',
            'title.string' => 'Le titre doit être une chaîne de caractères.',
            'title.max' => 'Le titre ne peut pas dépasser 255 caractères.',
            'description.string' => 'La description doit être une chaîne de caractères.',
            'scheduled_at.required' => 'La date de la session est obligatoire.',
            'scheduled_at.date' => 'La date de la session doit être une date valide.',
            'scheduled_at.after' => 'La date de la session doit être dans le futur.',
            'duration_minutes.required' => 'La durée de la session est obligatoire.',
            'duration_minutes.integer' => 'La durée doit être un nombre entier.',
            'duration_minutes.min' => 'La durée doit être d\'au moins 1 minute.',
            'status.in' => 'Le statut doit être : scheduled, in_progress, completed ou cancelled.',
            'replay_url.string' => 'Le lien du replay doit être une chaîne de caractères.',
            'replay_url.max' => 'Le lien du replay ne peut pas dépasser 1000 caractères.',
            'replay_validity_days.integer' => 'La durée de validité doit être un nombre entier.',
            'replay_validity_days.min' => 'La durée de validité doit être d\'au moins 1 jour.',
            'replay_validity_days.max' => 'La durée de validité ne peut pas dépasser 365 jours.',
        ];
    }
}
