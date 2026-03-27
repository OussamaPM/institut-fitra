<?php

declare(strict_types=1);

use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\Auth\ForgotPasswordController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\MeController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\ClassController;
use App\Http\Controllers\ContactMessageController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\MessageGroupController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProgramController;
use App\Http\Controllers\ProgramLevelController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\SessionMaterialController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\StudentProfileController;
use App\Http\Controllers\StudentReinscriptionController;
use App\Http\Controllers\StudentTrackingController;
use App\Http\Controllers\TrackingFormController;
use Illuminate\Support\Facades\Route;

// Public Authentication routes
Route::prefix('auth')->group(function (): void {
    Route::post('/register', [RegisterController::class, 'register']);
    Route::post('/login', [LoginController::class, 'login']);
    Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLink']);
    Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword']);
});

// Public Programs routes (view only)
Route::get('/programs', [ProgramController::class, 'index']);
Route::get('/sessions/{session}', [SessionController::class, 'show'])->middleware('auth:sanctum');

// Public Contact route
Route::post('/contact', [ContactMessageController::class, 'store']);

// Protected routes
Route::middleware('auth:sanctum')->group(function (): void {
    // Auth routes
    Route::prefix('auth')->group(function (): void {
        Route::post('/logout', [LoginController::class, 'logout']);
        Route::get('/me', [MeController::class, 'show']);
    });

    // Student routes - Enrollments, Sessions, Attendance & Profile
    Route::middleware('role:student')->group(function (): void {
        Route::get('/enrollments', [EnrollmentController::class, 'index']);
        Route::get('/sessions', [SessionController::class, 'index']);
        Route::get('/attendance/history', [AttendanceController::class, 'studentHistory']);

        // Student profile management
        Route::put('/student/profile', [StudentProfileController::class, 'update']);
        Route::post('/student/profile/photo', [StudentProfileController::class, 'updatePhoto']);
        Route::delete('/student/profile/photo', [StudentProfileController::class, 'removePhoto']);

        // Student tracking forms (Mon suivi)
        Route::get('/student/tracking', [StudentTrackingController::class, 'index']);
        Route::get('/student/tracking/pending-count', [StudentTrackingController::class, 'pendingCount']);
        Route::get('/student/tracking/history', [StudentTrackingController::class, 'history']);
        Route::get('/student/tracking/{trackingForm}', [StudentTrackingController::class, 'show']);
        Route::post('/student/tracking/{trackingForm}/submit', [StudentTrackingController::class, 'submit']);

        // Student materials (Supports de cours)
        Route::get('/student/materials', [SessionMaterialController::class, 'studentIndex']);
        Route::get('/sessions/{session}/materials', [SessionMaterialController::class, 'sessionMaterials']);
        Route::get('/materials/{material}/download', [SessionMaterialController::class, 'download']);

        // Student reinscription (Réinscription aux niveaux supérieurs)
        Route::get('/student/reinscriptions', [StudentReinscriptionController::class, 'index']);
        Route::get('/student/levels-history', [StudentReinscriptionController::class, 'history']);
        Route::post('/checkout/reinscription', [CheckoutController::class, 'createReinscriptionSession']);

        // Student failed payments (Paiements échoués / Régularisation)
        Route::get('/student/failed-payments', [CheckoutController::class, 'getFailedPayments']);
        Route::get('/student/payment-history', [CheckoutController::class, 'getPaymentHistory']);
        Route::post('/checkout/recovery', [CheckoutController::class, 'createRecoverySession']);

        // Stripe Customer Portal (Gestion carte bancaire)
        Route::post('/student/stripe-portal', [CheckoutController::class, 'createPortalSession']);
    });

    // Messaging routes - All authenticated users
    Route::prefix('messages')->group(function (): void {
        // Direct messages
        Route::get('/conversations', [MessageController::class, 'conversations']);
        Route::get('/users/{user}', [MessageController::class, 'show']);
        Route::post('/', [MessageController::class, 'store']);
        Route::get('/unread-count', [MessageController::class, 'unreadCount']);
        Route::post('/users/{user}/mark-read', [MessageController::class, 'markAsRead']);
        Route::get('/available-users', [MessageController::class, 'availableUsers']);
        Route::get('/{message}/attachment', [MessageController::class, 'downloadAttachment']);

        // Group messages
        Route::get('/groups', [MessageGroupController::class, 'index']);
        Route::post('/groups', [MessageGroupController::class, 'store']);
        Route::get('/groups/{messageGroup}', [MessageGroupController::class, 'show']);
        Route::put('/groups/{messageGroup}', [MessageGroupController::class, 'update']);
        Route::post('/groups/{messageGroup}/messages', [MessageGroupController::class, 'sendMessage']);
        Route::post('/groups/{messageGroup}/members', [MessageGroupController::class, 'addMembers']);
        Route::delete('/groups/{messageGroup}/members/{userId}', [MessageGroupController::class, 'removeMember']);
        Route::delete('/groups/{messageGroup}', [MessageGroupController::class, 'destroy']);
    });

    // Notifications routes - All authenticated users
    Route::prefix('notifications')->group(function (): void {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('/{notification}/mark-read', [NotificationController::class, 'markAsRead']);
        Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
        Route::post('/mark-type-read/{type}', [NotificationController::class, 'markTypeAsRead']);
        Route::delete('/{notification}', [NotificationController::class, 'destroy']);
        Route::delete('/read/all', [NotificationController::class, 'destroyRead']);
    });

    // Teacher/Admin routes - Programs, Classes & Sessions management
    Route::middleware('role:teacher')->group(function (): void {
        // Must be before /programs/{program} to avoid route conflict
        Route::get('/programs/teachers', [ProgramController::class, 'getTeachers']);
        Route::post('/programs', [ProgramController::class, 'store']);
        Route::put('/programs/{program}', [ProgramController::class, 'update']);
        Route::delete('/programs/{program}', [ProgramController::class, 'destroy']);

        // Program levels management (Niveaux de programme)
        Route::get('/programs/{program}/levels', [ProgramLevelController::class, 'index']);
        Route::post('/programs/{program}/levels', [ProgramLevelController::class, 'store']);
        Route::get('/programs/{program}/levels/{level}', [ProgramLevelController::class, 'show']);
        Route::put('/programs/{program}/levels/{level}', [ProgramLevelController::class, 'update']);
        Route::delete('/programs/{program}/levels/{level}', [ProgramLevelController::class, 'destroy']);
        Route::post('/programs/{program}/levels/{level}/activate', [ProgramLevelController::class, 'activate']);
        Route::post('/programs/{program}/levels/{level}/deactivate', [ProgramLevelController::class, 'deactivate']);

        // Classes management
        Route::get('/classes', [ClassController::class, 'index']);
        Route::get('/classes/{class}', [ClassController::class, 'show']);
        Route::post('/classes', [ClassController::class, 'store']);
        Route::put('/classes/{class}', [ClassController::class, 'update']);
        Route::delete('/classes/{class}', [ClassController::class, 'destroy']);
        Route::get('/classes/{class}/students', [ClassController::class, 'students']);
        Route::post('/classes/{class}/generate-sessions', [ClassController::class, 'generateSessions']);
        Route::post('/classes/{class}/regenerate-sessions', [ClassController::class, 'regenerateSessions']);

        Route::post('/sessions', [SessionController::class, 'store']);
        Route::put('/sessions/{session}', [SessionController::class, 'update']);
        Route::delete('/sessions/{session}', [SessionController::class, 'destroy']);

        // Attendance management
        Route::get('/sessions/{session}/attendance', [AttendanceController::class, 'index']);
        Route::post('/sessions/{session}/attendance', [AttendanceController::class, 'markAttendance']);

        // Session materials management (Supports de cours)
        Route::get('/materials', [SessionMaterialController::class, 'index']);
        Route::post('/sessions/{session}/materials', [SessionMaterialController::class, 'store']);
        Route::delete('/materials/{material}', [SessionMaterialController::class, 'destroy']);
        Route::get('/materials/{material}/download', [SessionMaterialController::class, 'download']);
    });

    // Admin only routes - Enrollments & Users management
    Route::middleware('role:admin')->group(function (): void {
        // Dashboard
        Route::get('/admin/dashboard/stats', [DashboardController::class, 'stats']);
        Route::get('/admin/dashboard/recent-users', [DashboardController::class, 'recentUsers']);
        Route::get('/admin/dashboard/upcoming-sessions', [DashboardController::class, 'upcomingSessions']);
        Route::get('/admin/dashboard/recent-classes', [DashboardController::class, 'recentClasses']);
        Route::get('/admin/dashboard/recent-enrollments', [DashboardController::class, 'recentEnrollments']);
        Route::get('/admin/dashboard/today-sessions', [DashboardController::class, 'todaySessions']);
        Route::get('/admin/dashboard/alerts', [DashboardController::class, 'alerts']);
        Route::get('/admin/dashboard/unread-messages', [DashboardController::class, 'unreadMessages']);
        Route::get('/admin/dashboard/recent-students', [DashboardController::class, 'recentStudents']);

        // Enrollments
        Route::get('/admin/enrollments', [EnrollmentController::class, 'adminIndex']);
        Route::get('/admin/enrollments/{enrollment}', [EnrollmentController::class, 'show']);
        Route::post('/enrollments', [EnrollmentController::class, 'store']);
        Route::put('/enrollments/{enrollment}', [EnrollmentController::class, 'update']);
        Route::delete('/enrollments/{enrollment}', [EnrollmentController::class, 'destroy']);

        // Users management
        Route::get('/admin/users', [UserController::class, 'index']);
        Route::get('/admin/users/{user}', [UserController::class, 'show']);
        Route::post('/admin/users', [UserController::class, 'store']);
        Route::put('/admin/users/{user}', [UserController::class, 'update']);
        Route::delete('/admin/users/{user}', [UserController::class, 'destroy']);

        // Contact messages management
        Route::get('/admin/contact-messages', [ContactMessageController::class, 'index']);
        Route::get('/admin/contact-messages/{contactMessage}', [ContactMessageController::class, 'show']);
        Route::put('/admin/contact-messages/{contactMessage}', [ContactMessageController::class, 'update']);
        Route::delete('/admin/contact-messages/{contactMessage}', [ContactMessageController::class, 'destroy']);

        // Orders management
        Route::get('/admin/orders', [OrderController::class, 'index']);
        Route::get('/admin/orders/stats', [OrderController::class, 'stats']);
        Route::get('/admin/orders/{order}', [OrderController::class, 'show']);
        Route::post('/admin/orders/manual', [OrderController::class, 'storeManual']);
        Route::put('/admin/orders/{order}', [OrderController::class, 'update']);
        Route::delete('/admin/orders/{order}', [OrderController::class, 'destroy']);

        // Tracking forms management (Formulaires de suivi)
        Route::get('/admin/tracking-forms', [TrackingFormController::class, 'index']);
        Route::get('/admin/tracking-forms/students', [TrackingFormController::class, 'availableStudents']);
        Route::post('/admin/tracking-forms', [TrackingFormController::class, 'store']);
        Route::get('/admin/tracking-forms/{trackingForm}', [TrackingFormController::class, 'show']);
        Route::put('/admin/tracking-forms/{trackingForm}', [TrackingFormController::class, 'update']);
        Route::delete('/admin/tracking-forms/{trackingForm}', [TrackingFormController::class, 'destroy']);
        Route::post('/admin/tracking-forms/{trackingForm}/toggle-active', [TrackingFormController::class, 'toggleActive']);
        Route::post('/admin/tracking-forms/{trackingForm}/assign', [TrackingFormController::class, 'assign']);
        Route::get('/admin/tracking-forms/{trackingForm}/assignments', [TrackingFormController::class, 'assignments']);
        Route::get('/admin/tracking-forms/{trackingForm}/students/{student}', [TrackingFormController::class, 'studentResponses']);

        // Student tracking history (for admin - student profile)
        Route::get('/admin/students/{student}/tracking', [StudentTrackingController::class, 'studentTracking']);

        // Student levels history (for admin - student profile)
        Route::get('/admin/students/{student}/levels-history', [StudentReinscriptionController::class, 'studentHistory']);

        // Settings management (Configuration)
        Route::get('/admin/settings', [SettingController::class, 'index']);
        Route::put('/admin/settings', [SettingController::class, 'update']);
    });
});

// Public Checkout routes (Stripe)
Route::post('/checkout/create-session', [CheckoutController::class, 'createCheckoutSession']);
Route::post('/stripe/webhook', [CheckoutController::class, 'handleWebhook']);
Route::get('/checkout/status', [CheckoutController::class, 'getCheckoutStatus']);

// Public program detail route - Must be at the end to avoid conflicts with specific routes
Route::get('/programs/{program}', [ProgramController::class, 'show']);

// Public settings route (Coming Soon status)
Route::get('/settings/coming-soon', [SettingController::class, 'getComingSoonStatus']);
