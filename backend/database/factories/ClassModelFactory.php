<?php

namespace Database\Factories;

use App\Models\ClassModel;
use App\Models\Program;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ClassModel>
 */
class ClassModelFactory extends Factory
{
    protected $model = ClassModel::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startDate = $this->faker->dateTimeBetween('now', '+2 months');
        $endDate = (clone $startDate)->modify('+9 months'); // 9 mois de cours
        $academicYear = $startDate->format('Y').'/'.(((int) $startDate->format('Y')) + 1);

        return [
            'program_id' => Program::factory(),
            'name' => $this->faker->randomElement([
                'Promotion '.$academicYear.' - Groupe A',
                'Promotion '.$academicYear.' - Groupe B',
                'Classe '.$academicYear.' - Matin',
                'Classe '.$academicYear.' - Après-midi',
            ]),
            'academic_year' => $academicYear,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'max_students' => $this->faker->randomElement([15, 20, 25, 30, null]), // null = illimité
            'status' => 'planned',
        ];
    }

    /**
     * Indicate that the class is ongoing.
     */
    public function ongoing(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'ongoing',
            'start_date' => now()->subMonths(2),
            'end_date' => now()->addMonths(7),
        ]);
    }

    /**
     * Indicate that the class is completed.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'start_date' => now()->subYear(),
            'end_date' => now()->subMonths(3),
        ]);
    }

    /**
     * Indicate that the class is cancelled.
     */
    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'cancelled',
        ]);
    }

    /**
     * Indicate that the class is full.
     */
    public function full(): static
    {
        return $this->state(fn (array $attributes) => [
            'max_students' => 20,
        ]);
    }

    /**
     * Indicate that the class has unlimited capacity.
     */
    public function unlimited(): static
    {
        return $this->state(fn (array $attributes) => [
            'max_students' => null,
        ]);
    }
}
