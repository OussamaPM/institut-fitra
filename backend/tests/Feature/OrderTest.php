<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ClassModel;
use App\Models\Order;
use App\Models\OrderPayment;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test admin can list orders.
     */
    public function test_admin_can_list_orders(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        Order::factory()->count(3)->create([
            'student_id' => $student->id,
            'program_id' => $program->id,
            'class_id' => $class->id,
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/admin/orders');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'orders' => [
                    'data' => [
                        '*' => [
                            'id',
                            'customer_email',
                            'total_amount',
                            'status',
                            'payment_method',
                        ],
                    ],
                ],
            ]);
    }

    /**
     * Test admin can filter orders by status.
     */
    public function test_admin_can_filter_orders_by_status(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        Order::factory()->paid()->create([
            'student_id' => $student->id,
            'program_id' => $program->id,
            'class_id' => $class->id,
        ]);
        Order::factory()->pending()->create([
            'student_id' => $student->id,
            'program_id' => $program->id,
            'class_id' => $class->id,
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/admin/orders?status=paid');

        $response->assertStatus(200);
        $orders = $response->json('orders.data');

        foreach ($orders as $order) {
            $this->assertEquals('paid', $order['status']);
        }
    }

    /**
     * Test admin can filter orders by payment method.
     */
    public function test_admin_can_filter_orders_by_payment_method(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        Order::factory()->free()->create([
            'student_id' => $student->id,
            'program_id' => $program->id,
            'class_id' => $class->id,
        ]);
        Order::factory()->create([
            'student_id' => $student->id,
            'program_id' => $program->id,
            'class_id' => $class->id,
            'payment_method' => 'stripe',
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/admin/orders?payment_method=free');

        $response->assertStatus(200);
        $orders = $response->json('orders.data');

        foreach ($orders as $order) {
            $this->assertEquals('free', $order['payment_method']);
        }
    }

    /**
     * Test admin can search orders.
     */
    public function test_admin_can_search_orders(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        Order::factory()->create([
            'student_id' => $student->id,
            'program_id' => $program->id,
            'class_id' => $class->id,
            'customer_email' => 'unique.email@test.com',
        ]);
        Order::factory()->create([
            'student_id' => $student->id,
            'program_id' => $program->id,
            'class_id' => $class->id,
            'customer_email' => 'other@test.com',
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/admin/orders?search=unique.email');

        $response->assertStatus(200);
        $orders = $response->json('orders.data');

        $this->assertCount(1, $orders);
        $this->assertEquals('unique.email@test.com', $orders[0]['customer_email']);
    }

    /**
     * Test admin can view order details.
     */
    public function test_admin_can_view_order_details(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        $order = Order::factory()->create([
            'student_id' => $student->id,
            'program_id' => $program->id,
            'class_id' => $class->id,
        ]);

        $response = $this->actingAs($admin)
            ->getJson("/api/admin/orders/{$order->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'order' => [
                    'id',
                    'customer_email',
                    'total_amount',
                    'status',
                    'payment_method',
                    'student',
                    'program',
                    'class',
                ],
            ]);
    }

    /**
     * Test admin can create manual (free) order.
     */
    public function test_admin_can_create_manual_order(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        // Set default class
        $program->update(['default_class_id' => $class->id]);

        $response = $this->actingAs($admin)
            ->postJson('/api/admin/orders/manual', [
                'program_id' => $program->id,
                'customer_email' => 'new.student@test.com',
                'customer_first_name' => 'New',
                'customer_last_name' => 'Student',
                'customer_gender' => 'male',
                'payment_method' => 'free',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Élève ajouté avec succès.',
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'new.student@test.com',
            'role' => 'student',
        ]);

        $this->assertDatabaseHas('orders', [
            'customer_email' => 'new.student@test.com',
            'payment_method' => 'free',
            'status' => 'paid',
        ]);

        $this->assertDatabaseHas('enrollments', [
            'class_id' => $class->id,
            'status' => 'active',
        ]);
    }

    /**
     * Test manual order requires default class.
     */
    public function test_manual_order_requires_default_class(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create([
            'created_by' => $teacher->id,
            'default_class_id' => null,
        ]);

        $response = $this->actingAs($admin)
            ->postJson('/api/admin/orders/manual', [
                'program_id' => $program->id,
                'customer_email' => 'new.student@test.com',
                'customer_first_name' => 'New',
                'customer_last_name' => 'Student',
                'customer_gender' => 'male',
                'payment_method' => 'free',
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Ce programme n\'a pas de classe par défaut configurée.',
            ]);
    }

    /**
     * Test cannot enroll already enrolled student.
     */
    public function test_cannot_enroll_already_enrolled_student(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);
        $program->update(['default_class_id' => $class->id]);

        // First enrollment
        $this->actingAs($admin)
            ->postJson('/api/admin/orders/manual', [
                'program_id' => $program->id,
                'customer_email' => 'student@test.com',
                'customer_first_name' => 'Test',
                'customer_last_name' => 'Student',
                'customer_gender' => 'female',
                'payment_method' => 'free',
            ]);

        // Try to enroll again
        $response = $this->actingAs($admin)
            ->postJson('/api/admin/orders/manual', [
                'program_id' => $program->id,
                'customer_email' => 'student@test.com',
                'customer_first_name' => 'Test',
                'customer_last_name' => 'Student',
                'customer_gender' => 'female',
                'payment_method' => 'free',
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Cet élève est déjà inscrit à cette classe.',
            ]);
    }

    /**
     * Test admin can update order.
     */
    public function test_admin_can_update_order(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        $order = Order::factory()->pending()->create([
            'student_id' => $student->id,
            'program_id' => $program->id,
            'class_id' => $class->id,
        ]);

        $response = $this->actingAs($admin)
            ->putJson("/api/admin/orders/{$order->id}", [
                'status' => 'paid',
                'admin_notes' => 'Marked as paid manually',
            ]);

        $response->assertStatus(200);

        $order->refresh();
        $this->assertEquals('paid', $order->status);
        $this->assertEquals('Marked as paid manually', $order->admin_notes);
    }

    /**
     * Test admin can delete free order.
     */
    public function test_admin_can_delete_free_order(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        $order = Order::factory()->free()->create([
            'student_id' => $student->id,
            'program_id' => $program->id,
            'class_id' => $class->id,
        ]);

        $response = $this->actingAs($admin)
            ->deleteJson("/api/admin/orders/{$order->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('orders', ['id' => $order->id]);
    }

    /**
     * Test cannot delete order with successful payments.
     */
    public function test_cannot_delete_order_with_payments(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        $order = Order::factory()->create([
            'student_id' => $student->id,
            'program_id' => $program->id,
            'class_id' => $class->id,
            'payment_method' => 'stripe',
        ]);

        // Add a successful payment
        OrderPayment::create([
            'order_id' => $order->id,
            'amount' => 100,
            'installment_number' => 1,
            'status' => 'succeeded',
            'paid_at' => now(),
        ]);

        $response = $this->actingAs($admin)
            ->deleteJson("/api/admin/orders/{$order->id}");

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Impossible de supprimer une commande avec des paiements effectués.',
            ]);
    }

    /**
     * Test admin can get order stats.
     */
    public function test_admin_can_get_order_stats(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        Order::factory()->paid()->create([
            'student_id' => $student->id,
            'program_id' => $program->id,
            'class_id' => $class->id,
            'payment_method' => 'stripe',
        ]);
        Order::factory()->free()->create([
            'student_id' => $student->id,
            'program_id' => $program->id,
            'class_id' => $class->id,
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/admin/orders/stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'stats' => [
                    'total_orders',
                    'paid_orders',
                    'pending_orders',
                    'total_revenue',
                    'orders_by_payment_method',
                ],
            ]);
    }

    /**
     * Test student cannot access orders.
     */
    public function test_student_cannot_access_orders(): void
    {
        $student = User::factory()->create(['role' => 'student']);

        $response = $this->actingAs($student)
            ->getJson('/api/admin/orders');

        $response->assertStatus(403);
    }

    /**
     * Test teacher cannot access orders.
     */
    public function test_teacher_cannot_access_orders(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);

        $response = $this->actingAs($teacher)
            ->getJson('/api/admin/orders');

        $response->assertStatus(403);
    }

    /**
     * Test unauthenticated cannot access orders.
     */
    public function test_unauthenticated_cannot_access_orders(): void
    {
        $response = $this->getJson('/api/admin/orders');
        $response->assertStatus(401);
    }
}
