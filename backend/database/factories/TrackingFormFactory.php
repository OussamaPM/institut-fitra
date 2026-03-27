<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\TrackingForm;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TrackingForm>
 */
class TrackingFormFactory extends Factory
{
    protected $model = TrackingForm::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3),
            'description' => fake()->paragraph(),
            'created_by' => User::factory(),
            'is_active' => true,
        ];
    }

    /**
     * Inactive form state.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
