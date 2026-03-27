<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Attendance;
use App\Models\Session;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AttendanceFactory extends Factory
{
    protected $model = Attendance::class;

    public function definition(): array
    {
        return [
            'session_id' => Session::factory(),
            'student_id' => User::factory()->create(['role' => 'student']),
            'attended' => fake()->boolean(80), // 80% attendance rate
            'duration_minutes' => fake()->numberBetween(45, 180),
            'joined_at' => fake()->dateTimeBetween('-3 months', 'now'),
        ];
    }

    /**
     * Indicate that the student attended.
     */
    public function attended(): static
    {
        return $this->state(fn (array $attributes) => [
            'attended' => true,
            'joined_at' => fake()->dateTimeBetween('-3 months', 'now'),
        ]);
    }

    /**
     * Indicate that the student was absent.
     */
    public function absent(): static
    {
        return $this->state(fn (array $attributes) => [
            'attended' => false,
            'duration_minutes' => null,
            'joined_at' => null,
        ]);
    }
}
