<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ClassModel;
use App\Models\Order;
use App\Models\Program;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Order>
 */
class OrderFactory extends Factory
{
    protected $model = Order::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'student_id' => User::factory(),
            'program_id' => Program::factory(),
            'class_id' => ClassModel::factory(),
            'customer_email' => fake()->email(),
            'customer_first_name' => fake()->firstName(),
            'customer_last_name' => fake()->lastName(),
            'total_amount' => fake()->randomFloat(2, 100, 1000),
            'installments_count' => fake()->numberBetween(1, 4),
            'payment_method' => fake()->randomElement(['stripe', 'paypal', 'free']),
            'status' => fake()->randomElement(['pending', 'partial', 'paid', 'failed', 'refunded', 'cancelled']),
        ];
    }

    /**
     * Free order state.
     */
    public function free(): static
    {
        return $this->state(fn (array $attributes) => [
            'payment_method' => 'free',
            'total_amount' => 0,
            'installments_count' => 1,
            'status' => 'paid',
        ]);
    }

    /**
     * Paid order state.
     */
    public function paid(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'paid',
        ]);
    }

    /**
     * Pending order state.
     */
    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
        ]);
    }
}
