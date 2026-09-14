<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ClassModel;
use App\Models\Enrollment;
use App\Models\LibraryFolder;
use App\Models\Order;
use App\Models\Program;
use App\Models\ProgramLevel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Couvre LibraryFolder::scopeVisibleToStudent — la règle d'accès de la bibliothèque :
 * dossier publié + (public OU classe inscrite avec le niveau requis).
 */
class LibraryAccessTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    private ClassModel $class;

    private Program $program;

    protected function setUp(): void
    {
        parent::setUp();

        $teacher = User::factory()->create(['role' => 'teacher']);
        $this->program = Program::factory()->create(['created_by' => $teacher->id]);
        $this->class = ClassModel::factory()->create(['program_id' => $this->program->id]);
        $this->student = User::factory()->create(['role' => 'student']);

        $this->enroll($this->student, $this->class);
    }

    private function enroll(User $student, ClassModel $class, string $status = 'active'): Enrollment
    {
        return Enrollment::create([
            'student_id' => $student->id,
            'class_id' => $class->id,
            'status' => $status,
            'enrolled_at' => now(),
        ]);
    }

    private function level(int $number): ProgramLevel
    {
        return ProgramLevel::create([
            'program_id' => $this->program->id,
            'level_number' => $number,
            'name' => 'Niveau '.$number,
            'price' => 300,
            'max_installments' => 3,
        ]);
    }

    private function paidOrder(User $student, ClassModel $class, ProgramLevel $level, string $status = 'paid'): Order
    {
        return Order::factory()->create([
            'student_id' => $student->id,
            'program_id' => $this->program->id,
            'class_id' => $class->id,
            'level_number' => $level->level_number,
            'program_level_id' => $level->id,
            'status' => $status,
        ]);
    }

    /**
     * Crée un dossier publié ciblant une ou plusieurs paires classe/niveau.
     *
     * @param  array<int, array{class_id: int, level_number: int}>  $accesses
     */
    private function folderWith(array $accesses): LibraryFolder
    {
        $folder = LibraryFolder::factory()->published()->create();

        foreach ($accesses as $access) {
            $folder->accesses()->create($access);
        }

        return $folder;
    }

    private function visibleIdsFor(?User $student = null): array
    {
        return LibraryFolder::visibleToStudent(($student ?? $this->student)->id)->pluck('id')->all();
    }

    public function test_un_dossier_brouillon_est_invisible_pour_l_eleve(): void
    {
        $folder = LibraryFolder::factory()->create(); // draft par défaut
        $folder->accesses()->create(['class_id' => $this->class->id, 'level_number' => 1]);

        $this->assertNotContains($folder->id, $this->visibleIdsFor());
    }

    public function test_un_dossier_public_en_brouillon_reste_invisible(): void
    {
        $folder = LibraryFolder::factory()->public()->create(); // public MAIS draft

        $this->assertNotContains($folder->id, $this->visibleIdsFor());
    }

    public function test_un_dossier_public_est_visible_sans_condition_de_classe(): void
    {
        $folder = LibraryFolder::factory()->published()->public()->create();

        $this->assertContains($folder->id, $this->visibleIdsFor());
    }

    public function test_un_dossier_d_une_autre_classe_est_invisible(): void
    {
        $otherClass = ClassModel::factory()->create(['program_id' => $this->program->id]);
        $folder = $this->folderWith([['class_id' => $otherClass->id, 'level_number' => 1]]);

        $this->assertNotContains($folder->id, $this->visibleIdsFor());
    }

    /**
     * Non-fuite : la présence d'un AUTRE élève actif dans la classe ciblée ne doit
     * pas ouvrir l'accès. Sans le filtre enrollments.student_id, ce test échoue.
     */
    public function test_l_inscription_d_un_autre_eleve_n_ouvre_pas_l_acces(): void
    {
        $otherClass = ClassModel::factory()->create(['program_id' => $this->program->id]);
        $otherStudent = User::factory()->create(['role' => 'student']);
        $this->enroll($otherStudent, $otherClass);

        $folder = $this->folderWith([['class_id' => $otherClass->id, 'level_number' => 1]]);

        $this->assertContains($folder->id, $this->visibleIdsFor($otherStudent));
        $this->assertNotContains($folder->id, $this->visibleIdsFor());
    }

    /**
     * Le niveau de base est acquis dès l'inscription : aucune commande n'est exigée.
     * Ce cas couvre les élèves importés qui ont un Enrollment sans Order.
     */
    public function test_le_niveau_1_est_visible_sans_commande(): void
    {
        $folder = $this->folderWith([['class_id' => $this->class->id, 'level_number' => 1]]);

        $this->assertSame(0, Order::where('student_id', $this->student->id)->count());
        $this->assertContains($folder->id, $this->visibleIdsFor());
    }

    /**
     * Le niveau 1 est inclusif : un élève monté en niveau 2 garde l'accès au socle.
     */
    public function test_le_niveau_1_reste_visible_pour_un_eleve_monte_en_niveau_2(): void
    {
        $level2 = $this->level(2);
        $this->paidOrder($this->student, $this->class, $level2);

        $folder = $this->folderWith([['class_id' => $this->class->id, 'level_number' => 1]]);

        $this->assertContains($folder->id, $this->visibleIdsFor());
    }

    public function test_un_dossier_niveau_2_est_invisible_pour_un_eleve_niveau_1(): void
    {
        $level2 = $this->level(2);
        $folder = $this->folderWith([['class_id' => $this->class->id, 'level_number' => $level2->level_number]]);

        $this->assertNotContains($folder->id, $this->visibleIdsFor());
    }

    public function test_un_dossier_niveau_2_devient_visible_des_le_premier_versement(): void
    {
        $level2 = $this->level(2);
        $folder = $this->folderWith([['class_id' => $this->class->id, 'level_number' => $level2->level_number]]);

        // status 'partial' = paiement en plusieurs fois entamé : l'accès est ouvert
        $this->paidOrder($this->student, $this->class, $level2, 'partial');

        $this->assertContains($folder->id, $this->visibleIdsFor());
    }

    /**
     * Non-fuite : la commande niveau 2 d'un CAMARADE de la même classe ne doit pas
     * ouvrir l'accès. Sans le filtre orders.student_id, ce test échoue.
     */
    public function test_la_commande_niveau_2_d_un_camarade_n_ouvre_pas_l_acces(): void
    {
        $level2 = $this->level(2);
        $folder = $this->folderWith([['class_id' => $this->class->id, 'level_number' => $level2->level_number]]);

        $classmate = User::factory()->create(['role' => 'student']);
        $this->enroll($classmate, $this->class);
        $this->paidOrder($classmate, $this->class, $level2);

        $this->assertContains($folder->id, $this->visibleIdsFor($classmate));
        $this->assertNotContains($folder->id, $this->visibleIdsFor());
    }

    /**
     * La sous-requête sur orders est corrélée à la class_id de la ligne d'accès :
     * payer le niveau 2 ailleurs n'ouvre pas le niveau 2 ici.
     */
    public function test_une_commande_niveau_2_sur_une_autre_classe_n_ouvre_pas_l_acces(): void
    {
        $level2 = $this->level(2);
        $otherClass = ClassModel::factory()->create(['program_id' => $this->program->id]);

        $folder = $this->folderWith([['class_id' => $this->class->id, 'level_number' => $level2->level_number]]);
        $this->paidOrder($this->student, $otherClass, $level2);

        $this->assertNotContains($folder->id, $this->visibleIdsFor());
    }

    /**
     * Multi-classes : niveau 2 payé en classe A, niveau 1 seul en classe B.
     * Chaque dossier doit être jugé sur sa propre classe.
     */
    public function test_le_multi_classes_est_traite_classe_par_classe(): void
    {
        $level2 = $this->level(2);
        $classB = ClassModel::factory()->create(['program_id' => $this->program->id]);
        $this->enroll($this->student, $classB);
        $this->paidOrder($this->student, $this->class, $level2);

        $folderA2 = $this->folderWith([['class_id' => $this->class->id, 'level_number' => 2]]);
        $folderB2 = $this->folderWith([['class_id' => $classB->id, 'level_number' => 2]]);
        $folderB1 = $this->folderWith([['class_id' => $classB->id, 'level_number' => 1]]);

        $visible = $this->visibleIdsFor();

        $this->assertContains($folderA2->id, $visible);
        $this->assertNotContains($folderB2->id, $visible);
        $this->assertContains($folderB1->id, $visible);
    }

    /**
     * Plusieurs lignes d'accès sur un même dossier se comportent en OU : il suffit
     * qu'une seule corresponde.
     */
    public function test_plusieurs_lignes_d_acces_fonctionnent_en_ou(): void
    {
        $otherClass = ClassModel::factory()->create(['program_id' => $this->program->id]);

        $folder = $this->folderWith([
            ['class_id' => $otherClass->id, 'level_number' => 1],
            ['class_id' => $this->class->id, 'level_number' => 1],
        ]);

        $this->assertContains($folder->id, $this->visibleIdsFor());
        // Le dossier ne doit apparaître qu'une fois malgré ses deux lignes d'accès
        $this->assertSame(1, count(array_keys($this->visibleIdsFor(), $folder->id, true)));
    }

    public function test_une_inscription_annulee_ferme_l_acces(): void
    {
        Enrollment::where('student_id', $this->student->id)->update(['status' => 'cancelled']);
        $folder = $this->folderWith([['class_id' => $this->class->id, 'level_number' => 1]]);

        $this->assertNotContains($folder->id, $this->visibleIdsFor());
    }

    /**
     * Une promotion terminée ferme aussi l'accès : comportement aligné sur les
     * sessions et les supports, à connaître avant la première fin de promotion.
     */
    public function test_une_inscription_terminee_ferme_l_acces(): void
    {
        Enrollment::where('student_id', $this->student->id)->update(['status' => 'completed']);
        $folder = $this->folderWith([['class_id' => $this->class->id, 'level_number' => 1]]);

        $this->assertNotContains($folder->id, $this->visibleIdsFor());
    }

    public function test_le_scope_category_filtre_par_categorie(): void
    {
        $media = LibraryFolder::factory()->published()->public()->create();
        $resource = LibraryFolder::factory()->published()->public()->resource()->create();

        $ids = LibraryFolder::category(LibraryFolder::CATEGORY_MEDIA)->pluck('id')->all();

        $this->assertContains($media->id, $ids);
        $this->assertNotContains($resource->id, $ids);
    }
}
