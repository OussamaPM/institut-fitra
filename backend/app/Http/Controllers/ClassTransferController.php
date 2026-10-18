<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exceptions\ClassTransferException;
use App\Http\Requests\ClassTransferRequest;
use App\Models\ClassModel;
use App\Models\Enrollment;
use App\Models\User;
use App\Services\ClassTransferService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Changement de classe d'un élève (admin). Toute la logique est dans ClassTransferService.
 */
class ClassTransferController extends Controller
{
    public function __construct(private readonly ClassTransferService $transfers) {}

    /**
     * Aperçu : classes candidates du même programme, commandes et groupes concernés.
     */
    public function options(ClassModel $class, User $student): JsonResponse
    {
        $enrollment = $this->enrollmentOrFail($class, $student);

        return response()->json(['transfer_options' => $this->transfers->options($enrollment)]);
    }

    public function transfer(ClassTransferRequest $request, ClassModel $class, User $student): JsonResponse
    {
        $enrollment = $this->enrollmentOrFail($class, $student);

        try {
            $result = $this->transfers->transfer(
                $enrollment,
                (int) $request->validated('target_class_id'),
                $request->user(),
                $request->boolean('confirm_missing_levels'),
                $request->boolean('sync_class_groups', true),
                $request->boolean('notify_student', true),
            );
        } catch (ClassTransferException $e) {
            return response()->json(['message' => $e->getMessage(), ...$e->context], 422);
        }

        Log::info('Changement de classe', ['student_id' => $student->id, 'by' => $request->user()->id, ...$result['summary']]);

        // Envoi après commit : un email en échec ne doit pas annuler le transfert
        if ($result['mail'] !== null) {
            try {
                Mail::to($student->email)->send($result['mail']);
            } catch (\Exception $e) {
                Log::error('Class transfer email error: '.$e->getMessage());
            }
        }

        return response()->json([
            'message' => 'L\'élève a été transféré avec succès.',
            'enrollment' => $result['enrollment'],
            'transfer' => $result['summary'],
        ]);
    }

    private function enrollmentOrFail(ClassModel $class, User $student): Enrollment
    {
        $enrollment = $student->role === 'student' ? $this->transfers->activeEnrollment($class, $student) : null;

        abort_if($enrollment === null, 404, 'Cet élève n\'est pas inscrit dans cette classe.');

        return $enrollment;
    }
}
