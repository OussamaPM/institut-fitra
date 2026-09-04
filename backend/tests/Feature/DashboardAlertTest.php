<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ClassModel;
use App\Models\Order;
use App\Models\OrderPayment;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class DashboardAlertTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    /**
     * Crée un paiement échoué non régularisé (alimente l'alerte « Paiements échoués »).
     */
    private function createFailedPayment(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $program = Program::factory()->create(['created_by' => $teacher->id]);
        $class = ClassModel::factory()->create(['program_id' => $program->id]);

        $order = Order::factory()->create([
            'student_id' => $student->id,
            'program_id' => $program->id,
            'class_id' => $class->id,
        ]);

        OrderPayment::create([
            'order_id' => $order->id,
            'amount' => 100,
            'installment_number' => 1,
            'status' => 'failed',
            'is_recovery_payment' => false,
        ]);
    }

    public function test_alerts_are_visible_by_default(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->createFailedPayment();

        $response = $this->actingAs($admin)->getJson('/api/admin/dashboard/alerts');

        $response->assertStatus(200)
            ->assertJsonPath('failed_payments_count', 1)
            ->assertJsonPath('dismissed', [])
            ->assertJsonPath('restorable', []);
    }

    public function test_admin_can_dismiss_an_alert_type(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->createFailedPayment();

        $this->actingAs($admin)
            ->postJson('/api/admin/dashboard/alerts/dismiss', ['alert_type' => 'failed_payments'])
            ->assertStatus(200);

        $this->assertDatabaseHas('dashboard_alert_dismissals', [
            'user_id' => $admin->id,
            'alert_type' => 'failed_payments',
            'mode' => 'hidden',
        ]);

        Cache::flush();

        $this->actingAs($admin)->getJson('/api/admin/dashboard/alerts')
            ->assertStatus(200)
            ->assertJsonPath('failed_payments_count', 0)
            ->assertJsonPath('failed_payments', [])
            ->assertJsonPath('dismissed', ['failed_payments'])
            ->assertJsonPath('restorable', ['failed_payments']);
    }

    public function test_admin_can_delete_an_alert_permanently(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->createFailedPayment();

        $this->actingAs($admin)
            ->postJson('/api/admin/dashboard/alerts/dismiss', [
                'alert_type' => 'failed_payments',
                'mode' => 'deleted',
            ])
            ->assertStatus(200)
            ->assertJson(['message' => 'Alerte supprimée définitivement.']);

        $this->assertDatabaseHas('dashboard_alert_dismissals', [
            'user_id' => $admin->id,
            'alert_type' => 'failed_payments',
            'mode' => 'deleted',
        ]);

        Cache::flush();

        // Neutralisée comme une alerte masquée, mais sans possibilité de retour
        $this->actingAs($admin)->getJson('/api/admin/dashboard/alerts')
            ->assertJsonPath('failed_payments_count', 0)
            ->assertJsonPath('dismissed', ['failed_payments'])
            ->assertJsonPath('restorable', []);
    }

    public function test_deleted_alert_cannot_be_restored(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->createFailedPayment();

        $this->actingAs($admin)
            ->postJson('/api/admin/dashboard/alerts/dismiss', [
                'alert_type' => 'failed_payments',
                'mode' => 'deleted',
            ]);

        $this->actingAs($admin)
            ->postJson('/api/admin/dashboard/alerts/restore', ['alert_type' => 'failed_payments'])
            ->assertStatus(422);

        $this->assertDatabaseHas('dashboard_alert_dismissals', [
            'user_id' => $admin->id,
            'alert_type' => 'failed_payments',
            'mode' => 'deleted',
        ]);

        Cache::flush();

        $this->actingAs($admin)->getJson('/api/admin/dashboard/alerts')
            ->assertJsonPath('failed_payments_count', 0);
    }

    public function test_dismiss_defaults_to_hidden_mode(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->postJson('/api/admin/dashboard/alerts/dismiss', ['alert_type' => 'sessions_without_replay'])
            ->assertStatus(200)
            ->assertJson(['message' => 'Alerte masquée.']);

        $this->assertDatabaseHas('dashboard_alert_dismissals', [
            'alert_type' => 'sessions_without_replay',
            'mode' => 'hidden',
        ]);
    }

    public function test_dismiss_rejects_unknown_mode(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->postJson('/api/admin/dashboard/alerts/dismiss', [
                'alert_type' => 'failed_payments',
                'mode' => 'nuked',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['mode']);
    }

    public function test_dismissal_is_permanent_even_when_new_items_arrive(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->createFailedPayment();

        $this->actingAs($admin)
            ->postJson('/api/admin/dashboard/alerts/dismiss', ['alert_type' => 'failed_payments']);

        // Un nouveau paiement échoué ne doit pas faire revenir l'alerte
        $this->createFailedPayment();
        Cache::flush();

        $this->actingAs($admin)->getJson('/api/admin/dashboard/alerts')
            ->assertJsonPath('failed_payments_count', 0);
    }

    public function test_dismissal_is_scoped_to_the_admin_who_dismissed(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $otherAdmin = User::factory()->create(['role' => 'admin']);
        $this->createFailedPayment();

        $this->actingAs($admin)
            ->postJson('/api/admin/dashboard/alerts/dismiss', ['alert_type' => 'failed_payments']);

        Cache::flush();

        $this->actingAs($otherAdmin)->getJson('/api/admin/dashboard/alerts')
            ->assertJsonPath('failed_payments_count', 1)
            ->assertJsonPath('dismissed', []);
    }

    public function test_admin_can_restore_a_dismissed_alert(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->createFailedPayment();

        $this->actingAs($admin)
            ->postJson('/api/admin/dashboard/alerts/dismiss', ['alert_type' => 'failed_payments']);

        $this->actingAs($admin)
            ->postJson('/api/admin/dashboard/alerts/restore', ['alert_type' => 'failed_payments'])
            ->assertStatus(200);

        $this->assertDatabaseMissing('dashboard_alert_dismissals', [
            'user_id' => $admin->id,
            'alert_type' => 'failed_payments',
        ]);

        Cache::flush();

        $this->actingAs($admin)->getJson('/api/admin/dashboard/alerts')
            ->assertJsonPath('failed_payments_count', 1)
            ->assertJsonPath('dismissed', [])
            ->assertJsonPath('restorable', []);
    }

    public function test_dismiss_rejects_unknown_alert_type(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->postJson('/api/admin/dashboard/alerts/dismiss', ['alert_type' => 'not_an_alert'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['alert_type']);
    }

    public function test_non_admin_cannot_dismiss_alerts(): void
    {
        $student = User::factory()->create(['role' => 'student']);

        $this->actingAs($student)
            ->postJson('/api/admin/dashboard/alerts/dismiss', ['alert_type' => 'failed_payments'])
            ->assertStatus(403);
    }
}
