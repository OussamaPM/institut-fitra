<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        // Check if user is authenticated
        if (! $request->user()) {
            return response()->json([
                'message' => 'Non authentifié.',
            ], 401);
        }

        // Get user role
        $userRole = $request->user()->role;

        // Admin has access to everything
        if ($userRole === 'admin') {
            return $next($request);
        }

        // Teacher has access to teacher and student routes
        if ($userRole === 'teacher' && in_array('student', $roles)) {
            return $next($request);
        }

        // Check if user has required role
        if (! in_array($userRole, $roles)) {
            return response()->json([
                'message' => 'Accès non autorisé. Permissions insuffisantes.',
            ], 403);
        }

        return $next($request);
    }
}
