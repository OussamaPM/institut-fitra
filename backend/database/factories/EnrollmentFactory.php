<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ClassModel;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class EnrollmentFactory extends Factory
{
    protected $model = Enrollment::class;

    public function definition(): array
    {
        return [
            'student_id' => User::factory(),
            'class_id' => ClassModel::factory(),
            'status' => fake()->randomElement(['active', 'completed', 'cancelled']),
            'enrolled_at' => now(),
            'expires_at' => now()->addMonths(6),
        ];
    }
}
