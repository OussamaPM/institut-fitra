<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\LibraryFolder;
use App\Models\LibraryItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\LibraryItem>
 */
class LibraryItemFactory extends Factory
{
    protected $model = LibraryItem::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'library_folder_id' => LibraryFolder::factory(),
            'title' => fake()->sentence(3),
            'type' => LibraryItem::TYPE_VIDEO,
            'embed_url' => 'https://player.mediadelivery.net/embed/12345/'.fake()->uuid(),
            'created_by' => User::factory()->state(['role' => 'admin']),
        ];
    }

    /**
     * 'position' n'est pas assignable en masse (elle n'appartient qu'à LibraryService) :
     * elle est donc posée après construction, ici par défaut et via atPosition().
     */
    public function configure(): static
    {
        return $this->afterMaking(function (LibraryItem $item): void {
            if ($item->position === null) {
                $item->position = 1;
            }
        });
    }

    public function atPosition(int $position): static
    {
        return $this->afterMaking(function (LibraryItem $item) use ($position): void {
            $item->position = $position;
        });
    }

    /**
     * Document PDF : le dossier parent bascule en catégorie « resource » pour que la
     * fixture reste cohérente (un document n'a rien à faire dans un dossier média).
     */
    public function document(): static
    {
        return $this->state(fn (array $attributes) => [
            'library_folder_id' => $attributes['library_folder_id'] ?? LibraryFolder::factory()->resource(),
            'type' => LibraryItem::TYPE_DOCUMENT,
            'embed_url' => null,
            'file_path' => 'library/'.fake()->uuid().'.pdf',
            'original_name' => fake()->word().'.pdf',
            'file_size' => fake()->numberBetween(10_000, 5_000_000),
        ]);
    }

    public function audio(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => LibraryItem::TYPE_AUDIO,
        ]);
    }
}
