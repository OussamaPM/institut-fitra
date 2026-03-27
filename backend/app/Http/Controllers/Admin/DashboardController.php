<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClassModel;
use App\Models\Enrollment;
use App\Models\Message;
use App\Models\Order;
use App\Models\OrderPayment;
use App\Models\Program;
use App\Models\Session;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics (cached for 5 minutes)
     */
    public function stats(): JsonResponse
    {
        $stats = Cache::remember('dashboard_stats', 300, function () {
            return [
                'totalUsers' => User::count(),
                'totalStudents' => User::where('role', 'student')->count(),
                'totalTeachers' => User::where('role', 'teacher')->count(),
                'totalAdmins' => User::where('role', 'admin')->count(),
                'totalPrograms' => Program::count(),
                'activePrograms' => Program::where('active', true)->count(),
                'totalClasses' => ClassModel::count(),
                'activeClasses' => ClassModel::where('status', 'ongoing')->count(),
                'totalSessions' => Session::count(),
                'upcomingSessions' => Session::where('status', 'scheduled')
                    ->where('scheduled_at', '>=', now())
                    ->count(),
                'completedSessions' => Session::where('status', 'completed')->count(),
                'totalEnrollments' => Enrollment::count(),
                'activeEnrollments' => Enrollment::where('status', 'active')->count(),
                'pendingEnrollments' => Enrollment::where('status', 'pending')->count(),
            ];
        });

        return response()->json(['stats' => $stats]);
    }

    /**
     * Get recent users
     */
    public function recentUsers(): JsonResponse
    {
        $users = User::with(['studentProfile', 'teacherProfile'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'users' => $users,
        ]);
    }

    /**
     * Get upcoming sessions
     */
    public function upcomingSessions(): JsonResponse
    {
        $sessions = Session::with(['class.program', 'teacher'])
            ->where('status', 'scheduled')
            ->where('scheduled_at', '>=', now())
            ->orderBy('scheduled_at', 'asc')
            ->limit(5)
            ->get();

        return response()->json([
            'sessions' => $sessions,
        ]);
    }

    /**
     * Get recent classes
     */
    public function recentClasses(): JsonResponse
    {
        $classes = ClassModel::with(['program'])
            ->withCount('enrollments')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'classes' => $classes,
        ]);
    }

    /**
     * Get recent enrollments
     */
    public function recentEnrollments(): JsonResponse
    {
        $enrollments = Enrollment::with(['student', 'class.program'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'enrollments' => $enrollments,
        ]);
    }

    /**
     * Get today's sessions for the current admin (if they are also a teacher)
     */
    public function todaySessions(): JsonResponse
    {
        $user = Auth::user();
        $today = Carbon::today();

        $sessions = Session::with(['class.program', 'class.enrollments', 'materials'])
            ->where('teacher_id', $user->id)
            ->whereDate('scheduled_at', $today)
            ->orderBy('scheduled_at', 'asc')
            ->get()
            ->map(function ($session) {
                return [
                    'id' => $session->id,
                    'title' => $session->title,
                    'scheduled_at' => $session->scheduled_at,
                    'duration_minutes' => $session->duration_minutes,
                    'status' => $session->status,
                    'class' => [
                        'id' => $session->class->id,
                        'name' => $session->class->name,
                        'zoom_link' => $session->class->zoom_link,
                        'program' => [
                            'id' => $session->class->program->id,
                            'name' => $session->class->program->name,
                        ],
                        'students_count' => $session->class->enrollments->where('status', 'active')->count(),
                    ],
                    'has_materials' => $session->materials->count() > 0,
                    'materials_count' => $session->materials->count(),
                    'has_replay' => ! empty($session->replay_url),
                ];
            });

        return response()->json([
            'sessions' => $sessions,
            'is_teacher' => true,
        ]);
    }

    /**
     * Get dashboard alerts (failed payments, sessions without replay, etc.)
     * Cached for 2 minutes
     */
    public function alerts(): JsonResponse
    {
        $alerts = Cache::remember('dashboard_alerts', 120, function () {
            // Failed payments (not recovered)
            $failedPayments = OrderPayment::with(['order.student', 'order.program'])
                ->where('status', 'failed')
                ->where('is_recovery_payment', false)
                ->whereDoesntHave('recoveryPayment')
                ->orderBy('updated_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($payment) {
                    return [
                        'id' => $payment->id,
                        'order_id' => $payment->order_id,
                        'amount' => $payment->amount,
                        'installment_number' => $payment->installment_number,
                        'error_message' => $payment->error_message,
                        'updated_at' => $payment->updated_at,
                        'student' => $payment->order->student ? [
                            'id' => $payment->order->student->id,
                            'first_name' => $payment->order->student->first_name,
                            'last_name' => $payment->order->student->last_name,
                            'email' => $payment->order->student->email,
                        ] : [
                            'email' => $payment->order->customer_email,
                        ],
                        'program' => [
                            'id' => $payment->order->program->id,
                            'name' => $payment->order->program->name,
                        ],
                    ];
                });

            // Sessions completed without replay (last 30 days)
            $sessionsWithoutReplay = Session::with(['class.program', 'teacher'])
                ->where('status', 'completed')
                ->whereNull('replay_url')
                ->where('scheduled_at', '>=', Carbon::now()->subDays(30))
                ->orderBy('scheduled_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($session) {
                    return [
                        'id' => $session->id,
                        'title' => $session->title,
                        'scheduled_at' => $session->scheduled_at,
                        'class' => [
                            'id' => $session->class->id,
                            'name' => $session->class->name,
                        ],
                        'program' => [
                            'id' => $session->class->program->id,
                            'name' => $session->class->program->name,
                        ],
                        'teacher' => [
                            'id' => $session->teacher->id,
                            'first_name' => $session->teacher->first_name,
                            'last_name' => $session->teacher->last_name,
                        ],
                    ];
                });

            return [
                'failed_payments' => $failedPayments,
                'failed_payments_count' => OrderPayment::where('status', 'failed')
                    ->where('is_recovery_payment', false)
                    ->whereDoesntHave('recoveryPayment')
                    ->count(),
                'sessions_without_replay' => $sessionsWithoutReplay,
                'sessions_without_replay_count' => Session::where('status', 'completed')
                    ->whereNull('replay_url')
                    ->where('scheduled_at', '>=', Carbon::now()->subDays(30))
                    ->count(),
            ];
        });

        return response()->json($alerts);
    }

    /**
     * Get unread messages count for admin
     */
    public function unreadMessages(): JsonResponse
    {
        $user = Auth::user();

        // Direct messages unread
        $unreadDirectCount = Message::where('receiver_id', $user->id)
            ->whereNull('read_at')
            ->count();

        // Recent unread messages preview
        $recentUnread = Message::with('sender')
            ->where('receiver_id', $user->id)
            ->whereNull('read_at')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($message) {
                return [
                    'id' => $message->id,
                    'content' => mb_strlen($message->content) > 50
                        ? mb_substr($message->content, 0, 50).'...'
                        : $message->content,
                    'created_at' => $message->created_at,
                    'sender' => [
                        'id' => $message->sender->id,
                        'first_name' => $message->sender->first_name,
                        'last_name' => $message->sender->last_name,
                    ],
                ];
            });

        return response()->json([
            'unread_count' => $unreadDirectCount,
            'recent_unread' => $recentUnread,
        ]);
    }

    /**
     * Get recently enrolled students (via Stripe or manual)
     */
    public function recentStudents(): JsonResponse
    {
        // Get students from recent orders (last 7 days)
        $recentOrders = Order::with(['student.studentProfile', 'program', 'class'])
            ->whereIn('status', ['paid', 'partial'])
            ->where('created_at', '>=', Carbon::now()->subDays(7))
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($order) {
                return [
                    'id' => $order->id,
                    'student' => $order->student ? [
                        'id' => $order->student->id,
                        'first_name' => $order->student->first_name,
                        'last_name' => $order->student->last_name,
                        'email' => $order->student->email,
                        'photo_url' => $order->student->studentProfile?->photo_url,
                    ] : [
                        'email' => $order->customer_email,
                        'first_name' => $order->customer_first_name,
                        'last_name' => $order->customer_last_name,
                    ],
                    'program' => [
                        'id' => $order->program->id,
                        'name' => $order->program->name,
                    ],
                    'class' => $order->class ? [
                        'id' => $order->class->id,
                        'name' => $order->class->name,
                    ] : null,
                    'payment_method' => $order->payment_method,
                    'total_amount' => $order->total_amount,
                    'created_at' => $order->created_at,
                ];
            });

        return response()->json([
            'recent_students' => $recentOrders,
            'count' => $recentOrders->count(),
        ]);
    }
}
