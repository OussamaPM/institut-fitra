<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ClassModel;
use App\Models\Enrollment;
use App\Models\LibraryFolder;
use App\Models\LibraryItem;
use App\Models\Order;
use App\Models\Program;
use App\Models\ProgramLevel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Couvre l'espace élève de la bibliothèque : seuls les dossiers publiés et ciblant
 * une classe où l'élève est inscrit au bon niveau doivent être atteignables.
 */
class StudentLibraryTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    private ClassModel $class;

    private Program $program;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('spaces');

        $teacher = User::factory()->create(['role' => 'teacher']);
        $this->program = Program::factory()->create(['created_by' => $teacher->id]);
        $this->class = ClassModel::factory()->create(['program_id' => $this->program->id]);
        $this->student = User::factory()->create(['role' => 'student']);

        Enrollment::create([
            'student_id' => $this->student->id,
            'class_id' => $this->class->id,
            'status' => 'active',
            'enrolled_at' => now(),
        ]);
    }

    private function folderFor(int $levelNumber = 1, array $attributes = [], bool $withItem = true): LibraryFolder
    {
        $folder = LibraryFolder::factory()->published()->create($attributes);
        $folder->accesses()->create(['class_id' => $this->class->id, 'level_number' => $levelNumber]);

        // Un dossier vide est masqué côté élève : les fixtures en portent un par défaut
        if ($withItem) {
            LibraryItem::factory()->create(['library_folder_id' => $folder->id]);
        }

        return $folder;
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

    public function test_l_eleve_voit_les_dossiers_publies_de_sa_classe(): void
    {
        $folder = $this->folderFor();

        $this->actingAs($this->student)
            ->getJson('/api/student/library/folders?category=media')
            ->assertOk()
            ->assertJsonPath('folders.0.id', $folder->id)
            ->assertJsonPath('folders.0.title', $folder->title);
    }

    public function test_l_eleve_ne_voit_pas_les_brouillons(): void
    {
        $folder = LibraryFolder::factory()->create(); // draft
        $folder->accesses()->create(['class_id' => $this->class->id, 'level_number' => 1]);
        LibraryItem::factory()->create(['library_folder_id' => $folder->id]);

        $this->actingAs($this->student)
            ->getJson('/api/student/library/folders?category=media')
            ->assertOk()
            ->assertJsonCount(0, 'folders');
    }

    public function test_l_eleve_ne_voit_pas_un_dossier_d_un_niveau_non_paye(): void
    {
        $level2 = $this->level(2);
        $this->folderFor($level2->level_number);

        $this->actingAs($this->student)
            ->getJson('/api/student/library/folders?category=media')
            ->assertOk()
            ->assertJsonCount(0, 'folders');
    }

    public function test_le_dossier_apparait_des_que_le_niveau_est_paye(): void
    {
        $level2 = $this->level(2);
        $folder = $this->folderFor($level2->level_number);

        Order::factory()->create([
            'student_id' => $this->student->id,
            'program_id' => $this->program->id,
            'class_id' => $this->class->id,
            'level_number' => 2,
            'program_level_id' => $level2->id,
            'status' => 'partial',
        ]);

        $this->actingAs($this->student)
            ->getJson('/api/student/library/folders?category=media')
            ->assertOk()
            ->assertJsonPath('folders.0.id', $folder->id);
    }

    public function test_les_categories_sont_filtrees(): void
    {
        $media = $this->folderFor();
        $resource = $this->folderFor(1, ['category' => LibraryFolder::CATEGORY_RESOURCE]);

        $this->actingAs($this->student)
            ->getJson('/api/student/library/folders?category=resource')
            ->assertOk()
            ->assertJsonCount(1, 'folders')
            ->assertJsonPath('folders.0.id', $resource->id);

        $this->assertNotSame($media->id, $resource->id);
    }

    public function test_une_categorie_invalide_est_refusee(): void
    {
        $this->actingAs($this->student)
            ->getJson('/api/student/library/folders?category=autre')
            ->assertStatus(422)
            ->assertJsonValidationErrors('category');
    }

    public function test_l_eleve_consulte_les_contenus_d_un_dossier_autorise(): void
    {
        $folder = $this->folderFor(1, [], withItem: false);
        LibraryItem::factory()->create(['library_folder_id' => $folder->id, 'title' => 'Leçon 1']);

        $this->actingAs($this->student)
            ->getJson("/api/student/library/folders/{$folder->id}/items")
            ->assertOk()
            ->assertJsonPath('items.data.0.title', 'Leçon 1')
            ->assertJsonPath('folder.title', $folder->title);
    }

    /**
     * Un dossier interdit répond comme un dossier inexistant : distinguer les deux
     * permettrait d'énumérer la bibliothèque.
     */
    public function test_un_dossier_interdit_repond_comme_un_dossier_inexistant(): void
    {
        $otherClass = ClassModel::factory()->create(['program_id' => $this->program->id]);
        $folder = LibraryFolder::factory()->published()->create();
        $folder->accesses()->create(['class_id' => $otherClass->id, 'level_number' => 1]);

        LibraryItem::factory()->create(['library_folder_id' => $folder->id]);

        $interdit = $this->actingAs($this->student)
            ->getJson("/api/student/library/folders/{$folder->id}/items")
            ->assertNotFound();

        $inexistant = $this->actingAs($this->student)
            ->getJson('/api/student/library/folders/999999/items')
            ->assertNotFound();

        // Les deux réponses doivent être indiscernables, sinon l'élève peut
        // cartographier la bibliothèque en balayant les identifiants.
        $this->assertSame($inexistant->json(), $interdit->json());
    }

    public function test_un_dossier_publie_mais_vide_est_masque(): void
    {
        $this->folderFor(1, [], withItem: false);

        $this->actingAs($this->student)
            ->getJson('/api/student/library/folders?category=media')
            ->assertOk()
            ->assertJsonCount(0, 'folders');
    }

    /**
     * Les règles d'accès nomment d'autres classes et d'autres niveaux que ceux de
     * l'élève : elles ne doivent jamais partir dans sa réponse.
     */
    public function test_les_regles_d_acces_ne_sont_jamais_exposees(): void
    {
        $this->folderFor();

        $folder = $this->actingAs($this->student)
            ->getJson('/api/student/library/folders?category=media')
            ->assertOk()
            ->json('folders.0');

        $this->assertArrayNotHasKey('accesses', $folder);
        $this->assertArrayNotHasKey('created_by', $folder);
        $this->assertArrayHasKey('items_count', $folder);
    }

    /**
     * Le lien du lecteur doit rester exposé : c'est lui qui fait fonctionner la
     * lecture côté élève. Un masquage trop large casserait la fonctionnalité en silence.
     */
    public function test_le_lien_du_lecteur_reste_expose(): void
    {
        $folder = $this->folderFor();

        $this->actingAs($this->student)
            ->getJson("/api/student/library/folders/{$folder->id}/items")
            ->assertOk()
            ->assertJsonPath('items.data.0.embed_url', $folder->items()->first()->embed_url);
    }

    public function test_la_pagination_des_contenus_fonctionne(): void
    {
        $folder = $this->folderFor(1, [], withItem: false);

        for ($i = 1; $i <= 14; $i++) {
            LibraryItem::factory()->atPosition($i)->create([
                'library_folder_id' => $folder->id,
                'title' => 'Contenu '.$i,
            ]);
        }

        $this->actingAs($this->student)
            ->getJson("/api/student/library/folders/{$folder->id}/items")
            ->assertOk()
            ->assertJsonCount(12, 'items.data')
            ->assertJsonPath('items.data.0.title', 'Contenu 1');

        $this->actingAs($this->student)
            ->getJson("/api/student/library/folders/{$folder->id}/items?page=2")
            ->assertOk()
            ->assertJsonCount(2, 'items.data');
    }

    public function test_un_per_page_invalide_est_refuse(): void
    {
        $folder = $this->folderFor();

        $this->actingAs($this->student)
            ->getJson("/api/student/library/folders/{$folder->id}/items?per_page=-1")
            ->assertStatus(422)
            ->assertJsonValidationErrors('per_page');
    }

    public function test_les_contenus_exigent_une_authentification(): void
    {
        $folder = $this->folderFor();

        $this->getJson("/api/student/library/folders/{$folder->id}/items")->assertUnauthorized();
    }

    /**
     * Le chemin du fichier ne doit jamais sortir : combiné au CDN, il
     * court-circuiterait le contrôle d'accès du téléchargement.
     */
    public function test_le_chemin_du_fichier_n_est_jamais_expose(): void
    {
        $folder = $this->folderFor(1, ['category' => LibraryFolder::CATEGORY_RESOURCE], withItem: false);
        LibraryItem::factory()->document()->create(['library_folder_id' => $folder->id]);

        $response = $this->actingAs($this->student)
            ->getJson("/api/student/library/folders/{$folder->id}/items")
            ->assertOk()
            ->assertJsonMissingPath('items.data.0.file_path');

        // Le nom d'origine, lui, reste utile à l'affichage
        $this->assertNotNull($response->json('items.data.0.original_name'));
    }

    public function test_un_visiteur_non_authentifie_est_rejete(): void
    {
        $this->getJson('/api/student/library/folders?category=media')->assertUnauthorized();
    }

    /**
     * Une commande d'un camarade ne doit pas ouvrir l'accès : le scope est corrélé
     * à l'élève ET à la classe de la ligne d'accès.
     */
    public function test_la_commande_d_un_camarade_n_ouvre_pas_l_acces(): void
    {
        $level2 = $this->level(2);
        $folder = $this->folderFor($level2->level_number);

        $classmate = User::factory()->create(['role' => 'student']);
        Enrollment::create([
            'student_id' => $classmate->id,
            'class_id' => $this->class->id,
            'status' => 'active',
            'enrolled_at' => now(),
        ]);
        Order::factory()->create([
            'student_id' => $classmate->id,
            'program_id' => $this->program->id,
            'class_id' => $this->class->id,
            'level_number' => 2,
            'program_level_id' => $level2->id,
            'status' => 'paid',
        ]);

        $this->actingAs($classmate)
            ->getJson('/api/student/library/folders?category=media')
            ->assertOk()
            ->assertJsonPath('folders.0.id', $folder->id);

        $this->actingAs($this->student)
            ->getJson('/api/student/library/folders?category=media')
            ->assertOk()
            ->assertJsonCount(0, 'folders');
    }
}
