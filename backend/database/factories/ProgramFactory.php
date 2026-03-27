<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Program;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProgramFactory extends Factory
{
    protected $model = Program::class;

    public function definition(): array
    {
        return [
            'name' => fake()->sentence(3),
            'description' => fake()->paragraph(),
            'price' => fake()->randomFloat(2, 50, 500),
            'max_installments' => fake()->numberBetween(1, 12),
            'active' => true,
            'created_by' => User::factory(),
            'teacher_id' => User::factory()->create(['role' => 'teacher'])->id,
            'schedule' => [
                [
                    'day' => 'lundi',
                    'start_time' => '09:00',
                    'end_time' => '11:00',
                ],
                [
                    'day' => 'mercredi',
                    'start_time' => '14:00',
                    'end_time' => '16:00',
                ],
            ],
            'subject' => fake()->words(3, true),
            'subject_description' => fake()->paragraph(),
            'enrollment_conditions' => fake()->sentence(),
        ];
    }
}
