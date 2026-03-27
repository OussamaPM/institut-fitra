<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MessageTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test admin can get conversations list.
     */
    public function test_admin_can_get_conversations(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        // Create a message from admin to student
        Message::create([
            'sender_id' => $admin->id,
            'receiver_id' => $student->id,
            'content' => 'Hello student',
            'sent_at' => now(),
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/messages/conversations');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'conversations' => [
                    '*' => ['user', 'last_message', 'unread_count'],
                ],
            ]);
    }

    /**
     * Test teacher can get conversations list.
     */
    public function test_teacher_can_get_conversations(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $student = User::factory()->create(['role' => 'student']);

        Message::create([
            'sender_id' => $teacher->id,
            'receiver_id' => $student->id,
            'content' => 'Hello student',
            'sent_at' => now(),
        ]);

        $response = $this->actingAs($teacher)
            ->getJson('/api/messages/conversations');

        $response->assertStatus(200)
            ->assertJsonStructure(['conversations']);
    }

    /**
     * Test student can only see conversations initiated by admins.
     */
    public function test_student_sees_only_admin_initiated_conversations(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $teacher = User::factory()->create(['role' => 'teacher']);
        $student = User::factory()->create(['role' => 'student']);

        // Admin sends message to student (should be visible)
        Message::create([
            'sender_id' => $admin->id,
            'receiver_id' => $student->id,
            'content' => 'Admin message',
            'sent_at' => now(),
        ]);

        // Teacher sends message to student (should NOT be visible to student)
        Message::create([
            'sender_id' => $teacher->id,
            'receiver_id' => $student->id,
            'content' => 'Teacher message',
            'sent_at' => now(),
        ]);

        $response = $this->actingAs($student)
            ->getJson('/api/messages/conversations');

        $response->assertStatus(200);
        $conversations = $response->json('conversations');

        // Student should only see conversation with admin
        $this->assertCount(1, $conversations);
        $this->assertEquals($admin->id, $conversations[0]['user']['id']);
    }

    /**
     * Test admin can send message to any user.
     */
    public function test_admin_can_send_message_to_any_user(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        $response = $this->actingAs($admin)
            ->postJson('/api/messages', [
                'receiver_id' => $student->id,
                'content' => 'Hello student!',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Message envoyé avec succès.',
            ]);

        $this->assertDatabaseHas('messages', [
            'sender_id' => $admin->id,
            'receiver_id' => $student->id,
            'content' => 'Hello student!',
        ]);
    }

    /**
     * Test student can reply to admin who contacted them first.
     */
    public function test_student_can_reply_to_admin_who_contacted_first(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        // Admin initiates contact
        Message::create([
            'sender_id' => $admin->id,
            'receiver_id' => $student->id,
            'content' => 'Hello student',
            'sent_at' => now(),
        ]);

        // Student replies
        $response = $this->actingAs($student)
            ->postJson('/api/messages', [
                'receiver_id' => $admin->id,
                'content' => 'Hello admin!',
            ]);

        $response->assertStatus(201);
    }

    /**
     * Test student cannot initiate conversation.
     */
    public function test_student_cannot_initiate_conversation(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        // Student tries to initiate (no prior contact from admin)
        $response = $this->actingAs($student)
            ->postJson('/api/messages', [
                'receiver_id' => $admin->id,
                'content' => 'Hello admin!',
            ]);

        $response->assertStatus(403);
    }

    /**
     * Test user cannot send message to themselves.
     */
    public function test_cannot_send_message_to_self(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)
            ->postJson('/api/messages', [
                'receiver_id' => $admin->id,
                'content' => 'Hello me!',
            ]);

        $response->assertStatus(422);
    }

    /**
     * Test message requires content.
     */
    public function test_message_requires_content(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        $response = $this->actingAs($admin)
            ->postJson('/api/messages', [
                'receiver_id' => $student->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['content']);
    }

    /**
     * Test message requires receiver.
     */
    public function test_message_requires_receiver(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)
            ->postJson('/api/messages', [
                'content' => 'Hello!',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['receiver_id']);
    }

    /**
     * Test admin can view messages with user.
     */
    public function test_admin_can_view_messages_with_user(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        Message::create([
            'sender_id' => $admin->id,
            'receiver_id' => $student->id,
            'content' => 'Hello student',
            'sent_at' => now(),
        ]);

        $response = $this->actingAs($admin)
            ->getJson("/api/messages/users/{$student->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'messages',
                'other_user',
            ]);
    }

    /**
     * Test student can view messages only with admin who contacted first.
     */
    public function test_student_can_view_messages_with_admin_who_contacted(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        // Admin initiates contact
        Message::create([
            'sender_id' => $admin->id,
            'receiver_id' => $student->id,
            'content' => 'Hello student',
            'sent_at' => now(),
        ]);

        $response = $this->actingAs($student)
            ->getJson("/api/messages/users/{$admin->id}");

        $response->assertStatus(200);
    }

    /**
     * Test student cannot view messages with admin who didn't contact first.
     */
    public function test_student_cannot_view_messages_without_prior_contact(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        // No prior contact
        $response = $this->actingAs($student)
            ->getJson("/api/messages/users/{$admin->id}");

        $response->assertStatus(403);
    }

    /**
     * Test unread count endpoint.
     */
    public function test_unread_count(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        // Create unread message
        Message::create([
            'sender_id' => $admin->id,
            'receiver_id' => $student->id,
            'content' => 'Unread message',
            'sent_at' => now(),
            'read_at' => null,
        ]);

        $response = $this->actingAs($student)
            ->getJson('/api/messages/unread-count');

        $response->assertStatus(200)
            ->assertJsonStructure(['unread_count']);

        $this->assertGreaterThanOrEqual(1, $response->json('unread_count'));
    }

    /**
     * Test mark messages as read.
     */
    public function test_mark_messages_as_read(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        // Create unread message
        $message = Message::create([
            'sender_id' => $admin->id,
            'receiver_id' => $student->id,
            'content' => 'Unread message',
            'sent_at' => now(),
            'read_at' => null,
        ]);

        $response = $this->actingAs($student)
            ->postJson("/api/messages/users/{$admin->id}/mark-read");

        $response->assertStatus(200);

        $message->refresh();
        $this->assertNotNull($message->read_at);
    }

    /**
     * Test students get empty available users list.
     */
    public function test_students_get_empty_available_users(): void
    {
        $student = User::factory()->create(['role' => 'student']);

        $response = $this->actingAs($student)
            ->getJson('/api/messages/available-users');

        $response->assertStatus(200)
            ->assertJson(['users' => []]);
    }

    /**
     * Test admin can get all available users.
     */
    public function test_admin_can_get_available_users(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->create(['role' => 'student']);
        User::factory()->create(['role' => 'teacher']);

        $response = $this->actingAs($admin)
            ->getJson('/api/messages/available-users');

        $response->assertStatus(200)
            ->assertJsonStructure(['users']);

        // Should not include self
        $users = collect($response->json('users'));
        $this->assertFalse($users->contains('id', $admin->id));
    }

    /**
     * Test unauthenticated user cannot access messages.
     */
    public function test_unauthenticated_cannot_access_messages(): void
    {
        $response = $this->getJson('/api/messages/conversations');
        $response->assertStatus(401);

        $response = $this->postJson('/api/messages', []);
        $response->assertStatus(401);
    }
}
