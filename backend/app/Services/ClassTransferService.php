<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ClassTransferException;
use App\Mail\ClassTransferMail;
use App\Models\ClassModel;
use App\Models\Enrollment;
use App\Models\GroupMember;
use App\Models\MessageGroup;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Changement de classe d'un élève, à l'intérieur d'un même programme.
 *
 * Les droits d'un élève sur une classe reposent sur deux tables : son inscription
 * (niveau de base) et ses commandes, rattachées à la classe par `orders.class_id`
 * (niveaux 2+ : sessions, supports, replays, bibliothèque). Un transfert déplace donc
 * l'inscription ET toutes les commandes, sinon les niveaux payés seraient perdus.
 *
 * L'aperçu (options) et l'exécution (transfer) partagent les mêmes règles (evaluate) :
 * ce que l'admin voit ne peut pas diverger de ce que le serveur refuse.
 */
class ClassTransferService
{
    private const TARGET_STATUSES = ['planned', 'ongoing'];

    private const PAID_STATUSES = ['paid', 'partial'];

    /**
     * Inscription active de l'élève dans la classe, ou null.
     */
    public function activeEnrollment(ClassModel $class, User $student): ?Enrollment
    {
        return Enrollment::where('class_id', $class->id)
            ->where('student_id', $student->id)
            ->where('status', 'active')
            ->first();
    }

    /**
     * Aperçu affiché à l'admin avant confirmation.
     *
     * @return array<string, mixed>
     */
    public function options(Enrollment $enrollment): array
    {
        $enrollment->loadMissing(['student', 'class']);
        $source = $enrollment->class;

        $orders = Order::where('student_id', $enrollment->student_id)
            ->where('class_id', $source->id)
            ->where('program_id', $source->program_id)
            ->with('programLevel')
            ->orderBy('level_number')
            ->get();

        $candidates = ClassModel::where('program_id', $source->program_id)
            ->where('id', '!=', $source->id)
            ->whereIn('status', self::TARGET_STATUSES)
            ->orderBy('start_date')
            ->get()
            ->map(function (ClassModel $target) use ($enrollment) {
                $evaluation = $this->evaluate($enrollment, $target);

                return [
                    'id' => $target->id,
                    'name' => $target->name,
                    'academic_year' => $target->academic_year,
                    'status' => $target->status,
                    'start_date' => $target->start_date?->toDateString(),
                    'end_date' => $target->end_date?->toDateString(),
                    'max_students' => $target->max_students,
                    'enrolled_count' => $evaluation['enrolled_count'],
                    'is_full' => $evaluation['is_full'],
                    'already_enrolled' => $evaluation['already_enrolled'],
                    'current_level_number' => $target->current_period['level_number'] ?? 1,
                    'missing_levels' => $evaluation['missing_levels'],
                    'target_groups' => $this->classGroups($target->id)->map->only(['id', 'name'])->values(),
                    'eligible' => $evaluation['blocking_reason'] === null,
                    'blocking_reason' => $evaluation['blocking_reason'],
                ];
            })
            ->values();

        return [
            'student' => $enrollment->student->only(['id', 'first_name', 'last_name', 'email']),
            'source_class' => $source->only(['id', 'name', 'academic_year']),
            'orders' => $orders->map(fn (Order $order) => [
                'id' => $order->id,
                'level_number' => $order->level_number,
                'program_level_id' => $order->program_level_id,
                'level_name' => $order->programLevel?->name,
                'status' => $order->status,
                'payment_method' => $order->payment_method,
                'total_amount' => $order->total_amount,
            ])->values(),
            'has_base_order' => $orders->contains(fn (Order $order) => $order->program_level_id === null),
            'source_groups' => $this->classGroups($source->id)
                ->filter(fn (MessageGroup $group) => $this->isMember($group->id, $enrollment->student_id))
                ->map->only(['id', 'name'])
                ->values(),
            'candidates' => $candidates,
        ];
    }

