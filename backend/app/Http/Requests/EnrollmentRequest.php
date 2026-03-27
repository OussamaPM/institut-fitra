<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EnrollmentRequest extends FormRequest
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
        return [
            'student_id' => ['required', 'exists:users,id'],
            'class_id' => ['required', 'exists:classes,id'],
            'expires_at' => ['nullable', 'date', 'after:today'],
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
            'student_id.required' => 'L\'identifiant de l\'élève est obligatoire.',
            'student_id.exists' => 'L\'élève sélectionné n\'existe pas.',
            'class_id.required' => 'L\'identifiant de la classe est obligatoire.',
            'class_id.exists' => 'La classe sélectionnée n\'existe pas.',
            'expires_at.date' => 'La date d\'expiration doit être une date valide.',
            'expires_at.after' => 'La date d\'expiration doit être dans le futur.',
        ];
    }
}
