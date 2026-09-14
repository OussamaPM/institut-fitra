<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\LibraryFolder;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\LibraryFolder>
 */
class LibraryFolderFactory extends Factory
{
    protected $model = LibraryFolder::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'category' => LibraryFolder::CATEGORY_MEDIA,
            'title' => fake()->words(3, true),
            'status' => LibraryFolder::STATUS_DRAFT,
            'is_public' => false,
            'created_by' => User::factory()->state(['role' => 'admin']),
        ];
    }

    public function published(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => LibraryFolder::STATUS_PUBLISHED,
        ]);
    }

    public function resource(): static
    {
        return $this->state(fn (array $attributes) => [
            'category' => LibraryFolder::CATEGORY_RESOURCE,
        ]);
    }

    public function public(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_public' => true,
        ]);
    }
}