    /**
     * Règles d'éligibilité d'une classe cible.
     *
     * @return array{blocking_reason: ?string, missing_levels: array<int, array<string, mixed>>, enrolled_count: int, is_full: bool, already_enrolled: bool}
     */
    public function evaluate(Enrollment $enrollment, ClassModel $target): array
    {
        $enrollment->loadMissing('class');
        $source = $enrollment->class;

        $enrolledCount = Enrollment::where('class_id', $target->id)->where('status', 'active')->count();
        $isFull = $target->max_students !== null && $enrolledCount >= $target->max_students;
        $alreadyEnrolled = Enrollment::where('class_id', $target->id)
            ->where('student_id', $enrollment->student_id)
            ->where('status', 'active')
            ->exists();

        $reason = match (true) {
            $target->id === $source->id => 'L\'élève est déjà dans cette classe.',
            $target->program_id !== $source->program_id => 'Le changement de classe est limité aux classes du même programme.',
            ! in_array($target->status, self::TARGET_STATUSES, true) => 'Cette classe est terminée ou annulée.',
            $alreadyEnrolled => 'L\'élève est déjà inscrit dans cette classe.',
            $isFull => 'Cette classe est complète.',
            default => null,
        };

        return [
            'blocking_reason' => $reason,
            'missing_levels' => $this->missingLevels($enrollment, $target),
            'enrolled_count' => $enrolledCount,
            'is_full' => $isFull,
            'already_enrolled' => $alreadyEnrolled,
        ];
    }

    /**
     * Exécute le transfert dans une transaction. L'email éventuel est renvoyé, pas envoyé :
     * le contrôleur l'envoie après le commit (un échec d'envoi n'annule pas le transfert).
     *
     * @return array{summary: array<string, mixed>, enrollment: Enrollment, mail: ?ClassTransferMail}
     *
     * @throws ClassTransferException
     */
    public function transfer(
        Enrollment $enrollment,
        int $targetClassId,
        User $admin,
        bool $confirmMissingLevels = false,
        bool $syncClassGroups = true,
        bool $notifyStudent = true,
    ): array {
        return DB::transaction(function () use ($enrollment, $targetClassId, $admin, $confirmMissingLevels, $syncClassGroups, $notifyStudent) {
            // Verrous puis revérification : deux transferts simultanés ne doivent ni
            // traiter deux fois la même inscription ni dépasser la capacité de la cible.
            $source = Enrollment::whereKey($enrollment->id)->lockForUpdate()->first();
            if ($source === null || $source->status !== 'active') {
                throw new ClassTransferException('Cette inscription n\'est plus active.');
            }

            // Sous MySQL (REPEATABLE READ), le comptage de capacité d'evaluate() ne voit les
            // transferts concurrents que si aucune lecture non verrouillante ne le précède dans
            // la transaction : ne pas insérer de requête simple avant ces deux verrous.
            $target = ClassModel::whereKey($targetClassId)->lockForUpdate()->firstOrFail();
            $sourceClass = $source->class;

            $evaluation = $this->evaluate($source, $target);
            if ($evaluation['blocking_reason'] !== null) {
                throw new ClassTransferException($evaluation['blocking_reason']);
            }
            if ($evaluation['missing_levels'] !== [] && ! $confirmMissingLevels) {
                throw new ClassTransferException(
                    'L\'élève a payé un niveau qui n\'est pas activé sur la classe de destination. Confirmez pour continuer.',
                    ['missing_levels' => $evaluation['missing_levels']],
                );
            }

            $now = now();

            // 1. Inscription d'origine : clôturée avec sa trace (jamais supprimée)
            $source->update([
                'status' => 'cancelled',
                'transferred_to_class_id' => $target->id,
                'transferred_at' => $now,
            ]);

            // 2. Inscription d'arrivée : réactivée si elle existe déjà (unique student/class),
            //    sinon créée. L'ancienneté (enrolled_at) de l'élève est conservée.
            $targetEnrollment = Enrollment::updateOrCreate(
                ['student_id' => $source->student_id, 'class_id' => $target->id],
                [
                    'status' => 'active',
                    'enrolled_at' => $source->enrolled_at ?? $now,
                    'expires_at' => $source->expires_at,
                    'transferred_to_class_id' => null,
                    'transferred_at' => null,
                ],
            );

            // 3. Toutes les commandes de l'élève sur la classe d'origine, quel que soit leur
            //    statut : une régularisation future doit ouvrir l'accès sur la nouvelle classe.
            $note = sprintf(
                'Transférée de « %s » vers « %s » le %s par %s.',
                $sourceClass->name,
                $target->name,
                $now->format('d/m/Y'),
                trim($admin->first_name.' '.$admin->last_name) ?: $admin->email,
            );
            // Filtre programme : une commande d'un autre programme mal rattachée à A ne doit pas
            // partir vers B (classe d'un programme qui n'est pas le sien).
            $orders = Order::where('student_id', $source->student_id)
                ->where('class_id', $sourceClass->id)
                ->where('program_id', $sourceClass->program_id)
                ->get();
            foreach ($orders as $order) {
                $order->update([
                    'class_id' => $target->id,
                    'admin_notes' => trim(($order->admin_notes ? $order->admin_notes."\n" : '').$note),
                ]);
            }

            // 4. Groupes de messagerie de type « classe » (les groupes custom/programme sont laissés tels quels)
            $groupsRemoved = [];
            $groupsAdded = [];
            if ($syncClassGroups) {
                $sourceGroupIds = $this->classGroups($sourceClass->id)->pluck('id');
                $groupsRemoved = GroupMember::where('user_id', $source->student_id)
                    ->whereIn('group_id', $sourceGroupIds)
                    ->pluck('group_id')
                    ->all();
                GroupMember::where('user_id', $source->student_id)
                    ->whereIn('group_id', $groupsRemoved)
                    ->delete();

                foreach ($this->classGroups($target->id) as $group) {
                    $member = GroupMember::firstOrCreate(
                        ['group_id' => $group->id, 'user_id' => $source->student_id],
                        ['joined_at' => $now],
                    );
                    if ($member->wasRecentlyCreated) {
                        $groupsAdded[] = $group->id;
                    }
                }
            }

            $student = $source->student;

            return [
                'summary' => [
                    'from_class_id' => $sourceClass->id,
                    'to_class_id' => $target->id,
                    'orders_moved' => $orders->count(),
                    'groups_removed' => $groupsRemoved,
                    'groups_added' => $groupsAdded,
                    'missing_levels' => $evaluation['missing_levels'],
                    'student_notified' => $notifyStudent,
                ],
                'enrollment' => $targetEnrollment->fresh(['class']),
                'mail' => $notifyStudent
                    ? new ClassTransferMail($student, $sourceClass, $target, $evaluation['missing_levels'])
                    : null,
            ];
        });
    }

