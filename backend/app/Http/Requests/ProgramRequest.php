<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProgramRequest extends FormRequest
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
        $programId = $this->route('program');

        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'max_installments' => ['required', 'integer', 'min:1', 'max:12'],
            'teacher_id' => ['required', 'exists:users,id'],
            'schedule' => ['required', 'array', 'min:1'],
            'schedule.*.day' => ['required', 'string', 'in:lundi,mardi,mercredi,jeudi,vendredi,samedi,dimanche'],
            'schedule.*.start_time' => ['required', 'date_format:H:i'],
            'schedule.*.end_time' => ['required', 'date_format:H:i', 'after:schedule.*.start_time'],
            'subject' => ['required', 'string', 'max:255'],
            'subject_description' => ['nullable', 'string'],
            'enrollment_conditions' => ['nullable', 'string'],
            'default_class_id' => ['nullable', 'exists:classes,id'],
            'active' => ['sometimes', 'boolean'],
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
            'name.required' => 'Le nom du programme est requis.',
            'name.max' => 'Le nom du programme ne peut pas dépasser 255 caractères.',
            'description.required' => 'La description du programme est requise.',
            'price.required' => 'Le prix du programme est requis.',
            'price.numeric' => 'Le prix doit être un nombre valide.',
            'price.min' => 'Le prix ne peut pas être négatif.',
            'max_installments.required' => 'Le nombre de paiements est requis.',
            'max_installments.integer' => 'Le nombre de paiements doit être un nombre entier.',
            'max_installments.min' => 'Le nombre de paiements doit être au moins 1.',
            'max_installments.max' => 'Le nombre de paiements ne peut pas dépasser 12.',
            'teacher_id.required' => 'L\'enseignant est requis.',
            'teacher_id.exists' => 'L\'enseignant sélectionné n\'existe pas.',
            'schedule.required' => 'L\'emploi du temps est requis.',
            'schedule.array' => 'L\'emploi du temps doit être un tableau.',
            'schedule.min' => 'L\'emploi du temps doit contenir au moins un horaire.',
            'schedule.*.day.required' => 'Le jour est requis pour chaque horaire.',
            'schedule.*.day.in' => 'Le jour doit être valide (lundi-dimanche).',
            'schedule.*.start_time.required' => 'L\'heure de début est requise.',
            'schedule.*.start_time.date_format' => 'L\'heure de début doit être au format HH:MM.',
            'schedule.*.end_time.required' => 'L\'heure de fin est requise.',
            'schedule.*.end_time.date_format' => 'L\'heure de fin doit être au format HH:MM.',
            'schedule.*.end_time.after' => 'L\'heure de fin doit être après l\'heure de début.',
            'subject.required' => 'La matière est requise.',
            'subject.max' => 'La matière ne peut pas dépasser 255 caractères.',
            'default_class_id.exists' => 'La classe sélectionnée n\'existe pas.',
            'active.boolean' => 'Le statut actif doit être vrai ou faux.',
        ];
    }
}
