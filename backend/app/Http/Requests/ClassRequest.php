<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ClassRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Seuls les admins et teachers peuvent gérer les classes
        return $this->user() && in_array($this->user()->role, ['admin', 'teacher']);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $isUpdate = $this->isMethod('put') || $this->isMethod('patch');

        return [
            'program_id' => [$isUpdate ? 'sometimes' : 'required', 'exists:programs,id'],
            'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'academic_year' => [$isUpdate ? 'sometimes' : 'required', 'string', 'regex:/^\d{4}\/\d{4}$/'], // Format: 2025/2026
            'start_date' => [$isUpdate ? 'sometimes' : 'required', 'date'],
            'end_date' => [$isUpdate ? 'sometimes' : 'required', 'date', 'after:start_date'],
            'max_students' => ['nullable', 'integer', 'min:1', 'max:100'],
            'status' => ['sometimes', 'in:planned,ongoing,completed,cancelled'],
            'zoom_link' => ['nullable', 'url', 'max:500'],
            'parent_class_id' => ['nullable', 'integer', 'exists:classes,id'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'program_id.required' => 'Le programme est requis.',
            'program_id.exists' => 'Le programme sélectionné n\'existe pas.',
            'name.required' => 'Le nom de la classe est requis.',
            'name.max' => 'Le nom ne peut pas dépasser 255 caractères.',
            'academic_year.required' => 'L\'année académique est requise.',
            'academic_year.regex' => 'L\'année académique doit être au format AAAA/AAAA (ex: 2025/2026).',
            'start_date.required' => 'La date de début est requise.',
            'start_date.date' => 'La date de début doit être une date valide.',
            'start_date.after_or_equal' => 'La date de début doit être aujourd\'hui ou dans le futur.',
            'end_date.required' => 'La date de fin est requise.',
            'end_date.date' => 'La date de fin doit être une date valide.',
            'end_date.after' => 'La date de fin doit être après la date de début.',
            'max_students.integer' => 'Le nombre maximum d\'élèves doit être un nombre entier.',
            'max_students.min' => 'Le nombre maximum d\'élèves doit être au moins 1.',
            'max_students.max' => 'Le nombre maximum d\'élèves ne peut pas dépasser 100.',
            'status.in' => 'Le statut doit être : planned, ongoing, completed ou cancelled.',
            'zoom_link.url' => 'Le lien Zoom doit être une URL valide.',
            'zoom_link.max' => 'Le lien Zoom ne peut pas dépasser 500 caractères.',
        ];
    }
}