    /**
     * Niveaux payés (paid/partial) sur la classe d'origine qui ne sont pas activés sur la cible :
     * l'élève n'en verra rien tant que l'admin ne les y active pas.
     *
     * @return array<int, array{program_level_id: int, level_number: int, name: ?string}>
     */
    private function missingLevels(Enrollment $enrollment, ClassModel $target): array
    {
        $activatedOnTarget = $target->levelActivations()->pluck('program_level_id')->all();

        return Order::where('student_id', $enrollment->student_id)
            ->where('class_id', $enrollment->class_id)
            ->where('program_id', $target->program_id)
            ->whereIn('status', self::PAID_STATUSES)
            ->whereNotNull('program_level_id')
            ->whereNotIn('program_level_id', $activatedOnTarget)
            ->with('programLevel')
            ->get()
            ->unique('program_level_id')
            ->map(fn (Order $order) => [
                'program_level_id' => $order->program_level_id,
                'level_number' => $order->level_number,
                'name' => $order->programLevel?->name,
            ])
            ->values()
            ->all();
    }

    /**
     * @return Collection<int, MessageGroup>
     */
    private function classGroups(int $classId): Collection
    {
        return MessageGroup::where('type', 'class')->where('class_id', $classId)->get(['id', 'name']);
    }

    private function isMember(int $groupId, int $userId): bool
    {
        return GroupMember::where('group_id', $groupId)->where('user_id', $userId)->exists();
    }
}
