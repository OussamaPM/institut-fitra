<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Session;
use App\Models\SessionMaterial;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SessionMaterial>
 */
class SessionMaterialFactory extends Factory
{
    protected $model = SessionMaterial::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'session_id' => Session::factory(),
            'title' => fake()->sentence(3),
            'file_path' => 'materials/'.fake()->uuid().'.pdf',
            'file_type' => 'pdf',
            'file_size' => fake()->numberBetween(1000, 5000000),
            'uploaded_by' => User::factory(),
            'uploaded_at' => now(),
        ];
    }

    /**
     * PDF material state.
     */
    public function pdf(): static
    {
        return $this->state(fn (array $attributes) => [
            'file_type' => 'pdf',
            'file_path' => 'materials/'.fake()->uuid().'.pdf',
        ]);
    }

    /**
     * Image material state.
     */
    public function image(): static
    {
        return $this->state(fn (array $attributes) => [
            'file_type' => 'image',
            'file_path' => 'materials/'.fake()->uuid().'.jpg',
        ]);
    }
}
