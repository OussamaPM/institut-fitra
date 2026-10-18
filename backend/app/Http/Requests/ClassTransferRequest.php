<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ClassTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'target_class_id' => ['required', 'integer', 'exists:classes,id'],
            'confirm_missing_levels' => ['sometimes', 'boolean'],
            'sync_class_groups' => ['sometimes', 'boolean'],
            'notify_student' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'target_class_id.required' => 'Veuillez sélectionner la classe de destination.',
            'target_class_id.exists' => 'La classe de destination n\'existe pas.',
        ];
    }
}
