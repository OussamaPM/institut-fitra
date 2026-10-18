<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Mail\ClassTransferMail;
use App\Models\Attendance;
use App\Models\ClassModel;
use App\Models\Enrollment;
use App\Models\GroupMember;
use App\Models\LibraryFolder;
use App\Models\LibraryFolderAccess;
use App\Models\MessageGroup;
use App\Models\Order;
use App\Models\Program;
use App\Models\ProgramLevel;
use App\Models\ProgramLevelActivation;
use App\Models\Session;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Changement de classe d'un élève : POST /api/admin/classes/{A}/students/{student}/transfer.
 *
 * Le point critique : les droits sur les niveaux 2+ passent par orders.class_id. Un transfert
 * qui ne déplacerait que l'inscription ferait perdre à l'élève les niveaux qu'il a payés.
 */
class ClassTransferTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $teacher;

    private User $student;

    private Program $program;

    private ClassModel $classA;

    private ClassModel $classB;

    private ProgramLevel $level2;

    private Enrollment $enrollmentA;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->teacher = User::factory()->create(['role' => 'teacher']);
        $this->student = User::factory()->create(['role' => 'student']);
        $this->program = Program::factory()->create(['created_by' => $this->teacher->id]);
        $this->classA = ClassModel::factory()->create(['program_id' => $this->program->id, 'max_students' => null, 'status' => 'ongoing']);
        $this->classB = ClassModel::factory()->create(['program_id' => $this->program->id, 'max_students' => null, 'status' => 'ongoing']);

        $this->level2 = ProgramLevel::create([
            'program_id' => $this->program->id,
            'level_number' => 2,
            'name' => 'Niveau 2',
            'price' => 100,
            'max_installments' => 1,
        ]);

        $this->enrollmentA = Enrollment::factory()->create([
            'student_id' => $this->student->id,
            'class_id' => $this->classA->id,
            'status' => 'active',
            'enrolled_at' => now()->subYear(),
        ]);
    }

    private function activateLevel2On(ClassModel $class): void
    {
        ProgramLevelActivation::create([
            'program_level_id' => $this->level2->id,
            'class_id' => $class->id,
            'start_date' => now(),
            'end_date' => now()->addMonths(6),
            'activated_by' => $this->admin->id,
            'activated_at' => now(),
        ]);
    }

    private function order(array $attributes = []): Order
    {
        return Order::factory()->create(array_merge([
            'student_id' => $this->student->id,
            'program_id' => $this->program->id,
            'class_id' => $this->classA->id,
            'level_number' => 1,
            'program_level_id' => null,
            'status' => 'paid',
        ], $attributes));
    }

    private function level2Order(string $status = 'paid'): Order
    {
        return $this->order(['level_number' => 2, 'program_level_id' => $this->level2->id, 'status' => $status]);
    }

    private function transfer(array $payload = [], ?User $as = null, ?ClassModel $from = null): \Illuminate\Testing\TestResponse
    {
        $from ??= $this->classA;

        return $this->actingAs($as ?? $this->admin)->postJson(
            "/api/admin/classes/{$from->id}/students/{$this->student->id}/transfer",
            array_merge(['target_class_id' => $this->classB->id], $payload),
        );
    }

    // — Transfert nominal ————————————————————————————————————————

    public function test_transfer_closes_source_enrollment_and_activates_target_keeping_seniority(): void
    {
        $this->transfer()->assertOk()
            ->assertJsonPath('transfer.from_class_id', $this->classA->id)
            ->assertJsonPath('transfer.to_class_id', $this->classB->id);

        $source = $this->enrollmentA->fresh();
        $this->assertSame('cancelled', $source->status);
        $this->assertSame($this->classB->id, $source->transferred_to_class_id);
        $this->assertNotNull($source->transferred_at);

        $target = Enrollment::where('student_id', $this->student->id)->where('class_id', $this->classB->id)->first();
        $this->assertSame('active', $target->status);
        $this->assertTrue($target->enrolled_at->equalTo($source->enrolled_at));
    }

    public function test_all_orders_of_the_source_class_are_moved_whatever_their_status(): void
    {
        $this->activateLevel2On($this->classB);
        $base = $this->order();
        $partial = $this->level2Order('partial');
        $failed = $this->order(['status' => 'failed', 'level_number' => 2, 'program_level_id' => $this->level2->id]);
        // Commande d'un autre élève sur A : ne doit pas bouger
        $other = Order::factory()->create(['program_id' => $this->program->id, 'class_id' => $this->classA->id]);

        $this->transfer()->assertOk()->assertJsonPath('transfer.orders_moved', 3);

        foreach ([$base, $partial, $failed] as $order) {
            $this->assertSame($this->classB->id, $order->fresh()->class_id);
            $this->assertStringContainsString('Transférée de', $order->fresh()->admin_notes);
        }
        $this->assertSame($this->classA->id, $other->fresh()->class_id);
    }

    /** Effet observable du déplacement des commandes : l'élève voit le niveau 2 sur B, plus rien de A. */
    public function test_student_sees_paid_level_sessions_of_target_and_nothing_of_source(): void
    {
        $this->activateLevel2On($this->classB);
        $this->order();
        $this->level2Order();

        $sessionA = Session::factory()->create(['class_id' => $this->classA->id, 'teacher_id' => $this->teacher->id]);
        $baseB = Session::factory()->create(['class_id' => $this->classB->id, 'teacher_id' => $this->teacher->id, 'program_level_id' => null]);
        $levelB = Session::factory()->create(['class_id' => $this->classB->id, 'teacher_id' => $this->teacher->id, 'program_level_id' => $this->level2->id]);

        $this->transfer()->assertOk();

        $ids = collect($this->actingAs($this->student)->getJson('/api/sessions')->assertOk()->json('sessions.data'))->pluck('id');
        $this->assertEqualsCanonicalizing([$baseB->id, $levelB->id], $ids->all());
        $this->assertNotContains($sessionA->id, $ids);
    }

    public function test_library_level_2_folder_follows_the_student_to_target_class(): void
    {
        $this->activateLevel2On($this->classB);
        $this->level2Order();

        $folderA = LibraryFolder::factory()->published()->create();
        LibraryFolderAccess::create(['library_folder_id' => $folderA->id, 'class_id' => $this->classA->id, 'level_number' => 2]);
        $folderB = LibraryFolder::factory()->published()->create();
        LibraryFolderAccess::create(['library_folder_id' => $folderB->id, 'class_id' => $this->classB->id, 'level_number' => 2]);

        $this->transfer()->assertOk();

        $visible = LibraryFolder::query()->visibleToStudent($this->student->id)->pluck('id');
        $this->assertContains($folderB->id, $visible);
        $this->assertNotContains($folderA->id, $visible);
    }

    /** Anti double paiement : après transfert, le niveau 2 payé est reconnu sur la classe B. */
    public function test_manual_level_upgrade_on_target_is_refused_after_transfer(): void
    {
        $this->activateLevel2On($this->classB);
        $this->level2Order();

        $this->transfer()->assertOk();

        $this->actingAs($this->admin)->postJson('/api/admin/orders/manual', [
            'program_id' => $this->program->id,
            'class_id' => $this->classB->id,
            'program_level_id' => $this->level2->id,
            'customer_email' => $this->student->email,
            'customer_first_name' => $this->student->first_name,
            'customer_last_name' => $this->student->last_name,
            'payment_method' => 'free',
        ])->assertStatus(422)->assertJsonPath('message', 'Cet élève est déjà inscrit à ce niveau pour cette classe.');
    }

    public function test_history_is_kept(): void
    {
        $sessionA = Session::factory()->create(['class_id' => $this->classA->id, 'teacher_id' => $this->teacher->id]);
        $attendance = Attendance::factory()->create(['session_id' => $sessionA->id, 'student_id' => $this->student->id]);

        $this->transfer()->assertOk();

        $this->assertNotNull($attendance->fresh());
        $this->assertSame($sessionA->id, $attendance->fresh()->session_id);
    }

    public function test_student_imported_without_order_can_be_transferred(): void
    {
        $this->transfer()->assertOk()->assertJsonPath('transfer.orders_moved', 0);
    }

    public function test_existing_cancelled_enrollment_on_target_is_reactivated(): void
    {
        $old = Enrollment::factory()->create([
            'student_id' => $this->student->id,
            'class_id' => $this->classB->id,
            'status' => 'cancelled',
        ]);

        $this->transfer()->assertOk();

        $this->assertSame('active', $old->fresh()->status);
        $this->assertSame(1, Enrollment::where('student_id', $this->student->id)->where('class_id', $this->classB->id)->count());
    }

    // — Niveau payé non activé sur la cible ————————————————————————

    public function test_missing_level_requires_confirmation_and_changes_nothing_without_it(): void
    {
        $order = $this->level2Order();

        $this->transfer()->assertStatus(422)
            ->assertJsonPath('missing_levels.0.program_level_id', $this->level2->id);

        $this->assertSame('active', $this->enrollmentA->fresh()->status);
        $this->assertSame($this->classA->id, $order->fresh()->class_id);
        $this->assertFalse(Enrollment::where('class_id', $this->classB->id)->exists());

        $this->transfer(['confirm_missing_levels' => true])->assertOk()
            ->assertJsonPath('transfer.missing_levels.0.level_number', 2);
        $this->assertSame($this->classB->id, $order->fresh()->class_id);
    }

    // — Refus ————————————————————————————————————————————————————

    public function test_transfer_to_another_program_is_refused(): void
    {
        $other = ClassModel::factory()->create(['status' => 'ongoing', 'max_students' => null]);

        $this->transfer(['target_class_id' => $other->id])->assertStatus(422)
            ->assertJsonPath('message', 'Le changement de classe est limité aux classes du même programme.');
        $this->assertSame('active', $this->enrollmentA->fresh()->status);
    }

    public function test_transfer_to_same_class_is_refused(): void
    {
        $this->transfer(['target_class_id' => $this->classA->id])->assertStatus(422);
        $this->assertSame('active', $this->enrollmentA->fresh()->status);
    }

    public function test_transfer_to_completed_or_cancelled_class_is_refused(): void
    {
        foreach (['completed', 'cancelled'] as $status) {
            $this->classB->update(['status' => $status]);
            $this->transfer()->assertStatus(422)->assertJsonPath('message', 'Cette classe est terminée ou annulée.');
        }
        $this->classB->update(['status' => 'planned']);
        $this->transfer()->assertOk();
    }

    public function test_full_target_class_is_refused_and_inactive_enrollments_do_not_count(): void
    {
        $this->classB->update(['max_students' => 1]);
        Enrollment::factory()->create(['class_id' => $this->classB->id, 'status' => 'cancelled']);
        $occupant = Enrollment::factory()->create(['class_id' => $this->classB->id, 'status' => 'active']);

        $this->transfer()->assertStatus(422)->assertJsonPath('message', 'Cette classe est complète.');

        $occupant->update(['status' => 'cancelled']);
        $this->transfer()->assertOk();
    }

    public function test_student_already_active_on_target_is_refused(): void
    {
        Enrollment::factory()->create(['student_id' => $this->student->id, 'class_id' => $this->classB->id, 'status' => 'active']);

        $this->transfer()->assertStatus(422)->assertJsonPath('message', 'L\'élève est déjà inscrit dans cette classe.');
    }

    public function test_student_not_active_in_source_class_returns_404(): void
    {
        $this->enrollmentA->update(['status' => 'cancelled']);

        $this->transfer()->assertNotFound();
    }

    /** Seul un compte élève est transférable, même si un autre compte a une inscription active. */
    public function test_non_student_account_returns_404(): void
    {
        $this->student->update(['role' => 'teacher']);

        $this->transfer()->assertNotFound();
        $this->assertSame('active', $this->enrollmentA->fresh()->status);
    }

    public function test_second_transfer_from_same_source_is_refused(): void
    {
        $classC = ClassModel::factory()->create(['program_id' => $this->program->id, 'status' => 'ongoing', 'max_students' => null]);

        $this->transfer()->assertOk();
        $this->transfer(['target_class_id' => $classC->id])->assertNotFound();
        $this->assertFalse(Enrollment::where('class_id', $classC->id)->exists());
    }

    // — Groupes de messagerie ————————————————————————————————————

    public function test_class_groups_are_synchronised_and_custom_groups_untouched(): void
    {
        $groupA = MessageGroup::create(['name' => 'Groupe A', 'type' => 'class', 'class_id' => $this->classA->id, 'created_by' => $this->admin->id]);
        $groupB = MessageGroup::create(['name' => 'Groupe B', 'type' => 'class', 'class_id' => $this->classB->id, 'created_by' => $this->admin->id]);
        $custom = MessageGroup::create(['name' => 'Libre', 'type' => 'custom', 'created_by' => $this->admin->id]);
        GroupMember::create(['group_id' => $groupA->id, 'user_id' => $this->student->id, 'joined_at' => now()]);
        GroupMember::create(['group_id' => $custom->id, 'user_id' => $this->student->id, 'joined_at' => now()]);

        $this->transfer()->assertOk()
            ->assertJsonPath('transfer.groups_removed', [$groupA->id])
            ->assertJsonPath('transfer.groups_added', [$groupB->id]);

        $memberOf = GroupMember::where('user_id', $this->student->id)->pluck('group_id')->all();
        $this->assertEqualsCanonicalizing([$groupB->id, $custom->id], $memberOf);
    }

    public function test_groups_untouched_when_sync_disabled(): void
    {
        $groupA = MessageGroup::create(['name' => 'Groupe A', 'type' => 'class', 'class_id' => $this->classA->id, 'created_by' => $this->admin->id]);
        MessageGroup::create(['name' => 'Groupe B', 'type' => 'class', 'class_id' => $this->classB->id, 'created_by' => $this->admin->id]);
        GroupMember::create(['group_id' => $groupA->id, 'user_id' => $this->student->id, 'joined_at' => now()]);

        $this->transfer(['sync_class_groups' => false])->assertOk();

        $this->assertSame([$groupA->id], GroupMember::where('user_id', $this->student->id)->pluck('group_id')->all());
    }

    // — Email —————————————————————————————————————————————————————

    public function test_student_is_notified_by_default_and_not_when_disabled(): void
    {
        $this->transfer()->assertOk();
        Mail::assertSent(ClassTransferMail::class, fn ($mail) => $mail->hasTo($this->student->email));
    }

    public function test_no_email_when_notification_disabled(): void
    {
        $this->transfer(['notify_student' => false])->assertOk();
        Mail::assertNothingSent();
    }

    public function test_mail_failure_does_not_cancel_the_transfer(): void
    {
        Mail::shouldReceive('to')->andThrow(new \RuntimeException('SMTP down'));

        $this->transfer()->assertOk();
        $this->assertSame('cancelled', $this->enrollmentA->fresh()->status);
    }

    public function test_mail_renders_target_class_schedule(): void
    {
        $this->classB->update(['schedule' => [['day' => 'samedi', 'start_time' => '10:00', 'end_time' => '12:00']]]);

        $html = (new ClassTransferMail($this->student, $this->classA, $this->classB->fresh()))->render();

        $this->assertStringContainsString($this->classB->name, $html);
        $this->assertStringContainsString('Samedi', $html);
    }

    // — Aperçu ————————————————————————————————————————————————————

    public function test_options_list_candidates_of_same_program_with_their_eligibility(): void
    {
        $this->level2Order();
        $this->classB->update(['max_students' => 1]);
        Enrollment::factory()->create(['class_id' => $this->classB->id, 'status' => 'active']);
        $classC = ClassModel::factory()->create(['program_id' => $this->program->id, 'status' => 'planned', 'max_students' => null]);
        ClassModel::factory()->create(['program_id' => $this->program->id, 'status' => 'completed']);
        ClassModel::factory()->create(['status' => 'ongoing']); // autre programme

        $options = $this->actingAs($this->admin)
            ->getJson("/api/admin/classes/{$this->classA->id}/students/{$this->student->id}/transfer-options")
            ->assertOk()
            ->assertJsonPath('transfer_options.source_class.id', $this->classA->id)
            ->assertJsonPath('transfer_options.has_base_order', false)
            ->assertJsonCount(1, 'transfer_options.orders')
            ->json('transfer_options.candidates');

        $byId = collect($options)->keyBy('id');
        $this->assertEqualsCanonicalizing([$this->classB->id, $classC->id], $byId->keys()->all());
        $this->assertFalse($byId[$this->classB->id]['eligible']);
        $this->assertTrue($byId[$this->classB->id]['is_full']);
        $this->assertTrue($byId[$classC->id]['eligible']);
        $this->assertSame(2, $byId[$classC->id]['missing_levels'][0]['level_number']);
    }

    // — Effets de bord sur les autres écrans ——————————————————————

    public function test_transferred_enrollment_cannot_be_reactivated_by_hand(): void
    {
        $this->transfer()->assertOk();

        $this->actingAs($this->admin)
            ->putJson("/api/enrollments/{$this->enrollmentA->id}", ['status' => 'active'])
            ->assertStatus(422);
        $this->assertSame('cancelled', $this->enrollmentA->fresh()->status);
    }

    public function test_manual_level_upgrade_on_former_class_is_refused(): void
    {
        $this->activateLevel2On($this->classA);
        $this->transfer()->assertOk();

        $this->actingAs($this->admin)->postJson('/api/admin/orders/manual', [
            'program_id' => $this->program->id,
            'class_id' => $this->classA->id,
            'program_level_id' => $this->level2->id,
            'customer_email' => $this->student->email,
            'customer_first_name' => $this->student->first_name,
            'customer_last_name' => $this->student->last_name,
            'payment_method' => 'free',
        ])->assertStatus(422);
        $this->assertFalse(Order::where('class_id', $this->classA->id)->where('program_level_id', $this->level2->id)->exists());
    }

    public function test_order_of_another_program_attached_to_source_is_not_moved(): void
    {
        $foreign = $this->order(['program_id' => Program::factory()->create(['created_by' => $this->teacher->id])->id]);

        $this->transfer()->assertOk()->assertJsonPath('transfer.orders_moved', 0);
        $this->assertSame($this->classA->id, $foreign->fresh()->class_id);
    }

    public function test_mail_warns_about_levels_not_open_on_target(): void
    {
        $html = (new ClassTransferMail($this->student, $this->classA, $this->classB, [
            ['program_level_id' => $this->level2->id, 'level_number' => 2, 'name' => 'Niveau 2'],
        ]))->render();

        $this->assertStringContainsString('pas encore ouvert dans votre nouvelle classe', $html);
    }

    // — Rôles —————————————————————————————————————————————————————

    public function test_only_admin_can_transfer(): void
    {
        $this->transfer([], $this->teacher)->assertForbidden();
        $this->transfer([], $this->student)->assertForbidden();
        $this->actingAs($this->teacher)
            ->getJson("/api/admin/classes/{$this->classA->id}/students/{$this->student->id}/transfer-options")
            ->assertForbidden();
        $this->assertSame('active', $this->enrollmentA->fresh()->status);
    }

    public function test_guest_is_unauthorized(): void
    {
        $this->postJson("/api/admin/classes/{$this->classA->id}/students/{$this->student->id}/transfer", [
            'target_class_id' => $this->classB->id,
        ])->assertUnauthorized();
    }
}
